<template>
  <div class="play-history" :class="[themeClass, { entered: entered }]">
    <div class="history-header">
      <h2>播放历史</h2>
      <p class="desc">仅显示本地歌曲播放记录</p>
    </div>

    <div class="song-list">
      <div class="song-item" v-for="(item, idx) in realHistoryList" :key="idx" @dblclick="playSong(item)" :class="{ playing: isCurrentSong(item) }">
        <div class="song-index">{{ idx + 1 }}</div>
        <div class="song-cover" v-if="item.coverUrl">
          <img :src="item.coverUrl" alt="cover" />
        </div>
        <div class="song-cover" v-else>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 18V5l12-2v13" stroke-width="2"/></svg>
        </div>
        <div class="song-info">
          <div class="song-name">{{ item.name }}</div>
          <div class="song-artist">{{ item.singer || '未知歌手' }}</div>
        </div>
        <div class="song-duration">{{ item.durationFormat || '00:00' }}</div>
        <div class="song-actions">
          <button class="song-btn" @click="playSong(item)" title="播放">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
            </svg>
          </button>
          <FavoriteButton :song="item" />
        </div>
      </div>

      <div class="empty" v-if="realHistoryList.length === 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 8v4l3 3M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                stroke-width="2"/>
        </svg>
        <p>暂无播放历史</p>
      </div>
    </div>

    <!-- 底部浮动按钮组 -->
    <div class="float-actions" v-if="playerStore.currentSong">
      <button class="float-btn" @click="scrollToCurrent" title="定位到当前播放歌曲">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useGlobalTheme } from "@/composables/useGlobalTheme";
import { usePlayerStore } from "@/stores/playerStore";
import { useLocalMusicStore } from "@/stores/localMusicStore";
import { useCurrentSongHighlight } from "@/composables/useCurrentSongHighlight";
import FavoriteButton from "@/components/common/FavoriteButton.vue";

const { themeClass } = useGlobalTheme();
const playerStore = usePlayerStore();
const localMusicStore = useLocalMusicStore();
const { isCurrentSong } = useCurrentSongHighlight();

const rawHistory = ref([]);
const entered = ref(false);

const scrollToCurrent = () => {
  const el = document.querySelector('.song-item.playing')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const formatTime = (sec) => {
  if (!sec) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const realHistoryList = computed(() => {
  const local = localMusicStore.songList;
  const map = {};
  rawHistory.value.forEach(i => map[i.path] = i);
  return Object.values(map).map(h => {
    const match = local.find(x => x.path === h.path);
    return match ? { ...match, durationFormat: formatTime(match.duration) } : null;
  }).filter(Boolean);
});

const playSong = (song) => {
  playerStore.setPlayList(realHistoryList.value);
  playerStore.playGlobalSong(song);
};

const removeSingle = (song) => {
  rawHistory.value = rawHistory.value.filter(x => x.path !== song.path);
  localStorage.setItem("playHistoryView", JSON.stringify(rawHistory.value));
};

const clearHistory = () => {
  rawHistory.value = [];
  localStorage.setItem("playHistoryView", "[]");
};

const refreshHistory = () => {
  const d = localStorage.getItem("playHistoryView");
  rawHistory.value = d ? JSON.parse(d) : [];
};

onMounted(() => {
  refreshHistory();
  requestAnimationFrame(() => { entered.value = true });
});
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
}

.theme-dark {
  --bg: #2c2c2c;
  --text: #fff;
  --border: #fff;
  --btn: #292929;
  --btn-hover: #fff;
  --btn-text: #000;
  --light: #333;
}

.play-history {
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow-y: auto;
}

.play-history::-webkit-scrollbar {
  display: none;
}

.history-header {
  padding: 16px;
  border-bottom: 2px solid transparent;
  position: relative;
}
.history-header::after {
  content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px;
  background: var(--border-color); transform: scaleX(0);
  transition: transform 0.25s cubic-bezier(0.25, 0, 0, 1);
}
.entered .history-header::after { transform: scaleX(1); }

.history-header h2 {
  font-size: 20px;
  margin: 0 0 4px;
}

.desc {
  font-size: 12px;
  opacity: 0.7;
}

.history-toolbar {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 2px solid transparent;
  position: relative;
}
.history-toolbar::after {
  content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px;
  background: var(--border-color); transform: scaleX(0);
  transition: transform 0.25s cubic-bezier(0.25, 0, 0, 1);
}
.entered .history-toolbar::after { transform: scaleX(1); }

.rc-global-btn {
  height: 36px;
  padding: 0 14px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.rc-global-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
}

.rc-global-btn:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}

.song-list {
  margin: 0;
}

.song-item {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid var(--border-color);
  position: relative;
  z-index: 0;
}

.song-item::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--btn-hover-bg);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.25s ease;
}

.song-item:hover::before {
  transform: scaleX(1);
}

/* 当前播放歌曲高亮 */
.song-item.playing {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}
.song-item.playing .song-index,
.song-item.playing .song-name,
.song-item.playing .song-artist,
.song-item.playing .song-duration {
  color: inherit;
}

