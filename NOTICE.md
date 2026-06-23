# 仓库说明 / Notice

本仓库是以下上游项目的衍生分支,所有原始版权归原作者所有:

```
Upstream:   https://github.com/Autumn-Dew/rhizome
Upstream Author: AutumnDew <autumndew9102@gmail.com>
License:    (待上游补充)
Fork:       https://github.com/zhangjiabo522/rhizome
```

## 本分支在原项目基础上的改动

为上游项目添加 **Linux 原生 .deb 打包支持**(原生 Electron,非 Wine):

| 改动 | 文件 |
|---|---|
| Linux/deb 构建配置(maintainer、icon、depends、asarUnpack) | `package.json` |
| 依赖降级:music-metadata 11.x ESM → 7.14.0 CJS(修复 asar 启动报错) | `package.json` |
| Vite 8 → 5.4.10(与 Element Plus 兼容) | `package.json` |
| Electron 41 → 33(LTS,镜像稳定) | `package.json` |
| 跨平台 `clean` 脚本 | `package.json` |
| 多架构 deb 构建脚本 | `scripts/build-linux-all.js` |
| Linux hicolor 多尺寸图标(16/32/48/64/128/256) | `build/icons/` |
| 源码归档目录 | `disk/` |
| 编译产物说明(实际 deb 通过 GitHub Releases 分发) | `releases/` |
| 排除 vite 自动生成文件 | `.gitignore` |

## 上游版本

- 基于上游 commit:`74240ae Add files via upload`
- 分支版本:1.1.0

## 反馈

- 上游 issue / PR:https://github.com/Autumn-Dew/rhizome
- 本 fork issue / PR:https://github.com/zhangjiabo522/rhizome
