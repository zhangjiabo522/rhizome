const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, globalShortcut, shell } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs/promises')
const mm = require('music-metadata')

const DATA_DIR = path.join(app.getPath('userData'), 'data')

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', () => {
        if (win) {
            if (win.isMinimized()) win.restore()
            win.show()
            win.focus()
        }
    })
}


let win = null
let tray = null
let lyricWindow = null
let lyricReady = false
let lastLyricData = null
let lastLockState = false

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1000,
        minHeight: 700,
        frame: false,
        roundedCorners: false,
        show: false,
        backgroundColor: '#121212',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false,
        },
    })

    win.once('ready-to-show', () => {
        win.show()
    })

    if (app.isPackaged) {
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    } else {
        win.loadURL('http://localhost:9000')
    }

    // win.webContents.openDevTools()
    win.removeMenu()

    win.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault()
            win.webContents.send('global-player-stop')
            win.hide()
        }
    })

    win.on('maximize', () => win.webContents.send('window-maximized', true))
    win.on('unmaximize', () => win.webContents.send('window-maximized', false))

    createTray()
}

function createTray() {
    const trayIconPath = path.join(__dirname, './icons/img.png')
    tray = new Tray(trayIconPath)

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '打开主界面',
            click: () => {
                if (win.isMinimized()) win.restore()
                win.show()
                win.focus()
            },
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => {
                app.isQuitting = true
                tray.destroy()
                win.destroy()
                app.quit()
            },
        },
    ])

    tray.setContextMenu(contextMenu)
    tray.setToolTip('Rhizome · 音乐播放器')

    tray.on('click', () => {
        win.isVisible() ? win.hide() : win.show()
    })
}

// ============================================================
// 桌面歌词窗口
// ============================================================
const LYRICS_POS_FILE = path.join(DATA_DIR, 'desktop-lyrics-pos.json')
const LYRICS_LOCK_FILE = path.join(DATA_DIR, 'desktop-lyrics-lock.json')

function createLyricWindow() {
    if (lyricWindow && !lyricWindow.isDestroyed()) return

    const { screen } = require('electron')
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: sw, height: sh } = primaryDisplay.workAreaSize

    // 恢复保存的位置，或默认屏幕居中偏下
    let savedPos = null
    try {
        const raw = require('fs').readFileSync(LYRICS_POS_FILE, 'utf8')
        savedPos = JSON.parse(raw)
    } catch {}

    const x = savedPos?.x ?? Math.round((sw - 800) / 2)
    const y = savedPos?.y ?? Math.round(sh * 0.85)

    lyricWindow = new BrowserWindow({
        width: 800,
        height: 100,
        x,
        y,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        hasShadow: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            preload: path.join(__dirname, 'preload-lyrics.js'),
        },
    })

    if (app.isPackaged) {
        lyricWindow.loadFile(path.join(__dirname, '../dist/desktop-lyrics.html'))
    } else {
        lyricWindow.loadURL('http://localhost:9000/desktop-lyrics.html')
    }

    // 禁用右键菜单
    lyricWindow.webContents.on('context-menu', (e) => e.preventDefault())

    // 确保始终置顶（部分系统上 hide/show 后可能丢失）
    lyricWindow.webContents.on('did-finish-load', () => {
        lyricWindow?.setAlwaysOnTop(true, 'screen-saver')
    })

    // 保存窗口位置
    lyricWindow.on('moved', () => {
        try {
            const [wx, wy] = lyricWindow.getPosition()
            require('fs').writeFileSync(LYRICS_POS_FILE, JSON.stringify({ x: wx, y: wy }), 'utf8')
        } catch {}
    })

    lyricWindow.on('closed', () => {
        lyricWindow = null
        lyricReady = false
        lastLyricData = null
        lastLockState = false
    })

    // 初始隐藏，等待主窗口发送显示指令
    lyricWindow.hide()
}

// ============================================================
// 桌面歌词 IPC handlers
// ============================================================
ipcMain.on('show-desktop-lyrics', () => {
    if (!lyricWindow || lyricWindow.isDestroyed()) createLyricWindow()
    lyricWindow?.setAlwaysOnTop(true, 'screen-saver')
    lyricWindow?.show()
})

ipcMain.on('hide-desktop-lyrics', () => {
    lyricWindow?.hide()
})

