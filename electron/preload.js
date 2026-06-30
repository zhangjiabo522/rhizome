const { contextBridge, ipcRenderer } = require("electron")
const mm = require("music-metadata")
const path = require("path")
const fs = require("fs/promises")

function normalizeText(s) { return (s||"").toLowerCase().replace(/[\s\u3000]+/g," ").trim() }
function normalizeArtist(a) { return (a||"").split(/[,&]/).map(normalizeText).filter(Boolean).sort().join(" ") }
function genKey(t,a) { return normalizeText(t)+"|"+normalizeArtist(a) }
function fmtDur(s) { if(!s||s<0) return "00:00"; var m=Math.floor(s/60); var sec=Math.floor(s%60); return m.toString().padStart(2,"0")+":"+sec.toString().padStart(2,"0") }

var COVERS = ["cover.jpg","cover.png","cover.webp","cover.jpeg","folder.jpg","folder.png","album.jpg","album.png","AlbumArt.jpg","AlbumArt.png","front.jpg","front.png"]

function embCover(pics) { var p=pics&&pics[0]; if(!p) return null; return {url:"data:"+p.format+";base64,"+Buffer.from(p.data).toString("base64"),mime:p.format,source:"embedded"} }
async function sideCover(fp) { var d=path.dirname(fp); for(var i=0;i<COVERS.length;i++){try{var f=path.join(d,COVERS[i]);await fs.access(f);var b=await fs.readFile(f);var e=path.extname(COVERS[i]).toLowerCase();var mm2={".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp"};return{url:"data:"+(mm2[e]||"image/jpeg")+";base64,"+b.toString("base64"),mime:mm2[e]||"image/jpeg",source:"sidecar"}}catch(ex){}}return null}

