<!-- src/components/player/GlobalPlayer.vue -->
<template>
  <div class="rc-global-player" v-if="currentSong" :class="{ switching }">
    <!-- 左侧：歌曲信息 -->
    <div class="player-left">
      <div class="album-thumb" @click="onGoToDetail">
        <img
            v-if="displaySong.coverUrl"
            :src="displaySong.coverUrl"
            alt="封面"
            style="width:100%;height:100%;object-fit:cover;"
        />
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" stroke-width="2"/>
        </svg>
      </div>
      <div class="player-info">
        <div class="song-name">{{ displaySong.name }}</div>
        <div class="song-artist">{{ displaySong.singer }}</div>
      </div>
    </div>

    <!-- 中间：播放控制 + 频谱 -->
    <div class="player-center">
      <PlaybackControls
          :is-playing="isPlaying"
          @prev="onPrev"
          @next="onNext"
          @toggle-play="onTogglePlay"
      />
      <canvas ref="spectrumCanvas" class="gp-spectrum" :class="{ 'gp-spectrum--hidden': !isPlaying }"></canvas>
      <ProgressBar
          :current-value="currentTime"
          :max-value="duration"
          @update="onSeek"
          @change="onSeek"
      />
    </div>

    <!-- 右侧：音量 + 模式 + 列表 -->
    <div class="player-right">
      <VolumeControl
          :model-value="volume"
          @update:model-value="onVolumeUpdate"
          @change="onVolumeChange"
      />

      <button class="control-btn mode-btn rc-has-tooltip" @click="onToggleMode">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path :d="modeIcon" stroke-width="2"/>
        </svg>
        <span class="rc-tooltip">{{ modeTooltip }}</span>
      </button>

      <button class="control-btn desktop-lyric-btn rc-has-tooltip"
              @click.left="onToggleDesktopLyrics"
              @click.right.prevent="onToggleLyricLock">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="14" rx="2"/>
          <path d="M3 9h18"/>
          <path d="M7 13h10M7 16.5h7" stroke-linecap="round"/>
        </svg>
        <span class="rc-tooltip">{{ lyricTooltip }}</span>
      </button>

      <button class="control-btn list-btn" @click="onOpenPlaylist">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      <FavoriteButton class="gp-fav-btn" :song="displaySong" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import PlaybackControls from './PlaybackControls.vue'
import ProgressBar from './ProgressBar.vue'
import VolumeControl from './VolumeControl.vue'
import FavoriteButton from '@/components/common/FavoriteButton.vue'

const props = defineProps({
  currentSong: {
    type: Object,
    default: null
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  currentTime: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    default: 0
  },
  playMode: {
    type: String,
    default: 'list' // list, single, listLoop, singleLoop, random
  },
  volume: {
    type: Number,
    default: 1
  },
  desktopLyricsVisible: {
    type: Boolean,
    default: false
  },
  desktopLyricsLocked: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'prev', 'next', 'togglePlay', 'seek',
  'toggleMode', 'openPlaylist', 'goToDetail',
  'update:volume',
  'toggleDesktopLyrics', 'toggleLyricLock'
])

// 播放模式图标映射
const modeIconMap = {
  list: 'M4 7h14 M4 12h12 M4 17h16',
  single: 'M12 7v10 M9 16h6',
  listLoop: 'M6 6h12v12H6z M16 6l2 2-2 2 M8 18l-2-2 2-2',
  singleLoop: 'M6 6h12v12H6z M16 6l2 2-2 2 M8 18l-2-2 2-2 M12 9v6 M10 14h4',
  random: 'M4 8h8v6h8 M20 16h-8v-6H4',
}

const modeTooltipMap = {
  list: '列表播放',
  single: '单曲播放',
  listLoop: '列表循环',
  singleLoop: '单曲循环',
  random: '随机播放'
}

const modeIcon = computed(() => modeIconMap[props.playMode] || modeIconMap.list)
const modeTooltip = computed(() => modeTooltipMap[props.playMode] || '播放模式')

const onPrev = () => emit('prev')
const onNext = () => emit('next')
const onTogglePlay = () => emit('togglePlay')
const onSeek = (value) => emit('seek', value)
const onToggleMode = () => emit('toggleMode')
const onOpenPlaylist = () => emit('openPlaylist')
const onGoToDetail = () => emit('goToDetail')
const onVolumeUpdate = (val) => emit('update:volume', val)
const onVolumeChange = (val) => console.log('音量变化:', val)
const onToggleDesktopLyrics = () => emit('toggleDesktopLyrics')
const onToggleLyricLock = () => emit('toggleLyricLock')

const lyricTooltip = computed(() => {
  if (props.desktopLyricsLocked) return '桌面歌词 (已锁定)'
  if (props.desktopLyricsVisible) return '隐藏桌面歌词'
  return '显示桌面歌词'
})

// ========== 切歌动效 ==========
const switching = ref(false)
const displaySong = ref({ ...props.currentSong })

watch(() => props.currentSong, (song) => {
  if (song) {
    switching.value = true
    setTimeout(() => {
      displaySong.value = song
      switching.value = false
    }, 180)
  }
})
</script>

<style scoped>
.rc-global-player {
  height: 72px;
  border-top: 2px solid var(--border-color);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  gap: 20px;
  flex-shrink: 0;
}

.player-left {
  flex: 0 0 220px;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 150px;
}

.album-thumb {
  width: 44px;
  height: 44px;
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.album-thumb:hover {
  transform: scale(1.05);
  border-color: var(--btn-hover-bg);
}

.album-thumb svg {
  width: 24px;
  height: 24px;
  stroke: currentColor;
}

.player-info {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.song-name {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 11px;
  opacity: 0.65;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-center {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  justify-content: flex-start;
}

.player-right {
  flex: 0 0 260px;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

.control-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 0;
  flex-shrink: 0;
}

.control-btn svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
}

.control-btn:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
  transform: scale(1.05);
}

.mode-btn svg,
.list-btn svg {
  width: 18px;
  height: 18px;
}

.gp-spectrum {
  width: 60px;
  height: 40px;
  flex-shrink: 0;
}

.gp-spectrum--hidden {
  visibility: hidden;
}

.mode-btn .rc-tooltip {
  top: auto;
  bottom: calc(100% + 6px);
}

.desktop-lyric-btn {
  position: relative;
}

.desktop-lyric-btn .rc-tooltip {
  top: auto;
  bottom: calc(100% + 6px);
}

/* 收藏按钮在播放栏中的样式 */
.gp-fav-btn {
  width: 36px !important;
  height: 36px !important;
  border-radius: 0;
}

/* ========== 切歌动效 ========== */

/* 封面：四角收拢再展开 */
.album-thumb {
  clip-path: inset(0 0 0 0);
  transition: clip-path 0.18s cubic-bezier(0.25, 0, 0, 1);
}
.switching .album-thumb {
  clip-path: inset(50% 50% 50% 50%);
}

/* 歌名/歌手：左侧色条擦除 */
.player-info {
  position: relative;
  overflow: hidden;
}
.player-info::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--border-color);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.18s cubic-bezier(0.5, 0, 0.3, 1);
  z-index: 2;
  pointer-events: none;
}
.switching .player-info::after {
  transform: scaleX(1);
}

/* 进度条脉冲 */
.rc-progress-track::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--border-color);
  opacity: 0;
  pointer-events: none;
  z-index: 1;
}
.switching .rc-progress-track::after {
  animation: gp-progress-pulse 0.36s ease-out;
}
@keyframes gp-progress-pulse {
  0% { opacity: 0; }
  30% { opacity: 0.5; }
  100% { opacity: 0; }
}
</style>