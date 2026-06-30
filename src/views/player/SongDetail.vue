<template>
  <div class="song-detail" :class="[themeClass]">
    <div class="detail-container" :class="{ entered, switching }">
      <div class="detail-header">
        <div class="song-info">
          <h1 class="song-title">{{ currentSong.name }}</h1>
          <p class="song-artist">{{ currentSong.singer }}</p>
        </div>
      </div>

      <div class="detail-main">
        <div class="album-section">
          <div class="album-cover" @click="goBack" title="点击返回">
            <img v-if="currentSong.coverUrl" :src="currentSong.coverUrl" alt="cover"/>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" stroke-width="2"/>
            </svg>
          </div>

          <div class="player-controls">
            <button class="control-btn" @click="playerStore.prevSong">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M19 20L9 12 19 4v16z" stroke-width="2"/>
              </svg>
            </button>
            <button class="control-btn play-btn" @click="playerStore.togglePlay">
              <svg v-if="!playerStore.isPlaying" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="6" y="4" width="4" height="16" stroke-width="2"/>
                <rect x="14" y="4" width="4" height="16" stroke-width="2"/>
              </svg>
            </button>
            <button class="control-btn" @click="playerStore.nextSong">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 4l10 8-10 8V4z" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <div class="progress-section">
            <span class="time">{{ formatTime(playerStore.currentTime) }}</span>
            <div
                class="progress-bar-container"
                @wheel.prevent="onDetailWheel"
                @mousemove="onDetailMouseMove"
                @mouseenter="detailHovering = true"
                @mouseleave="detailHovering = false"
            >
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: progress + '%' }"></div>
                <input
                    type="range"
                    class="progress-input"
                    min="0"
                    max="100"
                    :value="progress"
                    @input="onProgressChange"
                />
              </div>
              <span class="sd-seek-label" v-show="detailHovering" :style="{ left: detailHoverPercent * 100 + '%' }">{{ detailSeekLabel }}</span>
            </div>
            <span class="time">{{ formatTime(playerStore.duration) }}</span>
          </div>

          <div class="song-stats" v-if="currentSong.path">
            <span class="play-count">{{ playCount }} 次播放</span>
            <span class="play-time">{{ totalPlayTime }}</span>
          </div>
          <div class="song-meta" v-if="currentSong.album || currentSong.genre || currentSong.codec || currentSong.sampleRate">
            <span v-if="currentSong.album">{{ currentSong.album }}</span>
            <span v-if="currentSong.genre">{{ currentSong.genre }}</span>
            <span v-if="currentSong.codec">{{ currentSong.codec.toUpperCase() }}</span>
            <span v-if="currentSong.bitrate">{{ Math.round(currentSong.bitrate / 1000) }}kbps</span>
            <span v-if="currentSong.sampleRate">{{ (currentSong.sampleRate / 1000).toFixed(1) }}kHz</span>
            <span v-if="currentSong.channels">{{ currentSong.channels }}ch</span>
          </div>
          <canvas ref="spectrumCanvas" class="spectrum-canvas" v-show="playerStore.isPlaying && currentSong.path"></canvas>
        </div>

        <div class="lyrics-section">
          <div class="lyrics-frame" :style="{ '--border-progress': borderProgress }">
            <div class="lyrics-wrapper" ref="lyricsBox">
              <div class="lyrics-container">
              <p
                  v-for="(line, idx) in lyrics"
                  :key="idx"
                  :class="{ active: idx === currentLine }"
                  :style="idx === currentLine ? { '--lyric-progress': lyricProgress } : {}"
                  @click="clickToJump(line.time)"
              >
                <span>{{ line.text }}</span>
              </p>
              <p v-if="lyrics.length === 0" class="empty-lyrics">暂无歌词</p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { usePlayerStore } from '@/stores/playerStore'

const router = useRouter()
const { themeClass } = useGlobalTheme()
const playerStore = usePlayerStore()

