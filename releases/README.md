# Releases

编译好的分发包。

## Rhizome 1.1.0 · Linux amd64 · Debian/Ubuntu

| 文件 | 大小 | 说明 |
|---|---|---|
| `Rhizome-1.1.0-amd64.deb` | ~78 MB | 主程序(原生 Linux,非 Wine) |

### 安装

```bash
sudo dpkg -i Rhizome-1.1.0-amd64.deb
rhizome
```

### 系统要求

- 架构:`amd64`(x86_64)
- 依赖:`libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libuuid1 libsecret-1-0`
- 已被 deb 的 `Depends` 字段声明,`apt` 会自动拉取

### 校验

```bash
sha256sum -c SHA256SUMS
```

## 其它架构

- `arm64` / `armv7l`:`build:linux:arm64` / `build:linux:armv7l`,需在对应架构机器编译
- 详见根目录 `package.json` scripts
