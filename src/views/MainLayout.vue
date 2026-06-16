<template>
  <div class="rc-main-container" :class="[themeClass]">
    <div class="rc-title-bar">
      <h2>Rhizome · 音乐播放器</h2>
      <div class="rc-window-controls">
        <button class="rc-window-btn rc-btn-minimize" @click="minimize">─</button>
        <button class="rc-window-btn rc-btn-maximize" @click="maximize">{{ isMaximized ? '❐' : '□' }}</button>
        <button class="rc-window-btn rc-btn-close" @click="closeWindow">×</button>
      </div>
    </div>

    <div class="rc-content-page">
      <div class="page-scroller">
        <router-view/>
      </div>

      <GlobalPlayer
          :current-song="playerStore.currentSong"
          :is-playing="playerStore.isPlaying"
          :current-time="playerStore.currentTime"
          :duration="playerStore.duration"
          :play-mode="playerStore.playMode"
          :volume="volume"
          :desktop-lyrics-visible="desktopLyricsVisible"
          :desktop-lyrics-locked="desktopLyricsLocked"
          @prev="playerStore.prevSong"
          @next="playerStore.nextSong"
          @toggle-play="playerStore.togglePlay"
          @seek="onSeek"
          @toggle-mode="playerStore.toggleMode"
          @open-playlist="openPlaylist = true"
          @go-to-detail="goToSongDetail"
          @update:volume="onVolumeUpdate"
          @toggle-desktop-lyrics="onToggleDesktopLyrics"
          @toggle-lyric-lock="onToggleLyricLock"
      />
    </div>

    <SelectModal
        v-model:visible="openPlaylist"
        :title="'播放列表'"
        :items="playerStore.playList"
        :model-value="currentPlaylistSong"
        :show-count="true"
        :show-index="true"
        :searchable="true"
        :title-field="'name'"
        :subtitle-field="'singer'"
        :extra-field="'duration'"
        :is-active-fn="isCurrentPlaylistSong"
        @select="onPlaylistSelect"
    />
  </div>
</template>

<script setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import {useGlobalTheme} from '@/composables/useGlobalTheme'
import {usePlayerStore} from '@/stores/playerStore'
import {useLocalMusicStore} from '@/stores/localMusicStore'
import {useShortcuts} from '@/composables/useShortcuts'

import GlobalPlayer from '@/components/player/GlobalPlayer.vue'
import SelectModal from '@/components/common/SelectModal.vue'

const router = useRouter()
const route = useRoute()
const { themeClass } = useGlobalTheme()
const playerStore = usePlayerStore()
const openPlaylist = ref(false)
const isMaximized = ref(false)

// ========== 桌面歌词状态 ==========
const desktopLyricsVisible = ref(localStorage.getItem('rhizome-desktop-lyrics-visible') === 'true')
const desktopLyricsLocked = ref(false)  // 初始值，onMounted 中异步校正

const volume = ref(1.0)

const minimize = () => window.electron?.minimize()
const maximize = () => window.electron?.maximize()
const closeWindow = () => {
  playerStore.savePlayerState()
  window.electron?.close()
}

const onSeek = (value) => {
  playerStore.seekTo(value)
}

const onVolumeUpdate = (val) => {
  volume.value = val
  playerStore.setAudioVolume(val)
}

// ========== 桌面歌词：按钮事件 ==========
const onToggleDesktopLyrics = () => {
  desktopLyricsVisible.value = !desktopLyricsVisible.value
  localStorage.setItem('rhizome-desktop-lyrics-visible', desktopLyricsVisible.value.toString())
  if (desktopLyricsVisible.value) {
    window.electron?.showDesktopLyrics?.()
    // 立即发送当前歌词状态并启动RAF
    sendLyricsTiming()
    if (playerStore.isPlaying) {
      startSyncTimer()
    }
  } else {
    window.electron?.hideDesktopLyrics?.()
    stopSyncTimer()
  }
}