const currentSong = ref({})
const lyrics = ref([])
const currentLine = ref(0)
const lyricsBox = ref(null)
const statsRefreshKey = ref(0)
const entered = ref(false)
const switching = ref(false)

onMounted(() => {
  if (!playerStore.currentSong) return router.back()
  currentSong.value = playerStore.currentSong
  parseLyrics()
  resetLyrics()
  requestAnimationFrame(() => { entered.value = true })
  updateLyricProgress()
})

watch(() => playerStore.currentSong, (val) => {
  if (val) {
    switching.value = true
    // 先播放覆盖动效，200ms 后再更新数据+展开
    setTimeout(() => {
      currentSong.value = val
      parseLyrics()
      resetLyrics()
      switching.value = false
    }, 200)
  }
}, { deep: true })

// ==============================================
// 歌词解析（优先使用预解析的时间戳数据）
// ==============================================
function parseLyrics() {
  const synced = currentSong.value.syncedLyrics
  let list = []
  if (synced && synced.length > 0 && synced.some(l => l.time > 0)) {
    list = synced
  } else {
    const raw = currentSong.value.lyrics || []
    raw.forEach(line => {
      const match = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/)
      if (match) {
        const time = Number(match[1]) * 60 + Number(match[2])
        list.push({ time, text: match[3].trim() })
      } else {
        list.push({ time: 999999, text: line })
      }
    })
    list.sort((a, b) => a.time - b.time)
  }
  // 合并相同时间戳的歌词（原词+翻译）
  const merged = []
  for (let i = 0; i < list.length; i++) {
    if (i > 0 && list[i].time === list[i - 1].time) {
      merged[merged.length - 1].text += '\n' + list[i].text
    } else {
      merged.push({ time: list[i].time, text: list[i].text })
    }
  }
  lyrics.value = merged
}

// ==============================================
// 重置：切歌回到第一行并居中
// ==============================================
function resetLyrics() {
  currentLine.value = 0
  nextTick(() => {
    if (lyricsBox.value) {
      lyricsBox.value.scrollTop = 0
    }
  })
}

const progress = computed(() => {
  if (!playerStore.duration) return 0
  return (playerStore.currentTime / playerStore.duration) * 100
})

const borderProgress = computed(() => {
  if (!playerStore.duration) return 0
  return Math.min(1, playerStore.currentTime / playerStore.duration)
})

const lyricProgress = ref(0)
let lyricRAF = null

function updateLyricProgress() {
  if (!playerStore.isPlaying) {
    lyricProgress.value = 0
  } else {
    const realTime = playerStore.audio?.currentTime || 0
    const list = lyrics.value
    const idx = currentLine.value
    if (idx >= 0 && idx < list.length) {
      const start = list[idx].time
      const end = idx + 1 < list.length
        ? list[idx + 1].time
        : (playerStore.duration || start + 5)
      if (end > start) {
        const p = (realTime - start) / (end - start)
        lyricProgress.value = Math.max(0, Math.min(1, p))
      }
    } else {
      lyricProgress.value = 0
    }
  }
  lyricRAF = requestAnimationFrame(updateLyricProgress)
}

function stopLyricRAF() {
  if (lyricRAF) { cancelAnimationFrame(lyricRAF); lyricRAF = null }
}

const playCount = computed(() => {
  void statsRefreshKey.value
  const p = currentSong.value?.path
  if (!p) return 0
  try {
    const map = JSON.parse(localStorage.getItem('playCountReal') || '{}')
    return map[p] || 0
  } catch { return 0 }
})

const totalPlayTime = computed(() => {
  const d = currentSong.value?.duration || 0
  const c = playCount.value
  const sec = d * c
  if (sec < 60) return sec + 's'
  if (sec < 3600) return Math.round(sec / 60) + 'min'
  return (sec / 3600).toFixed(1) + 'h'
})

// === 频谱可视化 ===
import { useSpectrumEngine } from '@/composables/useSpectrumEngine'

const spectrumCanvas = ref(null)
const engine = useSpectrumEngine()
let animId = null

