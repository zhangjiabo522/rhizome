# Disk

源码归档与开发用产物。

| 文件 | 说明 |
|---|---|
| `rhizome-1.1.0-source.tar.gz` | 不含 `node_modules` / `dist` / `.git`,解压即编译 |
| `SHA256SUMS` | 校验和 |

## 从源码构建 deb

```bash
tar -xzf rhizome-1.1.0-source.tar.gz
cd rhizome
npm install --registry=https://registry.npmmirror.com
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
  npm run build:linux
# 产物:dist_electron/Rhizome-1.1.0-amd64.deb
```

详见仓库根 `package.json` `scripts` 字段。
