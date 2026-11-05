# 8Bars 架构设计(目标蓝图 v0.1)

> 本文件是迁移的目标架构蓝图。标注 ✅ 的部分已落地,其余按阶段推进。
> 决策依据:PRD v1.0(全栈 Next.js + Serverless + BaaS,零运维零成本,匿名免登)。

## 1. 总体架构

```
┌──────────────────────────────────────────────────────────────┐
│                      Vercel (自动部署/CDN)                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                Next.js 16 App Router (全栈)             │  │
│  │   RSC 层: app/ 路由、SEO 元数据、房间页服务端预取        │  │
│  │   客户端层: 录音棚 UI、Tone.js 音频引擎、MediaRecorder   │  │
│  └───────────────┬────────────────────────────────────────┘  │
└──────────────────┼───────────────────────────────────────────┘
                   │ supabase-js (浏览器直连 + RLS 为安全边界)
        ┌──────────┴──────────┐
        ▼                     ▼
┌───────────────┐    ┌──────────────────┐
│ Supabase      │    │ Supabase Storage │
│ Postgres      │    │ (S3 兼容对象存储) │
│ rooms/slots/  │    │ takes/ 用户录音   │
│ takes/likes   │    │ template-assets/ │
│ + 匿名 Auth   │    │ 预置音频切片     │
└───────────────┘    └──────────────────┘
```

核心原则:

1. **不写 API 层**(首版):所有读都是公开数据、所有写都发生在已认证客户端,RLS(Row Level Security)就是安全边界。加 API 层只会多一跳。未来需要限流/转码/服务端混音时再引入 Route Handlers。
2. **房间即数据库行**:创建房间立即入库拿到 UUID,分享链接就是 `/room/{uuid}`,不存在"本地草稿 vs 云端房间"两套概念。
3. **音频三级回退**:播放某席位时按「真人 Take → 模板预置音频切片 → AI 合成」解析,保证任何时候进房间听到的都是完整乐队(PRD 冷启动机制)。

## 2. 技术选型(PRD 锁定,不做备选)

| 层 | 技术 | 备注 |
|---|---|---|
| 全栈框架 | Next.js 16(App Router, TypeScript) | ✅ 已迁移 |
| 音频引擎 | Tone.js 15 | ✅ 现有 `audioEngine` 单例 |
| 样式 | Tailwind CSS 4 | ✅ 已接 `@tailwindcss/postcss` |
| 数据库 | Supabase Postgres(免费 500MB) | 阶段 1 |
| 音频存储 | Supabase Storage(免费 1GB) | 阶段 1 |
| 认证 | Supabase Anonymous Sign-Ins(设备级 uid) | 阶段 2 |
| 部署 | Vercel(GitHub 自动部署,免费 HTTPS) | 阶段 5 |

## 3. 目录结构与分层(目标状态)

```
app/                          # Next.js 路由层(唯一 RSC 边界)
├── layout.tsx                # ✅ 根布局:字体/主题预绘脚本/SEO 元数据
├── page.tsx                  # ✅ 首页:渲染 <HomeApp/>
├── globals.css               # ✅ Tailwind 4 入口
└── room/[id]/
    ├── page.tsx              # 阶段3:RSC 预取房间元数据 + generateMetadata
    └── loading.tsx           # 阶段3:骨架屏

src/
├── views/                    # 页面级客户端容器(整页交互逻辑)
│   ├── HomeApp.tsx           # ✅ 首页双 Tab 状态中枢(迁移自 App.tsx)
│   └── RoomView.tsx          # 阶段3:/room/[id] 的房间加载与播放容器
├── components/               # 可复用 UI 组件(纯展示 or 客户端交互)
├── services/audioEngine.ts   # ✅ 音频引擎单例(Tone.js 唯一出入口)
├── lib/                      # 数据访问层(新)
│   ├── supabase/client.ts    # 阶段2:浏览器端 Supabase 单例
│   ├── supabase/server.ts    # 阶段3:RSC 服务端只读客户端
│   ├── supabase/auth.ts      # 阶段2:ensureAnonymousUser()
│   └── api/
│       ├── rooms.ts          # 阶段2:createRoom/listPublishedRooms/saveTake/toggleLikeRoom
│       └── mappers.ts        # 阶段2:DB 行 → RoomState/CommunityRoom + 派生字段
├── data/                     # 静态数据(纯前端,不进 DB)
│   ├── templates.ts          # 4 套曲风模板
│   ├── chords.ts             # 和弦库(指法/琴键/文案)
│   ├── characters.ts         # 4 个吉祥物角色
│   └── templateAssets.ts     # 阶段3:模板预置音频清单(templateId+席位 → 存储路径)
├── hooks/  types/  i18n/     # ✅ 现有,保持不变
docs/architecture.md          # 本文件
supabase/migrations/          # 阶段1:SQL 迁移(幂等,可重复执行)
```