function startDraw() {
  stopDraw()
  const analyser = engine.analyser()
  const canvas = spectrumCanvas.value
  if (!canvas || !analyser) return
  canvas.width = canvas.offsetWidth || 260
  canvas.height = 60
  const ctx = canvas.getContext('2d')
  const bufLen = analyser.frequencyBinCount
  const dataArr = new Uint8Array(bufLen)
  function draw() {
    animId = requestAnimationFrame(draw)
    analyser.getByteFrequencyData(dataArr)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const fill = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#fff'
    const barW = canvas.width / bufLen
    for (let i = 0; i < bufLen; i++) {
      const h = (dataArr[i] / 255) * canvas.height
      ctx.fillStyle = fill
      ctx.fillRect(i * barW, canvas.height - h, Math.max(barW - 1, 1), h)
    }
  }
  draw()
}

function stopDraw() {
  if (animId) { cancelAnimationFrame(animId); animId = null }
}

// 播放/暂停
watch(() => playerStore.isPlaying, (val) => {
  if (val) {
    engine.ensure()
    engine.resume()
    engine.connect(playerStore.audio)
    startDraw()
  } else {
    stopDraw()
  }
})

// 切歌
watch(() => playerStore.currentSong, (song) => {
  if (song && playerStore.isPlaying) {
    engine.connect(playerStore.audio)
    startDraw()
  }
})

onMounted(() => {
  if (playerStore.isPlaying) {
    engine.ensure()
    engine.connect(playerStore.audio)
    startDraw()
  }
})

onUnmounted(() => {
  stopDraw()
  stopLyricRAF()
})

// ==============================================
// 终极居中滚动（永远在正中间）
// ==============================================
let scrollTimer = null
function scrollToCenter() {
  clearTimeout(scrollTimer)
  scrollTimer = setTimeout(async () => {
    await nextTick()
    const box = lyricsBox.value
    const activeEl = box?.querySelector('.active')
    if (!box || !activeEl) return

    const boxHeight = box.clientHeight
    const elHeight = activeEl.offsetHeight
    const scrollTop = activeEl.offsetTop - (boxHeight - elHeight) / 2

    box.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    })
  }, 50)
}

// ==============================================
// 歌词自动跟随（不会乱跳）
// ==============================================
watch(() => playerStore.currentTime, (now) => {
  const list = lyrics.value
  if (!list.length) return
  if (list.every(l => l.time >= 999999)) { currentLine.value = -1; return }
  if (now < 0.1) { currentLine.value = 0; return }
  let idx = 0
  for (let i = 0; i < list.length; i++) { if (list[i].time <= now) idx = i }
  currentLine.value = idx
}, { flush: 'post' })

watch(() => currentLine.value, () => {
  scrollToCenter()
}, { flush: 'post' })

// 歌曲结束时刷新播放次数与时间
watch(
  () => ({ t: playerStore.currentTime, playing: playerStore.isPlaying }),
  (now, prev) => {
    if (prev?.playing && !now.playing && now.t === 0) {
      statsRefreshKey.value++
    }
  },
  { deep: true }
)
watch(() => playerStore.currentSong, () => {
  statsRefreshKey.value++
})

// ==============================================
// 点击歌词正常跳转
// ==============================================
function clickToJump(time) {
  if (!time || time <= 0) return
  if (time > playerStore.duration) return
  playerStore.seekTo(time)
}

const onProgressChange = (e) => {
  const percent = e.target.value / 100
  playerStore.seekTo(percent * playerStore.duration)
}

const detailHovering = ref(false)
const detailHoverPercent = ref(0)

const detailSeekLabel = computed(() => {
  if (!playerStore.duration) return '00:00'
  return formatTime(detailHoverPercent.value * playerStore.duration)
})

const onDetailMouseMove = (e) => {
  const rect = e.currentTarget.querySelector('.progress-track').getBoundingClientRect()
  detailHoverPercent.value = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
}