ipcMain.on('set-desktop-lyrics-lock', (_e, locked) => {
    lastLockState = !!locked
    // 持久化到文件，重启后恢复
    try { require('fs').writeFileSync(LYRICS_LOCK_FILE, JSON.stringify(lastLockState), 'utf8') } catch {}
    if (lyricWindow && !lyricWindow.isDestroyed()) {
        lyricWindow.setIgnoreMouseEvents(lastLockState, { forward: true })
        lyricWindow.webContents.send('desktop-lyrics-lock-changed', lastLockState)
    }
})

ipcMain.handle('get-desktop-lyrics-lock', () => {
    // 优先内存，回退文件
    if (lastLockState) return true
    try {
        const raw = require('fs').readFileSync(LYRICS_LOCK_FILE, 'utf8')
        lastLockState = JSON.parse(raw) === true
    } catch {}
    return lastLockState
})


ipcMain.on('update-desktop-lyrics', (_e, data) => {
    lastLyricData = data
    if (lyricWindow && !lyricWindow.isDestroyed() && lyricReady) {
        lyricWindow.webContents.send('desktop-lyrics-update', data)
    }
})

ipcMain.on('desktop-lyrics-ready', () => {
    lyricReady = true
    lyricWindow?.setAlwaysOnTop(true, 'screen-saver')
    // 从文件恢复锁定状态（兜底 IPC 时序问题）
    if (!lastLockState) {
        try {
            const raw = require('fs').readFileSync(LYRICS_LOCK_FILE, 'utf8')
            lastLockState = JSON.parse(raw) === true
        } catch {}
    }
    if (lyricWindow && !lyricWindow.isDestroyed()) {
        // 应用锁定状态
        if (lastLockState) {
            lyricWindow.setIgnoreMouseEvents(true, { forward: true })
        }
        // 补发最后一次歌词数据
        if (lastLyricData) {
            lyricWindow.webContents.send('desktop-lyrics-update', lastLyricData)
        }
        // 补发锁定状态
        lyricWindow.webContents.send('desktop-lyrics-lock-changed', lastLockState)
    }
})

ipcMain.on('window-minimize', () => win?.minimize())
ipcMain.on('window-hide', () => win?.hide())

ipcMain.on('window-maximize', () => {
    if (!win) return
    win.isMaximized() ? win.unmaximize() : win.maximize()
})


ipcMain.handle('get-user-music-dir', () =>
    path.join(os.homedir(), 'Music')
)

// ============================================================
// 音频格式：覆盖 music-metadata 支持的所有主流格式
// ============================================================
const AUDIO_EXTENSIONS = [
    // 有损格式
    'mp3', 'm4a', 'aac', 'ogg', 'opus', 'wma', 'mpc', 'spx',
    // 无损格式
    'flac', 'wav', 'ape', 'wv', 'aiff', 'aif', 'tta',
    // DSD
    'dsf', 'dff',
    // 容器格式
    'mka', 'mp4', 'webm', 'mkv',
]

ipcMain.handle('select-audio-files', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: '选择音频文件',
        properties: ['openFile', 'multiSelections'],
        filters: [
            {
                name: '所有音频文件',
                extensions: AUDIO_EXTENSIONS
            },
            {
                name: '无损音频',
                extensions: ['flac', 'wav', 'ape', 'wv', 'aiff', 'aif', 'tta', 'dsf', 'dff']
            },
            {
                name: '有损音频',
                extensions: ['mp3', 'm4a', 'aac', 'ogg', 'opus', 'wma', 'mpc', 'spx']
            },
        ]
    })
    return canceled ? [] : filePaths
})

// ============================================================
// 文件夹导入：选择文件夹，扫描所有音频文件
// ============================================================
ipcMain.handle('select-audio-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: '选择音乐文件夹',
        properties: ['openDirectory'],
    })
    if (canceled || !filePaths.length) return null

    const dirPath = filePaths[0]
    const dirName = path.basename(dirPath)

    // 递归扫描文件夹中的音频文件
    const audioFiles = []
    async function scanDir(dir) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true })
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name)
                if (entry.isDirectory()) {
                    await scanDir(fullPath)
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase().replace('.', '')
                    if (AUDIO_EXTENSIONS.includes(ext)) {
                        audioFiles.push(fullPath)
                    }
                }
            }
        } catch (e) {
            // 跳过无权限的目录
        }
    }
    await scanDir(dirPath)

    return { dirPath, dirName, files: audioFiles }
})

// ============================================================
// 持久化：用 JSON 文件存储路径（比 localStorage 可靠）
// ============================================================
const PATHS_FILE = path.join(DATA_DIR, 'music-paths.json')
const FOLDERS_FILE = path.join(DATA_DIR, 'music-folders.json')

