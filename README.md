# 8Bars

> 和朋友一起创作音乐，每个人贡献一段，让作品逐渐成形。

8Bars 是一款面向普通音乐爱好者的异步协作音乐产品。用户创建一个音乐房间，把链接发给朋友；参与者选择声部、录制 8 小节并保存，之后可以一起试听和挑选版本。

8Bars 不是专业数字音频工作站，也不以 AI 自动生成完整歌曲为核心。节奏、和弦等伴奏是创作起点，人的录音和协作才是作品主体。

## MVP 目标

验证两个人能否通过分享链接，在不同设备或浏览器中完成一次共同创作：创建房间、加入、录制并保存一个声部、听到合奏结果。MVP 不要求四个席位全部填满。

当前代码已包含房间、录音、Take 版本和实时同步等功能，但真实用户的端到端体验尚未完成验收；因此目前称为功能原型，不标记为 MVP 已完成。验收标准和实施路线见 [产品定义与 MVP 路线图](docs/PRODUCT_MVP.md)。

## 当前产品原则

- **社交创作优先**：先让用户成功邀请并和另一个人共同完成一段音乐。
- **异步参与**：参与者不需要同时在线，录音保存后其他人可以进入房间试听。
- **伴奏是起点**：模板提供音乐基础，不是固定的 AI 完成曲；旋律声部留给参与者。
- **先验证再扩展**：暂不以模板数量、点赞数或页面数量作为 MVP 完成标准。

## 当前代码能力

以下为代码中已有的能力，不代表已经通过生产环境和真实用户验收：

- 房间创建、分享链接直达和乐队广场
- 匿名会话、麦克风录制、8 小节录音及 Take 上传
- 一个席位保存多个 Take、选择当前播放版本
- 房间 Take 和活跃版本的实时同步
- 基于模板参数程序化生成节奏、贝斯与和弦伴奏
- 合奏播放与 WAV 导出

模板数据从 Supabase 的 `templates` 表读取；用户自定义模板和完整的音乐制作编辑器不属于当前 MVP 范围。音频在安全上下文中的浏览器支持及降级音色仍需实机验证。

## 技术栈

| 层 | 技术 |
|---|---|
| 应用 | Next.js App Router、React、TypeScript |
| 样式 | Tailwind CSS |
| 音频 | Tone.js、Web Audio、MediaRecorder |
| 数据与认证 | Supabase Postgres、Anonymous Auth、Row Level Security |
| 音频存储 | Supabase Storage |

## 本地开发

```bash
npm install
npm run dev
```

开发服务器默认运行在 `http://localhost:3000`。访问麦克风和浏览器音频 API 时，localhost 或 HTTPS 是推荐环境；局域网 HTTP 地址可能限制部分音频能力。

常用检查：

```bash
npm run lint
npm run build
```

运行前需配置 `.env.local` 中的 Supabase URL 和 anon key，并确保远端数据库已应用 `supabase/migrations/` 中的迁移。

## 文档

- [产品定义与 MVP 路线图](docs/PRODUCT_MVP.md)
- [架构蓝图](docs/architecture.md)
- [技术文档](docs/TECHNICAL.md)

## 许可

Apache-2.0
