# 8Bars 技术流程

本文描述当前代码路径，产品范围与验收状态见[产品定义与 MVP 路线图](./PRODUCT_MVP.md)。

## 1. 创建与进入房间

### 创建

```text
HomeApp → CreateRoomModal → createRoom()
→ ensureAnonymousUser()
→ create_room_with_slots RPC
→ rooms + 四种 slot 事务写入
→ router.push('/room/{uuid}')
```

模板列表由 `useTemplates()` 从 Supabase `templates` 表读取。模板资源是房间的音乐起点；房间创建仍使用当前数据模型支持的四种声部。

### 分享与进入

```text
BandShareCardModal → 复制 /room/{uuid}
→ app/room/[id]/page.tsx 服务端校验房间存在并生成 Metadata
→ RoomView 客户端查询 rooms / slots / takes
→ roomToRoomState() 映射数据并渲染页面
```

首次查询由 `getRoomBundle()` 按房间、席位、Take 分批读取。页面先显示房间数据，再在浏览器允许时初始化音频；不要在页面初始渲染前等待 Tone.js 解锁。

## 2. 录音与保存

`StudioRecordingModal` 使用 MediaRecorder，流程为耳机提醒、准备、倒数、录制、试听。录制按模板 BPM 完成 8 小节；试听时可调整延迟偏移。

保存路径：

```text
录音 Blob
→ ensureAnonymousUser()
→ 上传到 takes/{roomId}/{uuid}.webm
→ 插入 takes 记录
→ 若席位没有活跃 Take，尝试原子设置 active_take_id
→ 更新本地房间并通知其他客户端刷新
```

如果 `takes` 插入失败，代码会尝试删除刚上传的对象。录音上传失败时不能把只存在当前设备内存中的 Blob 当成已同步保存；用户界面必须明确区分保存成功和失败，并允许用户重试。

## 3. Take 选择和并发

- `takes` 保留同一席位的多个录音版本。
- 首次有效录音通过 `activateTakeIfEmpty()` 条件更新，避免并发上传覆盖已经选定的版本。
- 用户切换版本时，`setActiveTake()` 更新 `slots.active_take_id`。
- 映射层优先使用 `active_take_id` 指定的有效录音；旧 schema 缺少该列时才回退到最新有效 Take。
- 房间刷新后应由数据库活跃版本恢复播放，而不是只依赖当前页面内存状态。

## 4. Realtime 同步

`RoomView` 针对当前房间的 `takes` INSERT 和 `slots` UPDATE 注册 Supabase Realtime 监听。事件经短暂合并后重新获取房间、席位和 Take，比较活跃 Take 变化并更新本地状态及音频引擎。客户端实时同步依赖远端迁移已将相关表加入 `supabase_realtime` publication。

验收至少覆盖两个匿名会话：一端新增 Take，另一端能看到；一端切换当前版本，另一端能播放新版本；刷新后两端仍保持一致。

## 5. 音频引擎

### 程序化伴奏

`createTemplateScorePlan()` 根据模板的和弦进行和节奏参数生成鼓、贝斯、和弦事件。默认旋律事件为空。真人 Take 活跃时，该声部不再播放程序化伴奏。

### 浏览器兼容

弦乐 `PluckSynth` 使用 AudioWorklet。`audioEngine` 只在安全上下文且浏览器暴露 `AudioWorkletNode` 时创建该音色；否则和弦声部使用 PolySynth。局域网 HTTP 访问可能触发该回退。首次在目标浏览器验证时需要分别确认页面初始化、伴奏播放、麦克风录制和导出。

### 录音播放与导出

实时播放保存音频的 ArrayBuffer 副本和解码后的 AudioBuffer。WAV 离线导出时，在 OfflineAudioContext 中重新解码原始数据并混入同一合奏。两个上下文之间不能直接复用 AudioBuffer。

## 6. 数据权限边界

- Supabase 查询/写入集中在 `src/lib/api/`。
- 客户端使用 anon key，不把它当作授权机制；所有数据写权限由数据库 RLS、函数权限和 Storage 策略控制。
- 匿名用户在写操作前由 `ensureAnonymousUser()` 获取 Auth session。
- 活跃 Take 迁移文件为 `20261109000001_multi_take_versions.sql`。本地文件存在不代表目标 Supabase 项目已应用，部署前需要核验迁移状态。

## 7. 本地检查

```bash
npm run dev
npm run lint
npm run build
```

仓库中的浏览器诊断脚本：

- `scripts/debug-headless.mjs`：页面与 JavaScript 错误检查
- `scripts/mobile-check.mjs`：移动视口布局诊断
- `scripts/test-export.mjs`：WAV 导出检查

这些脚本需要可访问的 Supabase 环境和可运行的浏览器。它们通过不等于真实用户访谈；当前 MVP 仍需在两个独立设备或浏览器中做完整人工验收。