const onToggleLyricLock = () => {
  desktopLyricsLocked.value = !desktopLyricsLocked.value
  localStorage.setItem('rhizome-desktop-lyrics-locked', desktopLyricsLocked.value.toString())
  window.electron?.setDesktopLyricsLock?.(desktopLyricsLocked.value)
}

// ========== 桌面歌词：推送（发送行时间信息，歌词窗口本地插值） ==========
let lastLyricIdx = -1

function getLyricsArray() {
  const song = playerStore.currentSong
  if (!song) return []
  // 优先使用预解析的同步歌词
  if (song.syncedLyrics?.length) return song.syncedLyrics
  // 兼容原始 LRC 字符串数组（重启恢复后的 song.lyrics 是字符串）
  const raw = song.lyrics || []
  if (!raw.length) return []
  // 如果第一个元素有 time 属性，说明已经解析过
  if (typeof raw[0] === 'object' && 'time' in raw[0]) return raw
  // 字符串格式 → 当场解析为 {time, text}
  const parsed = []
  raw.forEach(line => {
    const match = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/)
    if (match) {
      parsed.push({ time: Number(match[1]) * 60 + Number(match[2]), text: match[3].trim() })
    }
  })
  parsed.sort((a, b) => a.time - b.time)
  return parsed
}

function getCurrentLineInfo() {
  const list = getLyricsArray()
  if (!list.length) return null
  const now = playerStore.currentTime
  let idx = 0
  for (let i = 0; i < list.length; i++) { if (list[i].time <= now) idx = i }
  const line = list[idx]
  const start = line.time
  const end = idx + 1 < list.length ? list[idx + 1].time : (playerStore.duration || start + 5)
  const elapsed = Math.max(0, now - start)
  return { idx, text: line.text || '', start, end, elapsed }
}

function sendLyricsTiming(forcePaused) {
  if (!desktopLyricsVisible.value) return
  const info = getCurrentLineInfo()
  const isPlaying = playerStore.isPlaying && !forcePaused
  if (!info) {
    // 无歌词时发送占位文本
    window.electron?.updateDesktopLyrics?.({
      text: '',
      lineStartTime: 0, lineEndTime: 1, elapsed: 0,
      paused: true,
      themeClass: themeClass.value,
      fontSize: Number(localStorage.getItem('rhizome-lyric-size') || 14),
      align: localStorage.getItem('rhizome-lyric-align') || 'center',
    })
    lastLyricIdx = -1
    return
  }

  const fontSize = Number(localStorage.getItem('rhizome-lyric-size') || 14)
  const align = localStorage.getItem('rhizome-lyric-align') || 'center'
  const data = {
    text: info.text,
    lineStartTime: info.start,
    lineEndTime: info.end,
    elapsed: info.elapsed,
    paused: !isPlaying,
    themeClass: themeClass.value,
    fontSize,
    align,
  }

  // 仅在行索引变化或播放状态切换时发送
  if (info.idx !== lastLyricIdx || forcePaused !== undefined) {
    lastLyricIdx = info.idx
    window.electron?.updateDesktopLyrics?.(data)
  }

  // 播放中且行未变时，周期性同步（每 2 秒纠正漂移）
  if (isPlaying && info.idx === lastLyricIdx) {
    // 不发送，让本地插值运行。但首次/切歌必须发。
  }
}

// 周期性同步定时器（防止时钟漂移）
let syncTimer = null
function startSyncTimer() {
  stopSyncTimer()
  syncTimer = setInterval(() => {
    if (desktopLyricsVisible.value && playerStore.isPlaying) {
      sendLyricsTiming()
    }
  }, 2000)
}
function stopSyncTimer() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null }
}