async function ensureDataDir() {
    try { await fs.mkdir(DATA_DIR, { recursive: true }) } catch (e) {
        console.error('[rhizome] 创建数据目录失败:', DATA_DIR, e.message)
    }
}

async function loadJsonFile(filePath, fallback) {
    await ensureDataDir()
    try {
        const raw = await fs.readFile(filePath, 'utf8')
        return JSON.parse(raw)
    } catch {
        return fallback
    }
}

async function saveJsonFile(filePath, data) {
    await ensureDataDir()
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
    } catch (e) {
        console.error('[rhizome] 保存数据失败:', filePath, e.message)
        throw e
    }
}

ipcMain.handle('load-music-paths', async () => {
    return await loadJsonFile(PATHS_FILE, [])
})

ipcMain.handle('save-music-paths', async (e, paths) => {
    await saveJsonFile(PATHS_FILE, paths)
    return true
})

ipcMain.handle('load-music-folders', async () => {
    return await loadJsonFile(FOLDERS_FILE, [])
})

ipcMain.handle('save-music-folders', async (e, folders) => {
    await saveJsonFile(FOLDERS_FILE, folders)
    return true
})

// ============================================================
// 备份 / 恢复
// ============================================================
ipcMain.handle('backup-data', async (e, playlistData) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
        title: '保存备份',
        defaultPath: 'rhizome-backup.json',
        filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) return false
    const [paths, folders] = await Promise.all([
        loadJsonFile(PATHS_FILE, []),
        loadJsonFile(FOLDERS_FILE, [])
    ])
    await saveJsonFile(filePath, {
        paths, folders,
        playlists: playlistData || {},
        time: Date.now()
    })
    return true
})

ipcMain.handle('restore-data', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: '选择备份文件',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
    })
    if (canceled || !filePaths.length) return { ok: false }
    const data = await loadJsonFile(filePaths[0], null)
    if (!data || !data.paths) return { ok: false }
    await saveJsonFile(PATHS_FILE, data.paths)
    if (data.folders) await saveJsonFile(FOLDERS_FILE, data.folders)
    return { ok: true, playlists: data.playlists || null }
})

// 保存定时报告 PNG
ipcMain.handle('save-report-file', async (e, dirPath, filename, base64Data) => {
    try {
        await fs.mkdir(dirPath, { recursive: true })
        const filePath = path.join(dirPath, filename)
        const buf = Buffer.from(base64Data, 'base64')
        await fs.writeFile(filePath, buf)
        return true
    } catch { return false }
})

ipcMain.handle('select-report-dir', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: '选择报告保存目录',
        properties: ['openDirectory', 'createDirectory']
    })
    if (canceled || !filePaths.length) return ''
    return filePaths[0]
})

ipcMain.handle('open-path', async (e, p) => {
    return shell.openPath(p)
})

// ============================================================
// 开机自启
// ============================================================
ipcMain.handle('get-auto-launch', () => {
    return app.getLoginItemSettings().openAtLogin
})

ipcMain.handle('set-auto-launch', (e, enabled) => {
    app.setLoginItemSettings({ openAtLogin: !!enabled })
    return true
})

ipcMain.handle('clear-all-data', async () => {
    try {
        await fs.unlink(PATHS_FILE).catch(() => {})
        await fs.unlink(FOLDERS_FILE).catch(() => {})
        return true
    } catch { return false }
})

ipcMain.on('app-quit', () => {
    app.isQuitting = true
    lyricWindow?.destroy()
    tray?.destroy()
    win?.destroy()
    app.quit()
})

// ============================================================
// 封面提取：优先内嵌 → 回退侧车文件
// ============================================================
const COVER_NAMES = [
    'cover.jpg', 'cover.png', 'cover.webp', 'cover.jpeg',
    'folder.jpg', 'folder.png',
    'album.jpg', 'album.png',
    'AlbumArt.jpg', 'AlbumArt.png',
    'front.jpg', 'front.png',
]

async function findSidecarCover(audioPath) {
    const dir = path.dirname(audioPath)
    for (const name of COVER_NAMES) {
        try {
            const full = path.join(dir, name)
            await fs.access(full)
            const buf = await fs.readFile(full)
            const ext = path.extname(name).toLowerCase()
            const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
            const mime = mimeMap[ext] || 'image/jpeg'
            return { data: buf, mime }
        } catch {}
    }
    return null
}

