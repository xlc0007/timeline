# 时光线条 · 未来计划时间轴

一款 **Windows 本地离线桌面应用**，用横向时间轴管理你的未来计划。数据仅存本机，不接入任何外部日历、账号、云同步或网络服务。

- 技术栈：**Tauri 2 + React 18 + TypeScript + SQLite（rusqlite）**
- 界面：中文，默认浅色主题，可跟随系统或手动切换深色主题

## 功能特性

- **横向可缩放时间轴**：日 / 周 / 月 / 年四种视图，前进、后退、"今天"按钮；计划条长度严格按实际持续时间比例绘制。
- **重叠自动分轨**：时间重叠的计划自动分配到不同轨道，互不遮挡。
- **今天竖线**：启动、回到前台、跨午夜时自动刷新日期与状态。
- **自动分类**（不可手改）：按持续天数实时计算——
  - 少于 30 天 → **短期**（蓝）
  - 30–180 天（含边界）→ **中期**（橙）
  - 超过 180 天 → **长期**（紫）
- **完整增删改查**：新增、详情抽屉、编辑、删除确认、归档与取消归档。
- **筛选**：关键字、标签、短/中/长期、未来 / 进行中 / 已结束 / 已归档。
- **导入导出**：带 `schemaVersion` 的 JSON；导入前校验并展示结果，错误不破坏既有数据。

## 数据模型

每条计划包含：`UUID`、标题、描述、开始日期、结束日期、标签数组、归档状态、创建时间、更新时间。

- 日期仅存 ISO 字符串 `YYYY-MM-DD`，按系统本地时区显示，**禁止 UTC 转换导致日期偏移**。
- 开始与结束日期均为**包含关系**；结束不得早于开始；新建时开始日期不得早于今天。

## 本地数据位置

SQLite 数据库文件：

```
%APPDATA%\com.shiguang.timeline\timeline.db
```

即 `C:\Users\<你的用户名>\AppData\Roaming\com.shiguang.timeline\timeline.db`。

## 备份与恢复

| 方式 | 操作 |
| --- | --- |
| 备份 | 复制上述 `timeline.db` 文件；或在应用内「导入 / 导出 → 生成导出数据 → 下载 JSON」 |
| 恢复 | 将备份的 `timeline.db` 覆盖回原路径（关闭应用后操作）；或「导入 / 导出 → 选择 JSON 文件 → 确认导入」 |

> 导入采用事务写入，任一条写入失败即整体回滚，已有数据不受影响；已存在的 UUID 会自动生成新 ID，不会覆盖旧数据。

## 构建（本地）

### 前置条件

1. **Node.js** ≥ 18（推荐 22）
2. **Rust** stable（通过 [rustup](https://rustup.rs/) 安装，`x86_64-pc-windows-msvc`）
3. **Visual Studio Build Tools**（勾选「使用 C++ 的桌面开发」负载）或完整 Visual Studio
4. **WebView2 Runtime**（Windows 10/11 通常已自带）

### 命令

```bash
# 安装依赖
npm install

# 开发调试
npm run tauri dev

# 运行前端纯函数测试
npm test

# 运行 Rust 后端测试
cd src-tauri && cargo test

# 构建安装包（NSIS .exe + MSI）
npm run tauri build
```

构建产物位于：

```
src-tauri/target/release/bundle/nsis/*.exe   # NSIS 安装向导
src-tauri/target/release/bundle/msi/*.msi    # MSI 安装包
```

## 安装

运行构建出的 `*.exe`（NSIS 安装向导）或 `*.msi` 即可，双击按提示安装。应用为 x64 架构，无外部依赖，首次启动即创建本地数据库。

## 发布（GitHub Actions）

推送版本标签 `v*`（如 `v0.1.0`）时，`.github/workflows/release.yml` 会在 `windows-latest` 上自动：

1. 安装 Node 与 Rust；
2. 将标签版本同步写入 `tauri.conf.json`；
3. 构建 NSIS 与 MSI 安装包；
4. 用 `git archive` 生成源码 ZIP；
5. 将安装包与源码 ZIP 作为 Release 附件发布。

构建产物**不会**提交进源码分支（`.gitignore` 已忽略 `target/`、`dist/`、`node_modules/` 及 `*.exe`、`*.msi`、`*.zip`）。

## 目录结构

```
├─ src/                      # React 前端
│  ├─ lib/                   # 纯函数：日期、分类、分轨、筛选、导入导出
│  ├─ store/                 # zustand 状态
│  ├─ components/            # 时间轴、计划条、抽屉、弹窗、筛选栏等
│  └─ theme.css              # 浅色/深色主题变量
├─ src-tauri/                # Rust 后端
│  ├─ src/{db,commands,models,validate}.rs
│  └─ icons/                 # 应用图标
├─ scripts/set-version.mjs   # 版本标签同步脚本
├─ .github/workflows/release.yml
└─ package.json
```

## 不包含（按需求）

外部账号、云同步、提醒通知、重复计划、多人协作。