// 行变化检测
watch(() => playerStore.currentTime, () => {
  if (!desktopLyricsVisible.value || !playerStore.isPlaying) return
  const list = getLyricsArray()
  if (!list.length) return
  const now = playerStore.currentTime
  let idx = 0
  for (let i = 0; i < list.length; i++) { if (list[i].time <= now) idx = i }
  if (idx !== lastLyricIdx) {
    sendLyricsTiming()
  }
})

// 启停控制
watch(() => playerStore.isPlaying, (playing) => {
  if (!desktopLyricsVisible.value) return
  if (playing) {
    sendLyricsTiming()  // 恢复播放，发送当前行时间基准
    startSyncTimer()
  } else {
    sendLyricsTiming(true)  // 暂停，elapsed 冻结
    stopSyncTimer()
  }
})

// 切歌
watch(() => playerStore.currentSong, () => {
  if (!desktopLyricsVisible.value) return
  lastLyricIdx = -1
  sendLyricsTiming(!playerStore.isPlaying)
  if (playerStore.isPlaying) startSyncTimer()
})

// 主题切换
watch(themeClass, () => {
  if (desktopLyricsVisible.value) sendLyricsTiming(!playerStore.isPlaying)
})

useShortcuts({
  togglePlay: () => playerStore.togglePlay(),
  prevSong:   () => playerStore.prevSong(),
  nextSong:   () => playerStore.nextSong(),
  volUp:      () => {
    volume.value = Math.min(1, volume.value + 0.05)
    playerStore.setAudioVolume(volume.value)
  },
  volDown:    () => {
    volume.value = Math.max(0, volume.value - 0.05)
    playerStore.setAudioVolume(volume.value)
  },
})

