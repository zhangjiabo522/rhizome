# Rhizome

简约的本地音乐播放器 · Vue 3 + Electron

## 预览

![暗色主题](public/1.png)

![亮色主题](public/2.png)

## 功能

### 音频
- 本地音频管理（MP3 / FLAC / WAV）
- 文件夹导入 & 批量扫描
- 封面提取（内嵌）
- 频谱可视化

### 歌词
- 内嵌 LRC 歌词解析 & 显示
- 桌面歌词（置顶透明窗口，可锁定拖拽、调整字号与对齐）
- 歌词四角取景框 + 进度消逝线

### 播放
- 列表 / 循环 / 单曲 / 随机（Fisher-Yates 伪随机不重复）
- 进度条拖拽 & 滚轮微调
- Media Session 系统控件集成

### 歌单
- 自定义歌单（创建 / 编辑 / 排序 / 多选操作）
- 「我喜欢」固定歌单，全局心形按钮一键收藏
- 周报自动歌单（设置中开启）：「本周最爱」Top 10 +「每周发现」10 首，保留最近 4 期
- 歌单内拖拽排序 & 数字序号排序

### 统计 & 报告
- 听歌统计（总次数 / 歌曲数 / 时长 / 最爱歌手 / 排行）
- 播放记录 PNG 报告生成（可设保存路径）
- 定时报告：周报 / 月报 / 年报

### 界面
- 暗色 / 亮色主题
- 入场动效（标题 / 按钮 / 封面 / 列表条目 / 分隔线依次动效，统一节奏）
- 切歌动效（封面四角收拢、色条擦除、歌词闪烁 + 进度条脉冲）
- 歌曲详情页：播放进度边框从四边中点生长
- 当前播放歌曲反色高亮
- 浮动定位按钮（跳转到当前播放歌曲）

### 系统
- 全局快捷键（可自定义）
- 开机自启
- 系统托盘（最小化到托盘）
- 数据备份与恢复（含歌单、历史、播放记录、偏好设置）
- 音频设备热切换

## 开发

```bash
npm install          # 安装依赖
npm run electron:dev # 启动开发（Vite + Electron）
npm run build        # 生产构建
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 播放 / 暂停 |
| `←` / `→` | 上一曲 / 下一曲 |
| `↑` / `↓` | 音量增减 |
| `Ctrl+'` | 显示 / 隐藏桌面歌词 |
| `Ctrl+Shift+/` | 全局播放 / 暂停 |
| `Ctrl+←` / `Ctrl+→` | 全局上一曲 / 下一曲 |
| `Ctrl+↑` / `Ctrl+↓` | 全局音量增减 |
| `Ctrl+\` | 全局显示 / 隐藏窗口 |

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 (Composition API) / Pinia / Vue Router |
| 桌面 | Electron |
| 音频 | music-metadata |
| 构建 | Vite / electron-builder |

## 结构

```
rhizome/
├── electron/              # 主进程 & preload
│   ├── main.js            # 窗口管理 / IPC / 托盘 / 全局快捷键 / 桌面歌词窗口
│   ├── preload.js         # 音频解析、文件 IO、备份恢复桥接
│   └── preload-lyrics.js  # 歌词窗口桥接
├── src/                   # 渲染进程
│   ├── components/
│   │   ├── common/        # FavoriteButton / SelectModal / SettingsModal / AboutModal
│   │   ├── lyrics/        # DesktopLyrics
│   │   └── player/        # GlobalPlayer / PlaybackControls / ProgressBar / VolumeControl
│   ├── views/
│   │   ├── MainLayout.vue # 主布局（标题栏 + 播放栏 + 路由出口）
│   │   └── player/        # LocalMusic / PlaylistDetail / MyPlaylist / PlayHistory / PlayStats / SongDetail
│   ├── stores/            # Pinia（playerStore / localMusicStore）
│   ├── composables/       # useGlobalTheme / useShortcuts / useSpectrumEngine / useReportGenerator / useCurrentSongHighlight / useFavorites / useWeeklyPlaylists
│   ├── router/
│   └── main.js            # Vue 入口
├── public/
├── index.html
├── desktop-lyrics.html
└── package.json
```

## License

MIT
