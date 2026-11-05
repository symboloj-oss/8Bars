# 8Bars 技术文档

> 面向贡献者与协作者的系统级说明。架构决策与路线图映射见 [architecture.md](./architecture.md)。

## 1. 系统架构

```
浏览器客户端                                Vercel 边缘
┌─────────────────────────────────┐        ┌──────────────────────┐
│ Next.js App Router              │        │ Next.js RSC 服务端    │
│  HomeApp / RoomView             │        │  app/room/[id]        │
│  ├─ StudioWorkspace(工作区)    │        │  · SEO 元数据预取      │
│  ├─ audioEngine(Tone.js 单例)  │        │  · 房间存在性校验 404  │
│  ├─ MediaRecorder(录音)        │        └──────────┬───────────┘
│  └─ lib/api(Supabase 数据层)   │                   │ anon key 公开读
└───────────────┬─────────────────┘                   │
                │ supabase-js(浏览器直连)              │
        ┌───────┴────────┐                    ┌───────┴────────┐
        ▼                ▼                    ▼                ▼
┌──────────────┐  ┌───────────────┐   ┌──────────────┐  ┌───────────────┐
│ Postgres     │  │ Storage       │   │ Postgres     │  │ Auth          │
│ rooms/slots/ │  │ takes/        │   │ (同左)       │  │ Anonymous     │
│ takes/likes  │  │ template-     │   │              │  │ Sign-Ins      │
│ + RLS        │  │ assets/       │   │              │  │ (设备级 uid)  │
└──────────────┘  └───────────────┘   └──────────────┘  └───────────────┘
```

核心原则:**不设 API 层**。读操作全部公开,写操作全部发生在已认证(匿名)客户端,RLS 行级安全即服务端安全边界。此设计的收益:零中间层、前端直连毫秒级延迟、免费额度内无服务端成本;代价:复杂写逻辑(如点赞计数)必须下沉为数据库函数(`toggle_like` RPC)。

## 2. 数据模型

```
rooms: id(uuid PK) · title · template_id · bpm(权威值) · progression[8]
       creator_uid → auth.users · creator_name/avatar · genre · contact_info
       recruitment_call · tags[] · likes_count(RPC 维护) · is_seed · created_at
slots: id PK · room_id FK(cascade) · slot_type(四选一 check) · volume
       is_muted · is_solo · latency_offset_ms · unique(room_id, slot_type)
takes: id PK · slot_id FK(cascade) · musician_uid → auth.users(set null)
       musician_name/avatar · is_ai · audio_path(null=占位元数据) · latency_offset_ms
likes: (room_id, user_uid) 联合主键去重
```

设计要点:

- **AI take 不落库**:程序化合成是客户端行为,仅真人 take 写入;`audio_path IS NULL` 表示种子房间的展示性占位。
- **humanSlotsCount / vacantRoles 读时派生**:由 takes 分组现算,避免双写不一致。
- **likes_count 经 `toggle_like()` RPC 维护**(SECURITY DEFINER):普通 UPDATE 权限意味着任何匿名用户可篡改计数,收敛到函数是唯一安全写法。
- **活跃 take 不持久化**:每个席位取最新真人 take;多 Take 切换是访客会话内行为。
- 迁移文件(`supabase/migrations/`)确定性 UUID + `on conflict do nothing`,可安全重放。

## 3. RLS 安全矩阵

| 对象 | 读 | 写 |
|---|---|---|
| rooms | 公开 | insert/update 仅 creator_uid 本人 |
| slots | 公开 | insert 仅本人房间;update/delete 不开放 |
| takes | 公开 | insert 任意登录用户(产品核心:任何访客可认领席位);update/delete 仅本人 |
| likes | 公开 | 仅经 `toggle_like` RPC |
| storage: takes | 公开 | insert:已登录且路径首级为真实房间 id;delete:仅 owner |
| storage: template-assets | 公开 | 仅项目主理人经后台管理 |

已知取舍(上线后收紧):匿名用户可无限点赞、可刷房间数;上传成功但 insert 失败的孤儿文件靠 5MB 单文件上限兜底。

## 4. 音频引擎(audioEngine 单例)

### 4.1 席位音频解析(三级回退)

```
播放 slot X:
  1. 最新真人 take 且有 audio_path → 下载解码 → 按 latencyOffsetMs 对齐循环
  2. 无真人 take,模板预置切片存在(templateAssets.ts 登记) → 播放预置 Loop
  3. 均无 → Tone.js 程序化合成(鼓/贝斯/和弦/旋律,按模板走向)
```