分层约束(写代码时遵守):

- `app/` 内只放路由、元数据、服务端预取;**不直接 import audioEngine**。
- `views/` 与 `components/` 是客户端交互层,`"use client"`。
- 所有 Supabase 读写必须经 `lib/api/`,组件不直接碰 supabase-js(便于未来换 API 层)。
- `services/audioEngine.ts` 不感知数据来源——它只管"给我模板+slots 我就响"。

## 4. 路由设计

| 路由 | 类型 | 职责 |
|---|---|---|
| `/` | RSC shell + 客户端主体 | 双 Tab:录音棚(本地当前房间)+ 乐队广场(拉取已发布房间) |
| `/room/[id]` | RSC 预取 + 客户端接管 | 分享直达页:服务端查元数据做 SEO → 客户端加载 4 席位音频 |

## 5. 数据模型(Supabase Postgres)

```
rooms                            slots                           takes
├── id uuid PK (gen_random_uuid) ├── id uuid PK                  ├── id uuid PK
├── title text                   ├── room_id FK → rooms (cascade)├── slot_id FK → slots (cascade)
├── template_id text             ├── slot_type: 四选一 check      ├── musician_uid FK → auth.users
├── bpm smallint  ← 权威值       ├── volume / is_muted / is_solo  ├── musician_name / musician_avatar
├── progression text[] (8项)     └── latency_offset_ms            ├── is_ai bool
├── creator_uid FK → auth.users      (每房固定 4 行,unique 约束)  ├── audio_path text (storage 路径)
├── creator_name/avatar/contact_info/recruitment_call/tags        ├── latency_offset_ms
├── likes_count int (RPC 维护)                                    └── created_at
└── is_seed / created_at
                          likes (room_id, user_uid) 联合主键去重
```

设计决策:

- **AI take 不落库**:AI 合成是代码行为,只有真人 take 才 insert;`audio_path IS NULL` = 种子房的"占位元数据"。
- **humanSlotsCount / vacantRoles 不存列**:读时由 takes 分组派生(4 席位规模,存列有双写不一致风险)。
- **likes_count 存列 + likes 去重表 + `toggle_like()` RPC**(SECURITY DEFINER):普通 UPDATE 权限会让任何匿名用户改计数,收敛到 RPC 是唯一安全写法。
- **当前活跃 take 不持久化**:每个 slot 取最新真人 take;多 Take 切换是访客会话内行为(与现状一致)。

## 6. 音频架构

### 6.1 席位音频解析(三级回退)

```
播放 slot X:
  1. 该 slot 最新真人 take 且有 audio_path  → 下载解码,循环播放(带 latencyOffsetMs 对齐)
  2. 无真人 take,模板预置音频切片存在(templateAssets.ts 声明 + template-assets 桶) → 播放预置音频
  3. 都没有 → audioEngine 程序化合成(现有 AI 伴奏逻辑,零依赖保底)
```

`template-assets` bucket:`{templateId}/{slotType}.{webm|mp3}`,公开读。用户录制的 `drum.mp3`/`bass.mp3` 等素材上传到该桶并在 `templateAssets.ts` 登记后自动生效,无需发版。

### 6.2 录音与上传

```
录音棚(现有 5 阶段状态机,UI 不变)
  → MediaRecorder 录满 8 小节自动停
  → 试听 + 延迟对齐(现有 -200~+50ms 滑杆)
  → 保存:blob → storage.upload('takes/{roomId}/{uuid}.webm')
  → takes insert(audio_path) → 刷新席位
```