function parseLRC(t) {
    var lines=t.split(/\r?\n/),res=[],re=/^\[(\d{1,}):(\d{1,})(?:[.:](\d{2,3}))?\]/,mre=/^\[(ti|ar|al|by|length|re|ve):/i,off=0
    for(var i=0;i<lines.length;i++){var ln=lines[i].trim();if(!ln)continue
        if(ln.match(/^\[offset:([+-]?\d+)\]/)){off=parseInt(RegExp.$1,10)/1000;continue}
        if(mre.test(ln))continue
        var m=ln.match(re);if(m){var mn=parseInt(m[1],10),sc=parseInt(m[2],10),ms=0
            if(m[3]){ms=parseInt(m[3],10);ms=m[3].length===2?ms/100:ms/1000}
            var tm=mn*60+sc+ms+off,tx=ln.replace(re,"").trim()
            if(tx)res.push({time:Math.max(0,tm),text:tx})}}
    return res.sort(function(a,b){return a.time-b.time})
}

// 直接从 FLAC 二进制读取 Vorbis Comment 中的 LYRICS 字段
async function extLyrics(fp, common, native, isFlac) {
    if (isFlac && native) {
        var ks = Object.keys(native)
        for (var i = 0; i < ks.length; i++) {
            var tag = native[ks[i]]
            if (Array.isArray(tag)) {
                for (var j = 0; j < tag.length; j++) {
                    var item = tag[j]
                    // { id, value } 格式 (music-metadata v11)
                    if (typeof item === "object" && item !== null && item.id && item.value && typeof item.value === "string") {
                        if (item.id.toUpperCase() === "LYRICS" && item.value.indexOf("[00:") >= 0) {
                            var p = parseLRC(item.value)
                            if (p.length > 0) return { lines: item.value.split(/\r?\n/).filter(Boolean), synced: p, source: "embedded" }
                        }
                    }
                    // 纯字符串格式
                    if (typeof item === "string" && item.indexOf("[00:") >= 0) {
                        var p = parseLRC(item)
                        if (p.length > 0) return { lines: item.split(/\r?\n/).filter(Boolean), synced: p, source: "embedded" }
                    }
                }
            }
        }
    }

    // mp3/wav 及其他通用路径
    var bl = [], bs = []
    if (common.lyrics && common.lyrics.length) {
        var t = common.lyrics.map(function(x) { return x.text || x }).join("\n")
        bl = t.split(/\r?\n/).filter(Boolean); bs = parseLRC(t)
        if (bs.length > 0) return { lines: bl, synced: bs, source: "embedded" }
    }
    if (!bs.length && typeof common.unsyncedLyrics === "string" && common.unsyncedLyrics.trim()) {
        bl = common.unsyncedLyrics.split(/\r?\n/).filter(Boolean); bs = parseLRC(common.unsyncedLyrics)
        if (bs.length > 0) return { lines: bl, synced: bs, source: "embedded" }
    }

    // 侧车 LRC 文件
    var cand = [fp.replace(/\.\w+$/, ".lrc")]
    var d = path.dirname(fp); var b = path.basename(fp, path.extname(fp))
    var mx = b.match(/^(.+?)\s*[-–—]\s*/); if (mx && mx[1].length > 1) cand.push(path.join(d, mx[1] + ".lrc"))
    for (var k = 0; k < cand.length; k++) {
        try {
            await fs.access(cand[k])
            var ct = await fs.readFile(cand[k], "utf8")
            var pp = parseLRC(ct)
            return { lines: ct.split(/\r?\n/).map(function(l) { return l.trim() }).filter(Boolean), synced: pp, source: "sidecar-lrc" }
        } catch (ex) {}
    }

    // 侧车 TXT
    try {
        var tp = fp.replace(/\.\w+$/, ".txt"); await fs.access(tp)
        var tc = await fs.readFile(tp, "utf8")
        var tl = tc.split(/\r?\n/).map(function(l) { return l.trim() }).filter(Boolean)
        if (tl.length) return { lines: tl, synced: [], source: "sidecar-txt" }
    } catch (ex) {}

    if (bl.length) return { lines: bl, synced: bs, source: "embedded" }
    return { lines: [], synced: [], source: null }
}

contextBridge.exposeInMainWorld("electron", {
    selectAudioFiles: function() { return ipcRenderer.invoke("select-audio-files") },
    selectAudioFolder: function() { return ipcRenderer.invoke("select-audio-folder") },
    loadMusicPaths: function() { return ipcRenderer.invoke("load-music-paths") },
    saveMusicPaths: function(p) { return ipcRenderer.invoke("save-music-paths", p) },
    loadMusicFolders: function() { return ipcRenderer.invoke("load-music-folders") },
    saveMusicFolders: function(f) { return ipcRenderer.invoke("save-music-folders", f) },
    getAutoLaunch: function() { return ipcRenderer.invoke("get-auto-launch") },
    setAutoLaunch: function(enabled) { return ipcRenderer.invoke("set-auto-launch", enabled) },
    backupData: function() {
        // 收集渲染进程的 localStorage 数据
        const playlistData = {
            local_playlists: localStorage.getItem('local_playlists'),
            local_playlist_songs: localStorage.getItem('local_playlist_songs'),
            playHistoryView: localStorage.getItem('playHistoryView'),
            playCountReal: localStorage.getItem('playCountReal'),
            rhizome_shortcuts: localStorage.getItem('rhizome-shortcuts'),
            rhizome_play_mode: localStorage.getItem('rhizome-play-mode'),
            rhizome_theme: localStorage.getItem('rhizome-theme'),
            rhizome_lyric_size: localStorage.getItem('rhizome-lyric-size'),
            rhizome_lyric_align: localStorage.getItem('rhizome-lyric-align'),
            rhizome_desktop_lyrics_visible: localStorage.getItem('rhizome-desktop-lyrics-visible'),
            rhizome_desktop_lyrics_locked: localStorage.getItem('rhizome-desktop-lyrics-locked'),
            rhizome_volume: localStorage.getItem('rhizome-volume'),
        }
        return ipcRenderer.invoke("backup-data", playlistData)
    },
    restoreData: function() {
        return ipcRenderer.invoke("restore-data").then(function(result) {
            if (result && result.playlists) {
                var p = result.playlists
                if (p.local_playlists) localStorage.setItem('local_playlists', p.local_playlists)
                if (p.local_playlist_songs) localStorage.setItem('local_playlist_songs', p.local_playlist_songs)
                if (p.playHistoryView) localStorage.setItem('playHistoryView', p.playHistoryView)
                if (p.playCountReal) localStorage.setItem('playCountReal', p.playCountReal)
                if (p.rhizome_shortcuts) localStorage.setItem('rhizome-shortcuts', p.rhizome_shortcuts)
                if (p.rhizome_play_mode) localStorage.setItem('rhizome-play-mode', p.rhizome_play_mode)
                if (p.rhizome_theme) localStorage.setItem('rhizome-theme', p.rhizome_theme)
                if (p.rhizome_lyric_size) localStorage.setItem('rhizome-lyric-size', p.rhizome_lyric_size)
                if (p.rhizome_lyric_align) localStorage.setItem('rhizome-lyric-align', p.rhizome_lyric_align)
                if (p.rhizome_desktop_lyrics_visible) localStorage.setItem('rhizome-desktop-lyrics-visible', p.rhizome_desktop_lyrics_visible)
                if (p.rhizome_desktop_lyrics_locked) localStorage.setItem('rhizome-desktop-lyrics-locked', p.rhizome_desktop_lyrics_locked)
                if (p.rhizome_volume) localStorage.setItem('rhizome-volume', p.rhizome_volume)
            }
            return result ? result.ok : false
        })
    },
    parseAudio: async function(fp) {
        if (typeof fp !== "string" || !fp) return null
        try {
            var meta = await mm.parseFile(fp, { duration: true, skipCovers: false, skipPostHeaders: false, includeChapters: false })
            var c = meta.common
            var title = c.title || path.basename(fp, path.extname(fp))
            var artist = c.artist || "未知歌手"
            var cv = embCover(c.picture); if (!cv) cv = await sideCover(fp)
            var isFlac = fp.toLowerCase().endsWith(".flac")
            var lr = await extLyrics(fp, c, meta.native, isFlac)
            var mtime = 0
            try { var st = await fs.stat(fp); mtime = Math.floor(st.mtimeMs) } catch {}
            return {
                path: fp, title: title, singer: artist,
                album: c.album || "", year: c.year || null,
                genre: (c.genre && c.genre.length) ? c.genre.join(" / ") : "",
                track: c.track ? c.track.no : null, composer: c.composer ? c.composer[0] : "",
                duration: meta.format.duration || 0,
                durationFormat: fmtDur(meta.format.duration),
                songKey: genKey(title, artist),
                coverUrl: cv ? cv.url : "", coverSource: cv ? cv.source : null,
                lyrics: lr.lines, syncedLyrics: lr.synced, lyricsSource: lr.source,
                mtime: mtime,
                _raw: { codec: meta.format.codec, container: meta.format.container, bitrate: meta.format.bitrate, sampleRate: meta.format.sampleRate, numberOfChannels: meta.format.numberOfChannels }
            }
        } catch (err) {
            console.error("[parseAudio] fail", err)
            return {
                path: fp, title: path.basename(fp, path.extname(fp)), singer: "未知歌手",
                album: "", year: null, genre: "", track: null, composer: "",
                duration: 0, durationFormat: "00:00",
                songKey: genKey(path.basename(fp, path.extname(fp)), "未知歌手"),
                coverUrl: "", coverSource: null, lyrics: [], syncedLyrics: [], lyricsSource: null, _raw: null
            }
        }
    },
    readLocalLrc: async function(fp) {
        try { var lp = fp.replace(/\.\w+$/, ".lrc"); await fs.access(lp); var ct = await fs.readFile(lp, "utf8"); return parseLRC(ct) } catch (e) { return [] }
    },
    getFileMtime: async function(fp) {
        try { var st = await fs.stat(fp); return Math.floor(st.mtimeMs) } catch { return 0 }
    },
    findSidecarCover: function(fp) { return ipcRenderer.invoke("find-sidecar-cover", fp) },
    minimize: function() { return ipcRenderer.send("window-minimize") },
    maximize: function() { return ipcRenderer.send("window-maximize") },
    close: function() { return ipcRenderer.send("window-hide") },
    onMediaPlayPause: function(cb) { ipcRenderer.on('media-play-pause', cb) },
    onMediaNext: function(cb) { ipcRenderer.on('media-next', cb) },
    onMediaPrev: function(cb) { ipcRenderer.on('media-prev', cb) },
    onMediaVolUp: function(cb) { ipcRenderer.on('media-vol-up', cb) },
    onMediaVolDown: function(cb) { ipcRenderer.on('media-vol-down', cb) },
    onToggleDesktopLyrics: function(cb) { ipcRenderer.on('toggle-desktop-lyrics', cb) },
    onToggleWindow: function(cb) { ipcRenderer.on('toggle-window', cb) },
    onWindowMaximized: function(cb) { ipcRenderer.on("window-maximized", (_, state) => cb(state)) },
    clearAllData: function() { return ipcRenderer.invoke("clear-all-data") },
    appQuit: function() { return ipcRenderer.send("app-quit") },
    updateGlobalShortcuts: function(list) { return ipcRenderer.invoke("update-global-shortcuts", list) },
    // 桌面歌词
    showDesktopLyrics: function() { return ipcRenderer.send("show-desktop-lyrics") },
    hideDesktopLyrics: function() { return ipcRenderer.send("hide-desktop-lyrics") },
    setDesktopLyricsLock: function(locked) { return ipcRenderer.send("set-desktop-lyrics-lock", locked) },
    getDesktopLyricsLock: function() { return ipcRenderer.invoke("get-desktop-lyrics-lock") },
    saveReportFile: function(dirPath, filename, base64Data) { return ipcRenderer.invoke("save-report-file", dirPath, filename, base64Data) },
    selectReportDir: function() { return ipcRenderer.invoke("select-report-dir") },
    openPath: function(p) { return ipcRenderer.invoke("open-path", p) },
    updateDesktopLyrics: function(data) { return ipcRenderer.send("update-desktop-lyrics", data) },
})