### 4.2 调度与重排

- 8 小节循环:`Tone.Transport` loop 0~8:0:0,全部声部以 `Transport.schedule` 绝对时间排程。
- 重排必须 `Transport.cancel(0)` 整线清空(逐条 `clear(id)` 不会复位内部 StateTimeline,从 0 重排会触发断言崩溃);重排前先 `stop()` + 归零位置。
- 初始化并发安全:所有调用共享同一 `initPromise`;内容未变(模板 id / bpm / 席位混音状态全等)时跳过重排,规避 StrictMode 双调用。
- **禁止 await 引擎初始化再渲染 UI**:无用户手势时 `Tone.start()` 挂起(浏览器自动播放策略),会把页面锁死在加载态。

### 4.3 录音与延迟对齐

1. 4 拍倒计时(节拍器音)→ 第 0 拍起录,录满 8 小节自动刹车
2. 试听阶段滑杆 -200~+50ms 微调;负偏移 = 从 `|offset|` 处起播(剪掉设备录入延迟),正偏移 = 延后起播
3. 保存:storage 先传(`{roomId}/{uuid}.webm`)→ takes 后插

### 4.4 离线导出(exportMixdownWav)

`Tone.Offline` 在离线上下文中重建 AI 声部;真人 take 从 `customAudioArrayBuffers` 副本在 OfflineContext 内**重新解码**后以 buffer source 混入。两个关键细节:

- `decodeAudioData` 会转移(detach)传入 ArrayBuffer 的所有权——副本必须在解码**之前**保存;
- 活上下文的 AudioBuffer 不能跨上下文复用(采样率不一致时行为未定义)。

## 5. 关键流程时序

### 5.1 创建房间

```
CreateRoomModal → createRoom(匿名登录) → rooms insert → slots ×4 insert
→ 返回真实 uuid → router.push('/room/{id}')   (失败回退本地沙盒)
```

### 5.2 录制并发布

```
StudioRecordingModal(5 阶段状态机) → blob
→ storage.upload('takes/{roomId}/{uuid}.webm')
→ takes insert(musician_uid = 匿名 uid) → 本地乐观更新 → 4 席全真人撒花
发布 = rooms.update(招募信息),房间行在创建时已存在
```

### 5.3 访客进入分享房间

```
app/room/[id]/page.tsx(RSC): 服务端预取标题 → generateMetadata → 不存在 404
RoomView(客户端): getRoomBundle(room+slots+takes 三次批量查询,无 N+1)
→ roomToRoomState(行 → 前端模型) → 立即渲染 UI
→ 后台:引擎接管(bpm 以房间行为准) → 真人 take 并行下载解码 → 模板切片兜底
```

## 6. 客户端 / 服务端边界

- `app/` 仅路由与元数据,不 import 音频引擎;`app/room/[id]` 服务端只做公开读。
- 全部交互组件 `"use client"`;`translations.ts`、`ChordFretboard`、`PianoChordView` 保持纯组件。
- hydration 纪律:首帧渲染确定值(主题 `light`、语言 `zh-CN`、默认房间),真实值在挂载后从 localStorage 水合;`<html suppressHydrationWarning>` + 预绘主题脚本防闪烁。

## 7. 成本模型(免费额度内)

| 资源 | 预算 | 量级 |
|---|---|---|
| Supabase 数据库 | 500MB | 8 小节 webm 录音 ~150-800KB,1GB 存储 ≈ 7000 条音轨 |
| Supabase Storage | 1GB | 单文件 5MB 上限;模板切片桶 10MB 上限 |
| Vercel | Hobby 免费 | 静态资源 CDN;月带宽限额内无忧 |

## 8. 测试与诊断

| 脚本 | 用途 |
|---|---|
| `scripts/debug-headless.mjs [URL]` | 无头 Chrome 功能回归:按钮事件/广场数据/房间页渲染/JS 报错 |
| `scripts/mobile-check.mjs [URL]` | iPhone 390px 视口:横向溢出检测 + 截图 |
| `scripts/test-export.mjs` | WAV 导出回归:注入正弦 take 对比 RMS,验证真人混音 |

浏览器调试钩子:`window.__audioEngine` 可访问引擎内部状态。

## 9. 环境变量

| 变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 可公开(RLS 是边界) |
| `NEXT_PUBLIC_SITE_URL` | 站点域名(预留) |
| `SUPABASE_DB_PASSWORD` | 本地推送迁移用(仅开发机) |