ipcMain.handle('getAudioCover', async (e, filePath) => {
    try {
        // 先尝试内嵌封面
        const data = await mm.parseFile(filePath)
        const pic = data.common.picture?.[0]
        if (pic) {
            return {
                data: Buffer.from(pic.data),
                mime: pic.format || 'image/jpeg',
                source: 'embedded'
            }
        }
        // 回退到侧车封面
        const sidecar = await findSidecarCover(filePath)
        if (sidecar) {
            return { data: sidecar.data, mime: sidecar.mime, source: 'sidecar' }
        }
        return null
    } catch (e) {
        // 最后尝试侧车封面
        try {
            const sidecar = await findSidecarCover(filePath)
            if (sidecar) {
                return { data: sidecar.data, mime: sidecar.mime, source: 'sidecar' }
            }
        } catch {}
        return null
    }
})

// ============================================================
// 侧车封面查询（preload 调用）
// ============================================================
ipcMain.handle('find-sidecar-cover', async (e, audioPath) => {
    try {
        return await findSidecarCover(audioPath)
    } catch {
        return null
    }
})

ipcMain.handle('media-update', (e, info) => {
    if (!win) return
    try {
        win.setMediaPositionState({
            duration: info.duration || 0,
            position: info.currentTime || 0,
        })
        win.setMediaMetadata({
            title: info.title || '未知歌曲',
            artist: info.artist || '未知歌手',
            album: info.album || 'Rhizome',
            artwork: info.coverUrl ? [{ src: info.coverUrl }] : [],
        })
    } catch (err) {}
})

ipcMain.handle('media-play', () => {
    win?.webContents.send('media-play')
})
ipcMain.handle('media-pause', () => {
    win?.webContents.send('media-pause')
})
ipcMain.handle('media-prev', () => {
    win?.webContents.send('media-prev')
})
ipcMain.handle('media-next', () => {
    win?.webContents.send('media-next')
})


// ============================================================
// 全局快捷键系统
// ============================================================
function buildAccelerator(combo) {
    const parts = []
    if (combo.ctrl) parts.push('CommandOrControl')
    if (combo.shift) parts.push('Shift')
    if (combo.alt) parts.push('Alt')
    const key = combo.code
        .replace('Key', '').replace('Digit', '')
        .replace('ArrowLeft', 'Left').replace('ArrowRight', 'Right')
        .replace('ArrowUp', 'Up').replace('ArrowDown', 'Down')
        .replace('Backslash', '\\').replace('Slash', '/')
        .replace('BracketLeft', '[').replace('BracketRight', ']')
        .replace('Semicolon', ';').replace('Quote', "'")
        .replace('Comma', ',').replace('Period', '.')
        .replace('Minus', '-').replace('Equal', '=')
    parts.push(key)
    return parts.join('+')
}

ipcMain.handle('update-global-shortcuts', async (e, list) => {
    globalShortcut.unregisterAll()
    if (!list || !list.length) return true
    for (const s of list) {
        try {
            globalShortcut.register(buildAccelerator(s.combo), () => {
                if (s.event === 'toggle-window') {
                    if (win.isVisible()) { win.hide() } else { win.show(); win.focus() }
                } else if (s.event) {
                    win?.webContents.send(s.event)
                }
            })
        } catch {}
    }
    return true
})

app.whenReady().then(() => {
    createWindow()

    // 初始全局快捷键
    const initialShortcuts = [
        { combo: { code: 'Slash', ctrl: true, shift: true, alt: false }, event: 'media-play-pause' },
        { combo: { code: 'ArrowRight', ctrl: true, shift: false, alt: false }, event: 'media-next' },
        { combo: { code: 'ArrowLeft', ctrl: true, shift: false, alt: false }, event: 'media-prev' },
        { combo: { code: 'ArrowUp', ctrl: true, shift: false, alt: false }, event: 'media-vol-up' },
        { combo: { code: 'ArrowDown', ctrl: true, shift: false, alt: false }, event: 'media-vol-down' },
        { combo: { code: 'Backslash', ctrl: true, shift: false, alt: false }, event: 'toggle-window' },
    ]
    for (const s of initialShortcuts) {
        try {
            globalShortcut.register(buildAccelerator(s.combo), () => {
                if (s.event === 'toggle-window') {
                    if (win.isVisible()) { win.hide() } else { win.show(); win.focus() }
                } else {
                    win?.webContents.send(s.event)
                }
            })
        } catch {}
    }

    if (process.platform === 'win32') {
        app.on('media-play-pause', () => {
            win?.webContents.send('media-play-pause')
        })
        app.on('media-next-track', () => {
            win?.webContents.send('media-next')
        })
        app.on('media-previous-track', () => {
            win?.webContents.send('media-prev')
        })
    }
})

app.on('window-all-closed', () => {})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