const onDetailWheel = (e) => {
  const delta = e.deltaY > 0 ? -2 : 2
  const newTime = Math.max(0, Math.min(playerStore.duration, playerStore.currentTime + delta))
  playerStore.seekTo(newTime)
}

const formatTime = (s) => {
  if (!s) return '00:00'
  const m = Math.floor(s / 60)
  const sc = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`
}

const goBack = () => router.back()
</script>

<style scoped>
.theme-white {
  --bg: #fff;
  --text: #000;
  --border: #000;
  --btn: #f8f8f8;
  --btn-hover: #000;
  --btn-text: #fff;
  --light: #f5f5f5;
  --progress-bg: #e0e0e0;
  --tooltip-bg: #000;
  --tooltip-text: #fff;
}
.theme-dark {
  --bg: #2c2c2c;
  --text: #fff;
  --border: #fff;
  --btn: #292929;
  --btn-hover: #fff;
  --btn-text: #000;
  --light: #333;
  --progress-bg: #4a4a4a;
  --tooltip-bg: #fff;
  --tooltip-text: #000;
}

.song-detail {
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}

.detail-container {
  padding: 40px 20px 20px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 12px;
  border-left: 2px solid transparent;
  padding-left: 12px;
  margin-bottom: 20px;
  overflow: hidden;
  position: relative;
  opacity: 0;
  transform: translateY(-12px);
  transition: opacity 0.2s cubic-bezier(0.2, 0, 0.2, 1) 0.06s,
              transform 0.2s cubic-bezier(0.2, 0, 0.2, 1) 0.06s;
}
/* 竖线动效 */
.detail-header::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 2px; height: 100%;
  background: var(--border);
  transform: scaleY(0);
  transition: transform 0.25s cubic-bezier(0.25, 0, 0, 1) 0.04s;
}
.entered .detail-header::before { transform: scaleY(1); }
.entered .detail-header {
  opacity: 1;
  transform: translateY(0);
}
.detail-header .song-title {
  letter-spacing: 4px;
  transition: letter-spacing 0.25s cubic-bezier(0.2, 0, 0.2, 1) 0.06s;
}
.entered .detail-header .song-title {
  letter-spacing: 0;
}

/* 切歌动效：从竖线向右拓展色条覆盖，再退回 */
.detail-header {
  position: relative;
}
.detail-header::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--border);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.16s cubic-bezier(0.5, 0, 0.3, 1);
  z-index: 2;
  pointer-events: none;
}
.switching .detail-header::after {
  transform: scaleX(1);
}

.song-info {
  flex: 1;
}

.song-title {
  font-size: 22px;
  margin: 0 0 4px 0;
}

.song-artist {
  font-size: 13px;
  opacity: .7;
  margin: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 2px solid var(--border);
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
  padding: 4px 10px;
  transition: all .2s;
}

.back-btn svg {
  width: 14px;
  height: 14px;
}

.back-btn:hover {
  background: var(--btn-hover);
  color: var(--btn-text);
  transform: translateY(-1px);
}

.detail-main {
  display: flex;
  gap: 30px;
  margin-bottom: 16px;
  align-items: flex-start;
}

.album-section {
  flex: 0 0 260px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-self: stretch;
}

.album-cover {
  width: 100%;
  aspect-ratio: 1 / 1;
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--btn);
  cursor: pointer;
  opacity: 0;
  transform: translateX(-40px);
  clip-path: inset(0 0 0 0);
  transition: opacity 0.22s cubic-bezier(0.2, 0, 0.2, 1),
              transform 0.22s cubic-bezier(0.2, 0, 0.2, 1),
              clip-path 0.2s cubic-bezier(0.25, 0, 0, 1);
}
.entered .album-cover {
  opacity: 1;
  transform: translateX(0);
}
.switching .album-cover {
  clip-path: inset(50% 50% 50% 50%);
}

.album-cover:hover {
  transform: scale(1.02);
  border-color: var(--btn-hover);
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-cover svg {
  width: 80px;
  height: 80px;
  stroke: currentColor;
}

.player-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
}

.control-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border: 2px solid var(--border);
  background: var(--btn);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: scaleX(0);
  transition: opacity 0.12s ease,
              transform 0.15s cubic-bezier(0.25, 0, 0, 1),
              background 0.2s,
              color 0.2s;
}
.player-controls .control-btn:nth-child(1) { transition-delay: 0.16s; }
.player-controls .control-btn:nth-child(2) { transition-delay: 0.2s; }
.player-controls .control-btn:nth-child(3) { transition-delay: 0.24s; }
.entered .player-controls .control-btn {
  opacity: 1;
  transform: scaleX(1);
  transition-delay: 0s;
}

.control-btn svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
}

.control-btn:hover {
  background: var(--btn-hover);
  color: var(--btn-text);
  transform: scale(1.05);
}

.play-btn {
  width: 36px;
  height: 36px;
}

.progress-section {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.18s ease 0.28s;
}
.entered .progress-section {
  opacity: 1;
}

.time {
  font-size: 11px;
  font-family: monospace;
  opacity: .7;
  min-width: 40px;
}

.progress-bar-container {
  flex: 1;
  position: relative;
  cursor: pointer;
  transform: scaleX(0);
  transition: transform 0.2s cubic-bezier(0.25, 0, 0.25, 1) 0.28s;
}
.entered .progress-bar-container {
  transform: scaleX(1);
}

.progress-track {
  position: relative;
  height: 4px;
  background: var(--progress-bg);
  border: 1px solid var(--border);
  overflow: hidden;
}

/* 切歌进度条脉冲 */
.progress-track::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--border);
  opacity: 0;
  pointer-events: none;
  z-index: 1;
}
.switching .progress-track::after {
  animation: sd-progress-pulse 0.35s ease-out;
}
@keyframes sd-progress-pulse {
  0% { opacity: 0; }
  30% { opacity: 0.5; }
  100% { opacity: 0; }
}
@keyframes sd-info-blink {
  0% { opacity: 1; }
  12% { opacity: 0.2; }
  25% { opacity: 1; }
  40% { opacity: 0.2; }
  55% { opacity: 1; }
  70% { opacity: 0.2; }
  85% { opacity: 1; }
  100% { opacity: 1; }
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: var(--border);
  width: 0%;
  pointer-events: none;
  transition: width 0.1s linear;
}

.progress-input {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}

.progress-bar-container:hover .progress-track {
  height: 6px;
  transition: height 0.2s;
}

.progress-bar-container:hover .progress-fill {
  background: var(--btn-hover-bg);
}

.sd-seek-label {
  position: absolute;
  bottom: calc(100% + 4px);
  transform: translateX(-50%);
  font-size: 11px;
  font-family: monospace;
  color: var(--text);
  background: var(--btn);
  border: 1px solid var(--border);
  padding: 2px 6px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 9999;
}

.song-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11px;
  opacity: .5;
}

.song-meta span {
  padding: 2px 6px;
  border: 1px solid var(--border);
  opacity: 0;
  transition: opacity 0.12s ease;
}
.switching .song-meta span {
  animation: sd-info-blink 0.36s ease-out;
}
.entered .song-meta span {
  opacity: 1;
}
.song-meta span:nth-child(1) { transition-delay: 0.36s; }
.song-meta span:nth-child(2) { transition-delay: 0.39s; }
.song-meta span:nth-child(3) { transition-delay: 0.42s; }
.song-meta span:nth-child(4) { transition-delay: 0.45s; }
.song-meta span:nth-child(5) { transition-delay: 0.48s; }
.song-meta span:nth-child(6) { transition-delay: 0.51s; }

.spectrum-canvas {
  width: 100%;
  height: 60px;
  margin-top: auto;
  flex-shrink: 0;
}

.song-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid var(--border);
  background: var(--btn);
  margin-bottom: 4px;
  opacity: 0;
  transform: translateX(6px);
  transition: opacity 0.18s ease 0.32s,
              transform 0.18s cubic-bezier(0.2, 0, 0.2, 1) 0.32s;
}
.switching .song-stats {
  animation: sd-info-blink 0.4s ease-out;
}
.entered .song-stats {
  opacity: 1;
  transform: translateX(0);
}

.play-count {
  font-size: 10px;
  opacity: 0.7;
}

.play-time {
  font-size: 10px;
  opacity: 0.55;
  font-family: monospace;
}

.lyrics-section {
  flex: 1;
  min-width: 0;
  opacity: 0;
  transition: opacity 0.15s ease 0.3s;
}
.entered .lyrics-section {
  opacity: 1;
}

/* 外层固定四角边框 */
.lyrics-frame {
  height: calc(100vh - 260px);
  min-height: 200px;
  position: relative;
  border: 2px solid transparent;
  opacity: 0;
  transform: translateX(-30px);
  transition: opacity 0.22s cubic-bezier(0.2, 0, 0.2, 1) 0.3s,
              transform 0.22s cubic-bezier(0.2, 0, 0.2, 1) 0.3s;
}
.entered .lyrics-frame {
  opacity: 1;
  transform: translateX(0);
}
/* 切歌时透明闪烁 */
.switching .lyrics-frame {
  animation: lyrics-blink 0.4s ease-out;
}
@keyframes lyrics-blink {
  0% { opacity: 1; }
  12% { opacity: 0.08; }
  25% { opacity: 1; }
  40% { opacity: 0.08; }
  55% { opacity: 1; }
  70% { opacity: 0.08; }
  85% { opacity: 1; }
  100% { opacity: 1; }
}

/* 播放进度边框：每条边从中点向两端生长 */
.lyrics-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  --p: var(--border-progress, 0);
  background:
    /* top */
    linear-gradient(to right,
      transparent calc((1 - var(--p)) * 50%),
      var(--border) 0,
      var(--border) calc((1 + var(--p)) * 50%),
      transparent 0
    ) top / 100% 2px no-repeat,
    /* bottom */
    linear-gradient(to right,
      transparent calc((1 - var(--p)) * 50%),
      var(--border) 0,
      var(--border) calc((1 + var(--p)) * 50%),
      transparent 0
    ) bottom / 100% 2px no-repeat,
    /* left */
    linear-gradient(to bottom,
      transparent calc((1 - var(--p)) * 50%),
      var(--border) 0,
      var(--border) calc((1 + var(--p)) * 50%),
      transparent 0
    ) left / 2px 100% no-repeat,
    /* right */
    linear-gradient(to bottom,
      transparent calc((1 - var(--p)) * 50%),
      var(--border) 0,
      var(--border) calc((1 + var(--p)) * 50%),
      transparent 0
    ) right / 2px 100% no-repeat;
}
.lyrics-frame::after {
  content: '';
  position: absolute;
  inset: -2px;
  pointer-events: none;
  background:
    linear-gradient(to right, var(--border) 18px, transparent 0) left top / 100% 2px no-repeat,
    linear-gradient(to bottom, var(--border) 18px, transparent 0) left top / 2px 100% no-repeat,
    linear-gradient(to left, var(--border) 18px, transparent 0) right top / 100% 2px no-repeat,
    linear-gradient(to bottom, var(--border) 18px, transparent 0) right top / 2px 100% no-repeat,
    linear-gradient(to right, var(--border) 18px, transparent 0) left bottom / 100% 2px no-repeat,
    linear-gradient(to top, var(--border) 18px, transparent 0) left bottom / 2px 100% no-repeat,
    linear-gradient(to left, var(--border) 18px, transparent 0) right bottom / 100% 2px no-repeat,
    linear-gradient(to top, var(--border) 18px, transparent 0) right bottom / 2px 100% no-repeat;
}

/* 内层滚动 */
.lyrics-wrapper {
  height: 100%;
  overflow-y: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.lyrics-wrapper::-webkit-scrollbar {
  display: none;
}

.lyrics-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: calc((100vh - 280px) / 2) 24px;
  overflow-x: hidden;
}

/* ---------- 单行基础 ---------- */
.lyrics-container p {
  font-size: var(--lyric-font-size, 14px);
  line-height: 1.4;
  text-align: center;
  margin: 0;
  padding: 6px 64px;
  transition: all 0.2s;
  opacity: 0.5;
  cursor: pointer;
  transform: scale(0.95);
  position: relative;
  overflow: visible;
  white-space: pre-line;
}

/* ---------- 反色背景 ::before — scaleX 从中心扩散 ---------- */
.lyrics-container p::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--btn-hover-bg);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.28s cubic-bezier(0.25, 0, 0, 1);
}

/* ---------- 取景框四角 + 顶边刻度 ::after ---------- */
.lyrics-container p::after {
  content: '';
  position: absolute;
  inset: -4px;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.2s, transform 0.28s cubic-bezier(0.25, 0, 0, 1);
  background:
    /* top-left L */
    linear-gradient(to right, var(--border) 10px, transparent 0) 0 0 / 100% 2px no-repeat,
    linear-gradient(to bottom, var(--border) 10px, transparent 0) 0 0 / 2px 100% no-repeat,
    /* top-right L */
    linear-gradient(to left, var(--border) 10px, transparent 0) 100% 0 / 100% 2px no-repeat,
    linear-gradient(to bottom, var(--border) 10px, transparent 0) 100% 0 / 2px 100% no-repeat,
    /* bottom-left L */
    linear-gradient(to right, var(--border) 10px, transparent 0) 0 100% / 100% 2px no-repeat,
    linear-gradient(to top, var(--border) 10px, transparent 0) 0 100% / 2px 100% no-repeat,
    /* bottom-right L */
    linear-gradient(to left, var(--border) 10px, transparent 0) 100% 100% / 100% 2px no-repeat,
    linear-gradient(to top, var(--border) 10px, transparent 0) 100% 100% / 2px 100% no-repeat;
}

/* ---------- 左右消逝线 ---------- */

.lyrics-container p span::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 50%;
  width: 48px;
  height: 2px;
  background: var(--btn-hover-text);
  transform: translateY(-50%) scaleX(calc(1 - var(--lyric-progress, 0)));
  transform-origin: right center;
  transition: transform 0.2s linear;
  opacity: 0;
}

.lyrics-container p span::after {
  content: '';
  position: absolute;
  right: 12px;
  top: 50%;
  width: 48px;
  height: 2px;
  background: var(--btn-hover-text);
  transform: translateY(-50%) scaleX(calc(1 - var(--lyric-progress, 0)));
  transform-origin: left center;
  transition: transform 0.2s linear;
  opacity: 0;
}

/* ============================================= */
/*               ACTIVE LINE                       */
/* ============================================= */

.lyrics-container p.active {
  opacity: 1;
  font-size: calc(var(--lyric-font-size, 14px) + 1px);
  font-weight: 600;
  color: var(--btn-hover-text);
  transform: scale(1.02);
}

/* 背景从中心扩散到位 */
.lyrics-container p.active::before {
  transform: scaleX(1);
}

/* 四角取景框滑入定位 */
.lyrics-container p.active::after {
  opacity: 1;
  transform: scale(1);
}

/* 左右消逝线显现 + 随进度收缩 */
.lyrics-container p.active span::before,
.lyrics-container p.active span::after {
  opacity: 1;
}



.empty-lyrics {
  text-align: center;
  opacity: .5;
  padding: 30px 0;
}

@media (max-width: 768px) {
  .detail-main {
    flex-direction: column;
  }

  .album-section {
    flex: none;
    width: 100%;
    max-width: 260px;
    margin: 0 auto;
  }

  .lyrics-wrapper {
    height: calc(100vh - 280px);
  }

  .detail-container {
    padding: 16px;
  }
}
</style>
