import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// 播放器核心：当前歌曲、播放状态、播放列表、播放模式、音量

export const usePlayerStore = defineStore('player', () => {
    const currentSong = ref(null)
    const isPlaying = ref(false)
    const currentTime = ref(0)
    const duration = ref(0)
    const playList = ref([])

    const savedMode = localStorage.getItem('rhizome-play-mode')
    const playMode = ref(savedMode || 'list')

    const modeMap = {
        list: 'M4 7h14 M4 12h12 M4 17h16',
        single: 'M12 7v10 M9 16h6',
        listLoop: 'M6 6h12v12H6z M16 6l2 2-2 2 M8 18l-2-2 2-2',
        singleLoop: 'M6 6h12v12H6z M16 6l2 2-2 2 M8 18l-2-2 2-2 M12 9v6 M10 14h4',
        random: 'M4 8h8v6h8 M20 16h-8v-6H4',
    }
    const modeIcon = ref(modeMap[playMode.value])

    // ========== 伪随机播放（Fisher-Yates shuffle） ==========
    const shuffleOrder = ref([])
    let shufflePos = -1

    function regenerateShuffle() {
        const n = playList.value.length
        if (n === 0) { shuffleOrder.value = []; shufflePos = -1; return }
        const arr = Array.from({ length: n }, (_, i) => i)
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        const curIdx = getCurrentSongIndex()
        if (curIdx !== -1 && n > 1 && arr[0] === curIdx) {
            const swapIdx = 1 + Math.floor(Math.random() * (n - 1))
            ;[arr[0], arr[swapIdx]] = [arr[swapIdx], arr[0]]
        }
        shuffleOrder.value = arr
        shufflePos = 0
    }

    const audio = ref(null)
    const lastRecordPath = ref('')
    const lastCountedSong = ref('')
    const lastTickTime = ref(0)
    const accListenTime = ref(0)
    const songCounted = ref(false)

    const savePlayHistory = (song) => {
        if (!song?.path) return
        if (lastRecordPath.value === song.path) return
        lastRecordPath.value = song.path
        try {
            const history = JSON.parse(localStorage.getItem('playHistoryView') || '[]')
            const filtered = history.filter(x => x.path !== song.path)
            filtered.unshift({ path: song.path, playAt: Date.now() })
            if (filtered.length > 30) filtered.splice(30)
            localStorage.setItem('playHistoryView', JSON.stringify(filtered))
        } catch (e) {}
    }

    const saveLocalPlayCount = (song) => {
        if (!song?.path) return
        if (lastCountedSong.value === song.path) return
        lastCountedSong.value = song.path
        try {
            const map = JSON.parse(localStorage.getItem('playCountReal') || '{}')
            map[song.path] = (map[song.path] || 0) + 1
            localStorage.setItem('playCountReal', JSON.stringify(map))
        } catch (e) {}
    }

    const getSongKey = (song) => {
        if (!song) return null
        if (song.songKey) return song.songKey
        const format = (str) => (str || '').toLowerCase().trim()
        const title = format(song.name)
        const artist = format(song.singer)
        return `${title}|${artist}`
    }

    watch(
        () => [currentSong.value, currentTime.value],
        ([song, now]) => {
            if (!song || !song.duration) return
            if (lastTickTime.value > 0 && now > lastTickTime.value) {
                const delta = Math.min(now - lastTickTime.value, 2)
                accListenTime.value += delta
            }
            lastTickTime.value = now
            const threshold = 30
            if (accListenTime.value >= threshold && !songCounted.value) {
                songCounted.value = true
                savePlayHistory(song)
                saveLocalPlayCount(song)
            }
        },
        { deep: true }
    )

    const syncMediaMetadata = () => {
        if (!currentSong.value || !('mediaSession' in navigator)) return
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.value.name || '未知歌曲',
            artist: currentSong.value.singer || '未知歌手',
            album: currentSong.value.album || 'Rhizome',
            artwork: currentSong.value.coverUrl ? [{ src: currentSong.value.coverUrl, sizes: '512x512' }] : []
        })
    }

    const syncMediaState = () => {
        if (!audio.value || !('mediaSession' in navigator)) return
        navigator.mediaSession.playbackState = isPlaying.value ? 'playing' : 'paused'
        try {
            navigator.mediaSession.setPositionState({ duration: duration.value || 0, position: currentTime.value || 0 })
        } catch {}
    }

    const initMediaControls = () => {
        if (!('mediaSession' in navigator)) return
        navigator.mediaSession.setActionHandler('play', () => togglePlay())
        navigator.mediaSession.setActionHandler('pause', () => togglePlay())
        navigator.mediaSession.setActionHandler('previoustrack', () => prevSong())
        navigator.mediaSession.setActionHandler('nexttrack', () => nextSong())
    }

    const volume = ref(1.0)
    const STORAGE_KEY = 'rhizome-player-state'

    const savePlayerState = () => {
        if (!currentSong.value?.path) return
        try {
            const state = {
                songPath: currentSong.value.path,
                currentTime: currentTime.value,
                duration: duration.value,
                volume: volume.value,
                playMode: playMode.value,
                playlistPaths: playList.value.map(s => s.path).filter(Boolean),
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        } catch {}
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', savePlayerState)
    }

    // ========== 自动保存：切歌时 + 播放中定期（解决 Electron 隐藏窗口不触发 beforeunload 的问题） ==========
    let autoSaveTimer = null

    // 切歌时立即保存
    watch(currentSong, (song) => {
        if (song?.path) savePlayerState()
    })

    // 播放中每 15 秒自动保存；暂停时也保存一次（捕获最终进度）
    watch(isPlaying, (playing) => {
        if (autoSaveTimer) {
            clearInterval(autoSaveTimer)
            autoSaveTimer = null
        }
        if (playing) {
            autoSaveTimer = setInterval(() => savePlayerState(), 15000)
        } else {
            // 暂停时保存一次，确保进度不丢失
            savePlayerState()
        }
    })

    const setAudioVolume = (val) => {
        volume.value = val
        if (audio.value) audio.value.volume = val
    }

    watch(volume, (val) => {
        if (audio.value) audio.value.volume = val
    })

    const playGlobalSong = (song) => {
        if (!song) return
        if (audio.value) {
            audio.value.pause()
            audio.value.onloadedmetadata = null
            audio.value.ontimeupdate = null
            audio.value.onended = null
            audio.value = null
        }
        currentTime.value = 0
        duration.value = 0
        lastRecordPath.value = ''
        lastCountedSong.value = ''
        lastTickTime.value = 0
        accListenTime.value = 0
        songCounted.value = false
        currentSong.value = song

        audio.value = new Audio(song.playUrl || song.path)
        audio.value.volume = volume.value

        audio.value.onloadedmetadata = () => {
            duration.value = audio.value.duration || 0
            syncMediaMetadata()
            syncMediaState()
        }
        audio.value.ontimeupdate = () => {
            currentTime.value = audio.value.currentTime || 0
            syncMediaState()
        }
        audio.value.onended = () => {
            isPlaying.value = false
            currentTime.value = 0
            syncMediaState()
            autoNextSong()
        }
        audio.value.play().catch(() => {})
        isPlaying.value = true
        syncMediaMetadata()
        syncMediaState()
        initMediaControls()
    }

    const setPlayList = (list) => {
        playList.value = Array.isArray(list) ? [...list] : []
        if (playMode.value === 'random') regenerateShuffle()
    }

    const playSongInList = (song) => {
        if (!song || !playList.value.length) return
        const idx = playList.value.findIndex(s =>
            (s.id && song.id && s.id === song.id) || (s.path && song.path && s.path === song.path)
        )
        if (idx !== -1) playGlobalSong(song)
    }

    const togglePlay = () => {
        if (!audio.value || !currentSong.value) return
        if (isPlaying.value) {
            audio.value.pause()
        }
        else audio.value.play().catch(() => {})
        isPlaying.value = !isPlaying.value
        syncMediaState()
    }

    const getCurrentSongIndex = () => {
        if (!currentSong.value || !playList.value.length) return -1
        const key = getSongKey(currentSong.value)
        let idx = playList.value.findIndex(x => getSongKey(x) === key)
        if (idx === -1) idx = playList.value.findIndex(x => x.name === currentSong.value.name && x.singer === currentSong.value.singer)
        return idx
    }

    const nextSong = () => {
        const idx = getCurrentSongIndex()
        if (idx === -1) return
        let next
        if (playMode.value === 'random') {
            if (shuffleOrder.value.length === 0 || shufflePos < 0) {
                regenerateShuffle()
            } else {
                shufflePos++
                if (shufflePos >= shuffleOrder.value.length) {
                    regenerateShuffle()
                }
            }
            next = shuffleOrder.value[shufflePos]
        } else {
            next = (idx + 1) % playList.value.length
        }
        playGlobalSong(playList.value[next])
    }

    const prevSong = () => {
        const idx = getCurrentSongIndex()
        if (idx === -1) return
        let prev
        if (playMode.value === 'random') {
            if (shufflePos > 0) {
                shufflePos--
                prev = shuffleOrder.value[shufflePos]
            } else {
                prev = idx
            }
        } else {
            prev = (idx - 1 + playList.value.length) % playList.value.length
        }
        playGlobalSong(playList.value[prev])
    }

    const autoNextSong = () => {
        if (playMode.value === 'single') return
        if (playMode.value === 'singleLoop') playGlobalSong(currentSong.value)
        else nextSong()
    }

    const toggleMode = () => {
        const modes = ['list', 'listLoop', 'singleLoop', 'single', 'random']
        const i = modes.indexOf(playMode.value)
        playMode.value = modes[(i + 1) % modes.length]
        modeIcon.value = modeMap[playMode.value]
        localStorage.setItem('rhizome-play-mode', playMode.value)
        if (playMode.value === 'random') regenerateShuffle()
    }

    const seekTo = (time) => {
        if (audio.value) {
            audio.value.currentTime = time
            currentTime.value = time
            syncMediaState()
        }
    }

    return {
        currentSong, isPlaying, currentTime, duration,
        playList, playMode, modeIcon, audio, volume,
        setAudioVolume,
        setPlayList, playSongInList, playGlobalSong,
        togglePlay, nextSong, prevSong, toggleMode, seekTo,
        savePlayerState,
    }
})