### 6.3 导出 WAV(阶段 4 修复)

`Tone.Offline` 离线渲染时必须混入真人 take:引擎并行存一份 `customAudioArrayBuffers`,在 OfflineContext 内重新 decode 后以 buffer source 混音(不能跨上下文复用 AudioBuffer)。

## 7. 认证与安全(RLS 矩阵)

- 认证:Anonymous Sign-Ins,`ensureAnonymousUser()` 在首次写操作前静默登录,session 持久化在 localStorage → 设备级稳定 uid。
- 策略:

| 表 | 读 | 写 |
|---|---|---|
| rooms | 公开 | 仅 creator_uid 本人(insert/update) |
| slots | 公开 | 仅房主所在房间(insert) |
| takes | 公开 | 仅 musician_uid 本人(insert/update/delete) |
| likes | 公开 | 仅经 `toggle_like` RPC(去重 + 计数) |
| storage.objects | takes/template-assets 公开读 | takes:已登录且目标房间存在;delete 仅 owner |

已知取舍(上线后再收紧):匿名用户可无限点赞(无频率限制)、可刷房间(无配额);孤儿上传文件(上传成功但 insert 失败)靠 5MB 单文件上限兜底。

## 8. 环境变量与部署

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # 可公开,RLS 才是边界
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

部署前检查清单:Supabase 开 Anonymous Sign-Ins → 跑 migrations → 建 takes/template-assets 桶(public, 5MB, MIME 含 audio/mp4 以支持 iOS Safari)→ Vercel 导入仓库(npm)→ 填环境变量。

## 9. 实施阶段与状态

| 阶段 | 内容 | 状态 |
|---|---|---|
| 0 | Vite → Next.js 脚手架迁移 | ✅ 完成(构建/类型检查/页面渲染全通过) |
| 1 | Supabase 迁移 SQL + RLS + Storage + 种子数据 | 待开始 |
| 2 | 客户端数据层 + 首页/广场接入 Supabase | 待开始 |
| 3 | /room/[id] 路由 + 录音上传 + 远端播放 + 三级回退 | 待开始 |
| 4 | 导出 WAV 混入真人 Take | 待开始 |
| 5 | Vercel 部署与全量验收 | 待开始 |

## 10. 与产品路线图的关系(参考,不严格绑定)

路线图四阶段与本架构的对应关系,当前架构刻意为此预留了扩展点:

- **v0.1 技术刺针**:现有应用已经实现(录音 + 延迟补偿 + 多轨合并 + 回放),唯一待办是**移动端实机验证**(iOS Safari / 安卓)。架构上无新增工作。
- **v1.0 MVP 公测**:= 本文档阶段 1-5。路线图提到"预设 5 套模板",当前代码 4 套——第 5 套只是往 `src/data/templates.ts` 加一条数据 + 一个预置音频目录,零架构改动。注意音频体积目标:单条 8 小节 take 控制在 ~150KB(webm/opus),1GB 免费额度 ≈ 7000 条音轨,据此 5MB 单文件上限已足够宽裕。
- **v1.5 裂变期**:
  - 虚拟乐队舞台(Canvas 动画)→ 新增一个客户端组件,插在 `RoomView` 内,不动数据层;
  - 导出 15 秒短视频(9:16)→ `MediaRecorder` 捕获 canvas + 现有 WAV 导出复用同一混音链路,客户端完成,无后端;
  - 动态通知 → Supabase Realtime(Postgres 变更订阅),RLS 已就绪,后续接 Web 推送即可;
  - "拍手校准"设备延迟向导 → 在 `StudioRecordingModal` 录音前插入一步,结果存 localStorage 并入 `latencyOffsetMs` 计算。
- **v2.0 商业化**:付费模版包 = `template-assets` 桶加私有目录 + 订阅状态表(`profiles` 或单独 `subscriptions` 表,彼时匿名 uid 升级为正式账号时顺带迁移);音色包 = `audioEngine` 增加效果器节点(Tone.js 自带 Reverb/Distortion),纯客户端。

**结论:当前架构无需为远期阶段做任何"提前设计",但所有扩展点都已指认清楚,演进不会推翻任何现有分层。**
