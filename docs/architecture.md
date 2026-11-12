# 8Bars 当前架构

本文记录仓库当前的主要架构和已知边界。产品目标与 MVP 验收标准以[产品定义与 MVP 路线图](./PRODUCT_MVP.md)为准。代码存在不等于线上环境或真实用户流程已经验收。

## 1. 系统概览

```text
浏览器
├── Next.js 客户端页面：HomeApp / RoomView
├── StudioRecordingModal：MediaRecorder 录音与试听
├── audioEngine：Tone.js 播放、节奏调度、程序化伴奏和 WAV 离线渲染
└── lib/api：浏览器 Supabase 客户端、匿名身份、数据映射
             │
             ├── Supabase Postgres：rooms / slots / takes / templates / likes
             ├── Supabase Storage：takes / template-assets
             └── Supabase Auth：匿名登录

Next.js 服务端
└── /room/[id]：房间存在性检查、动态 Metadata 与社交分享预览
```

当前业务读写主要由浏览器直接调用 Supabase，数据库 RLS 是访问控制边界。房间创建使用 `create_room_with_slots` 数据库 RPC，以事务写入房间及席位。

## 2. 路由与代码边界

| 路由/模块 | 当前职责 |
|---|---|
| `/` (`app/page.tsx`) | 首页容器，创建房间并展示已发布房间 |
| `/room/[id]` | 服务端检查房间并生成 Metadata，客户端 `RoomView` 加载房间内容 |
| `src/lib/api/` | Supabase 查询、写入、匿名登录及数据库行映射 |
| `src/services/audioEngine.ts` | Tone.js 音频初始化、播放调度、录音试听和 WAV 导出 |
| `src/data/templateArrangements.ts` | 从模板参数生成程序化节奏、贝斯与和弦事件 |
| `src/data/templateAssets.ts` | 可选的模板音频 URL 清单；当前登记表为空 |

组件通过 `lib/api/` 访问业务数据；页面级浏览器交互放在 `views/` 与 `components/`。

## 3. 数据模型与当前限制

| 表 | 主要用途 |
|---|---|
| `rooms` | 房间元数据、模板 ID、BPM、和弦进行、创建者和发布状态 |
| `slots` | 房间中的声部及混音参数，`active_take_id` 指向当前播放 Take |
| `takes` | 每次真人录音及其存储路径、参与者信息和延迟偏移 |
| `templates` | 房间创建时可选的音乐起点 |
| `likes` | 广场点赞去重记录 |

现有数据库和前端模型使用四种固定声部：`drums`、`bass`、`chords`、`melody`，每种声部每个房间至多一行。一个声部可以有多个真人 Take；活跃 Take 由 `slots.active_take_id` 持久化。这个四声部结构是当前实现事实，不代表产品永远只能使用当前模板或人数。

`20261109000001_multi_take_versions.sql` 增加活跃 Take 外键、切换权限以及 `takes`/`slots` 的 Realtime publication。部署环境是否已应用全部迁移，需要与 Supabase 实际状态核对。

## 4. 房间与协作数据流

1. 首页加载 Supabase 模板列表。
2. 创建房间时，客户端匿名登录，再调用 `create_room_with_slots`。
3. 房间以 UUID 作为 `/room/{id}` 分享地址。
4. 录音上传到 `takes` Storage bucket，再插入 `takes` 记录。
5. 首条有效录音尝试成为活跃 Take；后续 Take 可以由协作者明确选择。
6. `RoomView` 订阅 Take 新增和席位活跃版本更新，再重新加载房间数据。

席位录音向所有可访问房间的匿名登录用户开放；房间和音频公开读取，写入行为受 RLS 和数据库列权限限制。具体策略以迁移 SQL 为准。

## 5. 音频行为

- 模板编曲目前通过代码生成鼓、贝斯和和弦伴奏事件。
- 默认没有程序化主旋律；旋律声部留给参与者录制。
- 有当前真人 Take 时播放该 Take 并跳过该声部的程序化伴奏。
- 无真人 Take 时，鼓、贝斯、和弦使用程序化伴奏；如果未来在 `templateAssets.ts` 登记音频，可由预置切片替代对应伴奏声部。
- 目前 `templateAssets.ts` 没有登记有效资源，因此不能把模板音频切片写成已启用的当前回退能力。
- `PluckSynth` 依赖 AudioWorklet。浏览器处于非安全上下文或缺少该 API 时，代码跳过拨弦音色，使用 PolySynth 播放和弦。麦克风和音频行为仍需在目标浏览器实测。
- 真人录音的延迟偏移以毫秒存储；导出 WAV 时，在离线上下文重新解码录音后混音。

## 6. 身份、存储与安全

- 写操作通过 Supabase Anonymous Auth 获得稳定的匿名用户 ID；用户不需要自行填写账号注册表单。
- `rooms` 创建/更新限定创建者；`takes` 允许已登录匿名用户写入本人 Take。
- 活跃 Take 只能更新 `slots.active_take_id` 列，复合外键限制 Take 必须属于同一席位。
- `takes` 存储桶公开读、认证用户写入，上传路径以房间 UUID 开头。
- `template-assets` 目前公开读，由项目维护者管理资源。

不要只依据前端隐藏状态判断授权；应以已部署 RLS、函数权限和 Storage 策略为准。

## 7. 运行与验收边界

代码中已有房间、上传、多 Take、Realtime、音频播放和 WAV 导出实现。当前仍需完成的产品验收是两个独立浏览器或设备的完整流程：创建、分享、加入、录制、保存、刷新恢复和双方试听。类型检查通过不能替代这一验收。

本地开发地址 `localhost` 支持浏览器安全上下文能力；经局域网 HTTP 地址访问时，部分音频 API 不可用，代码会退回 PolySynth 和弦音色。部署环境建议使用 HTTPS。