onMounted(() => {
  // 恢复歌词字号
  const savedSize = localStorage.getItem('rhizome-lyric-size') || '14'
  document.documentElement.style.setProperty('--lyric-font-size', savedSize + 'px')

  const saved = localStorage.getItem('rhizome-volume')
  if (saved !== null) {
    volume.value = Number(saved)
    playerStore.setAudioVolume(volume.value)
  }

  // 音频设备变更：新设备自动切换，当前设备断开暂停，其他设备断开忽略
  let knownAudioDevices = new Set()
  const refreshAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioOut = devices.filter(d => d.kind === 'audiooutput' && d.deviceId)
      const currentIds = new Set(audioOut.map(d => d.deviceId))
      // 检测新增设备 → 切换
      for (const id of currentIds) {
        if (!knownAudioDevices.has(id) && knownAudioDevices.size > 0) {
          const audio = playerStore.audio
          if (audio?.setSinkId) {
            audio.setSinkId(id).catch(() => {})
          }
        }
      }
      // 检测设备断开 → 若为当前使用设备则暂停
      if (knownAudioDevices.size > 0) {
        for (const id of knownAudioDevices) {
          if (!currentIds.has(id)) {
            const audio = playerStore.audio
            const curSink = audio?.sinkId || ''
            if (curSink === id || (!curSink && id === [...knownAudioDevices][0])) {
              if (playerStore.isPlaying) playerStore.togglePlay()
            }
          }
        }
      }
      knownAudioDevices = currentIds
    } catch {}
  }
  navigator.mediaDevices?.addEventListener?.('devicechange', refreshAudioDevices)
  refreshAudioDevices()

  // 拖拽文件/文件夹导入

  // 窗口最大化状态同步
  if (window.electron?.onWindowMaximized) {
    window.electron.onWindowMaximized((state) => { isMaximized.value = state })
  }

  // 恢复桌面歌词状态 —— 等 splash 结束后再显示
  const restoreDesktopLyrics = () => {
    if (!desktopLyricsVisible.value) return
    window.electron?.showDesktopLyrics?.()
    if (desktopLyricsLocked.value) {
      window.electron?.setDesktopLyricsLock?.(true)
    }
    sendLyricsTiming(!playerStore.isPlaying)
    if (playerStore.isPlaying) startSyncTimer()
  }
  // 从文件同步锁定状态（优先级高于 localStorage）
  window.electron?.getDesktopLyricsLock?.().then(locked => {
    if (locked !== null && locked !== undefined) {
      desktopLyricsLocked.value = !!locked
      localStorage.setItem('rhizome-desktop-lyrics-locked', String(!!locked))
    } else {
      // IPC 不可用时回退 localStorage
      desktopLyricsLocked.value = localStorage.getItem('rhizome-desktop-lyrics-locked') === 'true'
    }
  }).finally(() => {
    // 无论是否读到文件，都要继续恢复流程
    const splash = document.getElementById('rhizome-splash')
    if (!splash || splash.classList.contains('hidden')) {
      restoreDesktopLyrics()
    } else {
      window.addEventListener('splash-done', restoreDesktopLyrics, { once: true })
    }
  })

  // 关闭/刷新时保存播放状态
  window.addEventListener('beforeunload', () => playerStore.savePlayerState?.())

  // 恢复上次播放状态
  const savedState = localStorage.getItem('rhizome-player-state')
  if (savedState && !playerStore.currentSong) {
    try {
      const state = JSON.parse(savedState)
      if (!state.songPath) throw 0
      const localStore = useLocalMusicStore()
      const restoreSong = () => {
        const song = localStore.songList.find(s => s.path === state.songPath)
        if (!song) return
        // 恢复歌单和播放模式
        if (state.playlistPaths?.length) {
          const list = state.playlistPaths
            .map(p => localStore.songList.find(s => s.path === p))
            .filter(Boolean)
          if (list.length) playerStore.setPlayList(list)
        }
        if (state.playMode) playerStore.playMode = state.playMode
        // 设置歌曲但不播放
        playerStore.currentSong = song
        playerStore.currentTime = state.currentTime || 0
        playerStore.duration = song.duration || 0
        playerStore.isPlaying = false
        playerStore.setAudioVolume(state.volume ?? 1)
        // 创建 audio 但不播放
        if (!playerStore.audio) {
          const a = new Audio(song.playUrl || song.path)
          a.volume = state.volume ?? 1
          a.currentTime = state.currentTime || 0
          a.ontimeupdate = () => { playerStore.currentTime = a.currentTime || 0 }
          a.onended = () => { playerStore.isPlaying = false; playerStore.currentTime = 0 }
          playerStore.audio = a
        }
      }
      if (localStore.loaded) restoreSong()
      else {
        const unwatch = watch(() => localStore.loaded, (v) => { if (v) { restoreSong(); unwatch() } })
      }
    } catch {}
  }
})

onUnmounted(() => {
  stopSyncTimer()
})

watch(volume, (val) => {
  localStorage.setItem('rhizome-volume', val.toString())
})

const currentPlaylistSong = computed(() => playerStore.currentSong)

const isCurrentPlaylistSong = (item, selectedValue) => {
  if (!selectedValue) return false
  if (item.id && selectedValue.id) return item.id === selectedValue.id
  return item.path === selectedValue.path
}

const onPlaylistSelect = (song) => {
  playerStore.playSongInList(song)
}

const goToSongDetail = () => {
  if (!playerStore.currentSong) return
  if (route.path === '/player/detail') router.back()
  else router.push('/player/detail')
}
</script>

<style scoped>
.rc-main-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.rc-title-bar {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  -webkit-app-region: drag;
  background: var(--bg-primary);
  border-bottom: 2px solid var(--border-color);
}

.rc-title-bar h2 {
  margin: 0;
  font-size: 13px;
}

.rc-window-controls {
  position: absolute;
  right: 0;
  top: 0;
  display: flex;
  height: 32px;
  -webkit-app-region: no-drag;
}

.rc-window-btn {
  width: 32px;
  height: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
}

.rc-btn-minimize:hover,
.rc-btn-maximize:hover,
.rc-btn-close:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}

.rc-content-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.page-scroller {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.page-scroller::-webkit-scrollbar {
  display: none;
}
</style>
