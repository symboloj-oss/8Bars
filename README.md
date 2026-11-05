# 8Bars · 8 小节极简乐器异步合奏

> 把零散生涩的 15 秒练习,拼成一支完整的乐队。

## 愿景

**让每一个乐器初学者,都能体验人生第一次"组乐队"的爽感。**

8Bars 是一块 Web 端的"8 小节积木式拼图":任何房间都只有固定 4 个席位(鼓、贝斯、和弦、旋律),任何人戴上耳机录满 8 小节即可认领一个席位;空缺席位由系统预置的高品质音频切片与 AI 合成实时补位——**任何时候点开房间,听到的永远是一支编制完整的乐队**。不需要排练、不需要约定时间、不需要好友同时在线的异步合奏。

## 核心概念

| 概念 | 规则 |
|---|---|
| **8 小节** | 单次录制严格 8 小节(约 15-21 秒),弹错即重录,不做剪辑 |
| **固定 4 席位** | 鼓 / 贝斯 / 和弦 / 旋律,全站统一,无无限音轨 |
| **异步合奏** | 你来我往,谁先录都行;AI 替补保证冷启动即完整 |
| **访客免登** | 设备级匿名身份,无需注册,打开链接就能录 |

## 功能特性

- 🎛️ **4 轨录音棚**:8 小节循环播放、逐轨静音/独奏/音量、VU 表头、磁带式播放头可视化
- 🎸 **极简录制流程**:戴耳机提醒 → 麦克风电平测试 → 4 拍预备铃 → 录满自动刹车 → 硬件延迟补偿滑杆(-200ms ~ +50ms)
- 🧭 **和弦提词器**:录制时横向滚动当前/下一和弦,附吉他指法图与钢琴键位,无需记谱
- 🤖 **三级冷启动**:真人 Take → 模板预置音频切片 → AI 程序化合成兜底
- 🏘️ **乐队广场**:真实多用户房间列表、按缺位筛选、点赞、招募宣言与联系方式
- 🔗 **分享直达**:每个房间拥有独立 URL(`/room/{id}`),带 SEO 元数据,微信/小红书分享即点即入
- 📤 **一键导出**:8 小节混音离线渲染为 WAV(含真人录音)
- 🌗 **多语言 / 明暗主题**:简繁中英日韩,主题偏好持久化

## 技术栈

| 层 | 技术 |
|---|---|
| 全栈框架 | Next.js 16(App Router,TypeScript) |
| 样式 | Tailwind CSS 4 |
| 音频引擎 | Tone.js 15(调度 / 合成 / 离线渲染)+ Web Audio / MediaRecorder |
| 数据库 | Supabase Postgres(RLS 行级安全为唯一安全边界) |
| 音频存储 | Supabase Storage(takes / template-assets 两个公开桶) |
| 认证 | Supabase Anonymous Sign-Ins(设备级稳定身份) |
| 部署 | Vercel(连接 GitHub 自动部署) |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 准备 Supabase(首次)
#    - 创建 Supabase 项目,把 URL 与 anon key 填入 .env.local(模板见 .env.example)
#    - 推送迁移: npx supabase link --project-ref <ref> && npx supabase db push --remote --password <db密码>
#    - 后台开启 Authentication → Sign In / Up → Anonymous Sign-Ins

# 3. 启动开发服务器
npm run dev        # http://localhost:3000

# 4. 质量检查
npm run lint       # TypeScript 类型检查
npm run build      # 生产构建
node scripts/debug-headless.mjs          # 无头浏览器功能回归
node scripts/mobile-check.mjs            # 移动端适配诊断
node scripts/test-export.mjs             # WAV 导出回归
```

## 目录结构

```
app/                    # 路由层(RSC 边界):首页 / 房间页 / SEO 元数据
src/
├── views/              # 页面级客户端容器(HomeApp / RoomView / StudioWorkspace)
├── components/         # UI 组件(录音棚模态、席位网格、和弦指法图等)
├── services/           # audioEngine 单例:全部音频逻辑的唯一出入口
├── lib/                # 数据访问层(Supabase 客户端 / API / 行映射)
├── data/               # 静态数据(模板 / 和弦库 / 角色 / 预置音频清单)
├── hooks/  types/  i18n/
supabase/migrations/    # SQL 迁移(建表 + RLS + 种子数据,幂等可重放)
docs/                   # 架构蓝图与技术文档
scripts/                # 无头浏览器诊断与回归脚本
```

## 文档

- [架构蓝图](docs/architecture.md) — 分层设计、数据模型决策、路线图映射
- [技术文档](docs/TECHNICAL.md) — 音频引擎、安全模型、关键流程时序

## 路线图

| 版本 | 目标 |
|---|---|
| v0.1 刺针 | ✅ 录音 + 延迟对齐 + 多轨合并(已完成) |
| v1.0 MVP | ✅ 房间系统、广场、云端录音、分享直达(已完成) |
| v1.5 裂变 | 虚拟乐队舞台、15 秒竖屏短视频导出、动态通知 |
| v2.0 商业化 | 热门歌模版包、音色外设、个人乐队档案 |

## License

Apache-2.0(源代码保留 SPDX 许可证头)