.song-item:hover {
  color: var(--btn-hover-text);
}
.song-item:hover .song-index,
.song-item:hover .song-name,
.song-item:hover .song-artist,
.song-item:hover .song-duration {
  color: inherit;
}

.song-index {
  width: 30px;
  text-align: center;
  font-size: 13px;
  opacity: .8;
}

.song-cover {
  width: 36px; height: 36px; flex-shrink: 0; margin-right: 10px;
  border: 1px solid var(--border-color);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; background: var(--bg-secondary);
}
.song-cover img { width: 100%; height: 100%; object-fit: cover; }
.song-cover svg { width: 18px; height: 18px; stroke: currentColor; opacity: .5; }

.song-info {
  flex: 1;
  padding: 0 12px;
}

.song-name {
  font-size: 13px;
  margin-bottom: 2px;
}

.song-artist {
  font-size: 12px;
  opacity: .65;
}

.song-duration {
  width: 60px;
  text-align: right;
  font-size: 12px;
  opacity: .75;
}

.song-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.song-btn {
  width: 30px;
  height: 30px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all .2s;
}

.song-btn:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
  border-color: var(--btn-hover-text);
}

.song-btn svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
}


.empty {
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: .5;
}

.empty svg {
  width: 60px;
  height: 60px;
  margin-bottom: 12px;
}

/* 底部浮动按钮组 */
.float-actions {
  position: fixed;
  bottom: 84px;
  right: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  z-index: 10;
}
.float-btn {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 2px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.float-btn svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
}
.float-btn:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}

/* === 精密组装入场 === */
.history-header h2 {
  opacity: 0;
  transform: translateY(-10px);
  letter-spacing: 3px;
  transition: opacity 0.18s cubic-bezier(0.2, 0, 0.2, 1),
              transform 0.18s cubic-bezier(0.2, 0, 0.2, 1),
              letter-spacing 0.25s cubic-bezier(0.2, 0, 0.2, 1);
}
.entered .history-header h2 {
  opacity: 1;
  transform: translateY(0);
  letter-spacing: 0;
}

.history-header .desc {
  opacity: 0;
  transform: translateY(-6px);
  transition: opacity 0.15s ease 0.04s,
              transform 0.15s ease 0.04s;
}
.entered .history-header .desc {
  opacity: 1;
  transform: translateY(0);
}

.history-toolbar .rc-global-btn {
  opacity: 0;
  transform: scaleX(0);
  transition: opacity 0.12s ease,
              transform 0.13s cubic-bezier(0.25, 0, 0, 1);
}
.history-toolbar .rc-global-btn:nth-child(1) { transition-delay: 0.08s; }
.history-toolbar .rc-global-btn:nth-child(2) { transition-delay: 0.16s; }
.entered .history-toolbar .rc-global-btn {
  opacity: 1;
  transform: scaleX(1);
}

.song-item {
  opacity: 0;
  transform: translateX(-20px);
  transition: opacity 0.15s cubic-bezier(0.2, 0, 0.2, 1),
              transform 0.15s cubic-bezier(0.2, 0, 0.2, 1);
}
.entered .song-item {
  opacity: 1;
  transform: translateX(0);
}
.song-item:nth-child(1) { transition-delay: 0.24s; }
.song-item:nth-child(2) { transition-delay: 0.263s; }
.song-item:nth-child(3) { transition-delay: 0.286s; }
.song-item:nth-child(4) { transition-delay: 0.309s; }
.song-item:nth-child(5) { transition-delay: 0.332s; }
.song-item:nth-child(6) { transition-delay: 0.355s; }
.song-item:nth-child(7) { transition-delay: 0.378s; }
.song-item:nth-child(8) { transition-delay: 0.401s; }
.song-item:nth-child(9) { transition-delay: 0.424s; }
.song-item:nth-child(10) { transition-delay: 0.447s; }
.song-item:nth-child(11) { transition-delay: 0.47s; }
.song-item:nth-child(12) { transition-delay: 0.493s; }
.song-item:nth-child(13) { transition-delay: 0.516s; }
.song-item:nth-child(14) { transition-delay: 0.539s; }
.song-item:nth-child(15) { transition-delay: 0.562s; }
.song-item:nth-child(16) { transition-delay: 0.585s; }
.song-item:nth-child(17) { transition-delay: 0.608s; }
.song-item:nth-child(18) { transition-delay: 0.631s; }
.song-item:nth-child(19) { transition-delay: 0.654s; }
.song-item:nth-child(20) { transition-delay: 0.677s; }
.song-item:nth-child(21) { transition-delay: 0.7s; }
.song-item:nth-child(22) { transition-delay: 0.723s; }
.song-item:nth-child(23) { transition-delay: 0.746s; }
.song-item:nth-child(24) { transition-delay: 0.769s; }
.song-item:nth-child(25) { transition-delay: 0.792s; }
</style>