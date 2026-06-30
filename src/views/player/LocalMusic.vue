<template>
  <div class="local-music" :class="[themeClass, { entered: entered }]">
    <div class="local-header">
      <h2>本地音乐</h2>
      <p class="desc">扫描并管理本地音频文件</p>
    </div>

    <div class="local-toolbar">
      <button class="rc-global-btn" @click="handleAddMusic" :disabled="musicStore.loading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 4v16M4 12h16" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>添加音乐</span>
      </button>
      <button class="rc-global-btn" @click="handleAddFolder" :disabled="musicStore.loading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke-width="2"/>
        </svg>
        <span>添加文件夹</span>
      </button>
      <button class="rc-global-btn" @click="toggleMultiMode" :class="{ active: multiMode }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        <span>{{ multiMode ? '退出多选' : '多选' }}</span>
      </button>
      <button class="rc-global-btn" @click="toggleSortMode" :class="{ active: sortMode }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 8h16M4 16h16" stroke-linecap="round"/>
          <path d="M8 4l-4 4 4 4M16 20l4-4-4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>{{ sortMode ? '完成排序' : '排序' }}</span>
      </button>
      <template v-if="multiMode">
        <button class="rc-global-btn" @click="toggleSelectAll"><span>{{ isAllSelected ? '全不选' : '全选' }}</span></button>
        <button class="rc-global-btn" @click="batchAddToPlaylist" :disabled="!selectedSet.size">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          <span>加入歌单</span>
        </button>
        <button class="rc-global-btn" @click="batchDelete" :disabled="!selectedSet.size">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M10 11v6M14 11v6M5 6h14v14a2 2 0 012 2H7a2 2 0 01-2-2V6z" stroke-linecap="round"/></svg>
          <span>删除</span>
        </button>
      </template>
      <div class="toolbar-spacer"></div>
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" stroke-width="2"/>
          <path d="M21 21l-4.35-4.35" stroke-width="2"/>
        </svg>
        <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索歌曲..."
            class="search-input"
        />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div class="loading-box" v-if="musicStore.loading">
      <p>正在扫描本地音乐...</p>
    </div>

    <!-- 文件夹横向滚动列表 -->
    <div class="folder-strip" ref="folderStripRef" v-if="!musicStore.loading && musicStore.folders.length">
      <button
          class="folder-chip"
          :class="{ active: activeFolder === null }"
          @click="activeFolder = null"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 18V5l12-2v13" stroke-width="2"/>
        </svg>
        <span>全部 ({{ musicStore.songList.length }})</span>
      </button>
      <button
          v-for="folder in musicStore.folders"  
          :key="folder.path"
          class="folder-chip"
          :class="{ active: activeFolder === folder.path }"
          @click="activeFolder = folder.path"
          @click.middle.prevent="removeFolder(folder)"
          :title="folder.path"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke-width="2"/>
        </svg>
        <span>{{ folder.name }}</span>
        <span class="folder-count">{{ folder.songCount }}</span>
      </button>
    </div>

    <div class="song-list" v-if="!musicStore.loading">
      <div
          class="song-item"
          v-for="(item, idx) in filteredSongs"
          :key="item.path"
          :class="{
            selected: multiMode && selectedSet.has(item.path),
            playing: isCurrentSong(item),
            'sort-mode': sortMode,
            'dragging': sortMode && dragFromIdx === idx,
            'drag-over': sortMode && dragOverIdx === idx
          }"
          :draggable="sortMode"
          @click="sortMode ? null : multiMode ? toggleSelect(item) : null"
          @dblclick="!sortMode && !multiMode && playItem(item)"
          @dragstart="sortMode ? onDragStart(idx, $event) : null"
          @dragover.prevent="sortMode ? onDragOver(idx) : null"
          @dragleave="sortMode ? onDragLeave() : null"
          @drop="sortMode ? onDrop(idx) : null"
          @dragend="sortMode ? onDragEnd() : null"
      >
        <div class="song-index" v-if="sortMode">
          <input
            type="text"
            class="sort-order-input"
            :value="sortOrderMap[item.path] ?? ''"
            :placeholder="idx + 1"
            @input="onSortOrderInput(item.path, $event)"
            @click.stop
            @dblclick.stop
          />
        </div>
        <div class="song-index" v-else>{{ idx + 1 }}</div>
        <div class="song-cover" v-if="item.coverUrl">
          <img :src="item.coverUrl" alt="cover" />
        </div>
        <div class="song-cover" v-else>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18V5l12-2v13" stroke-width="2"/>
          </svg>
        </div>
        <div class="song-info">
          <div class="song-name">{{ item.name }}</div>
          <div class="song-artist">{{ item.singer }}</div>
          <div class="song-album" v-if="item.album">{{ item.album }}</div>
        </div>
        <div class="song-duration">{{ item.durationFormat }}</div>
        <div class="song-actions">
          <button class="song-btn" @click="playItem(item)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
            </svg>
          </button>
          <button class="song-btn" @click="deleteSong(item)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                  d="M3 6h18 M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2 M10 11v6 M14 11v6 M5 6h14v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6z"
                  stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="song-btn" @click.stop="openPlaylistSelect(item)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
          <FavoriteButton :song="item" />
        </div>
      </div>

      <div class="empty" v-if="filteredSongs.length===0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 18V5l12-2v13" stroke-width="2"/>
          <path d="M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke-width="2"/>
        </svg>
        <p>暂无本地音乐，点击添加音乐开始导入</p>
      </div>
    </div>

    <!-- 底部浮动按钮组 -->
    <div class="float-actions" v-if="multiMode || sortMode || playerStore.currentSong">
      <button v-if="multiMode" class="float-btn" @click="cancelMulti" title="取消多选">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <button v-if="sortMode" class="float-btn" @click="toggleSortMode" title="完成排序">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
      </button>
      <button class="float-btn" @click="scrollToCurrent" title="定位到当前播放歌曲">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
      </button>
    </div>
  </div>

  <!-- 歌单选择弹窗 -->
  <div class="modal-mask" v-if="showPlaylistSelect" @click.self="showPlaylistSelect = false">
    <div class="playlist-select-popup">
      <h4>加入歌单</h4>
      <div v-if="!playlistList.length" class="empty-hint">暂无歌单</div>
      <div v-for="pl in playlistList" :key="pl.localId" class="playlist-option" @click="addToPlaylist(pl)">
        {{ pl.title }}
      </div>
      <button class="cancel-btn" @click="showPlaylistSelect = false">取消</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import { useGlobalTheme } from "@/composables/useGlobalTheme";
import { usePlayerStore } from "@/stores/playerStore";
import { useLocalMusicStore } from "@/stores/localMusicStore";
import { useCurrentSongHighlight } from "@/composables/useCurrentSongHighlight";
import FavoriteButton from "@/components/common/FavoriteButton.vue";

const { themeClass } = useGlobalTheme();
const playerStore = usePlayerStore();
const musicStore = useLocalMusicStore();
const { isCurrentSong } = useCurrentSongHighlight();

const activeFolder = ref(null);
const entered = ref(false);
const folderStripRef = ref(null);
const searchQuery = ref('');
const multiMode = ref(false);
const selectedSet = ref(new Set());
const sortMode = ref(false);
// 拖拽状态
const dragFromIdx = ref(-1);
const dragOverIdx = ref(-1);
// 数字排序映射：用户只输入要移动到的目标位置
const sortOrderMap = ref({});

const toggleSortMode = () => {
  if (sortMode.value) {
    applySortOrder()
    sortMode.value = false
    dragFromIdx.value = -1
    dragOverIdx.value = -1
    sortOrderMap.value = {}
  } else {
    sortMode.value = true
    multiMode.value = false
    selectedSet.value.clear()
    dragFromIdx.value = -1
    dragOverIdx.value = -1
    sortOrderMap.value = {}
  }
}

const onSortOrderInput = (path, e) => {
  const raw = e.target.value.trim()
  if (raw === '') {
    delete sortOrderMap.value[path]
    return
  }
  const num = parseInt(raw, 10)
  if (!isNaN(num) && num > 0 && String(num) === raw) {
    sortOrderMap.value[path] = num
  }
  e.target.value = sortOrderMap.value[path] ?? ''
}

const applySortOrder = () => {
  const map = sortOrderMap.value
  const entries = Object.entries(map)
  if (!entries.length) return

  const list = [...musicStore.songList]
  const toMove = []
  const toKeep = []

  for (const song of list) {
    const target = map[song.path]
    if (target !== undefined && target !== null && target !== '') {
      toMove.push({ song, targetIdx: Number(target) - 1 })
    } else {
      toKeep.push(song)
    }
  }

  toMove.sort((a, b) => a.targetIdx - b.targetIdx)

  const total = list.length
  const newList = new Array(total).fill(null)
  const usedPositions = new Set()

  for (const item of toMove) {
    let pos = item.targetIdx
    if (pos < 0) pos = 0
    if (pos >= total) pos = total - 1
    while (usedPositions.has(pos) && pos >= 0) pos--
    if (pos < 0) {
      pos = item.targetIdx
      while (usedPositions.has(pos) && pos < total) pos++
    }
    if (pos >= 0 && pos < total && !usedPositions.has(pos)) {
      newList[pos] = item.song
      usedPositions.add(pos)
    }
  }

  let ki = 0
  for (let i = 0; i < total; i++) {
    if (!newList[i]) {
      if (ki < toKeep.length) {
        newList[i] = toKeep[ki++]
      }
    }
  }

  musicStore.songList = newList.filter(Boolean)
  musicStore._saveCurrentPaths()
}

const toggleMultiMode = () => {
  multiMode.value = !multiMode.value
  if (multiMode.value) {
    sortMode.value = false
    dragFromIdx.value = -1
    dragOverIdx.value = -1
  } else {
    selectedSet.value.clear()
  }
}

const onDragStart = (idx, e) => {
  dragFromIdx.value = idx
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(idx))
}
const onDragOver = (idx) => {
  if (dragFromIdx.value === -1) return
  dragOverIdx.value = idx
}
const onDragLeave = () => {}
const onDrop = (idx) => {
  if (dragFromIdx.value === -1 || dragFromIdx.value === idx) {
    dragFromIdx.value = -1
    dragOverIdx.value = -1
    return
  }
  // 实际操作的数组是 musicStore.songList（filteredSongs 是 computed）
  const list = [...musicStore.songList]
  const fromSong = filteredSongs.value[dragFromIdx.value]
  const toSong = filteredSongs.value[idx]
  const fromRealIdx = list.findIndex(s => s.path === fromSong.path)
  const toRealIdx = list.findIndex(s => s.path === toSong.path)
  if (fromRealIdx === -1 || toRealIdx === -1) {
    dragFromIdx.value = -1
    dragOverIdx.value = -1
    return
  }
  const [moved] = list.splice(fromRealIdx, 1)
  list.splice(toRealIdx, 0, moved)
  musicStore.songList = list
  musicStore._saveCurrentPaths()
  dragFromIdx.value = -1
  dragOverIdx.value = -1
}
const onDragEnd = () => {
  dragFromIdx.value = -1
  dragOverIdx.value = -1
}

const toggleSelect = (song) => {
  const s = selectedSet.value;
  s.has(song.path) ? s.delete(song.path) : s.add(song.path);
};

const isAllSelected = computed(() =>
  filteredSongs.value.length > 0 && filteredSongs.value.every(s => selectedSet.value.has(s.path))
);

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedSet.value.clear();
  } else {
    selectedSet.value = new Set(filteredSongs.value.map(s => s.path));
  }
};

const showPlaylistSelect = ref(false);
const targetSong = ref(null);
const batchPaths = ref([]);
const batchSongKeys = ref([]);
const batchSongPaths = ref([]);
const playlistList = ref([]);

const openPlaylistSelect = (song) => {
  targetSong.value = song;
  try {
    const allPlaylists = JSON.parse(localStorage.getItem('local_playlists') || '[]')
    const songsMap = JSON.parse(localStorage.getItem('local_playlist_songs') || '{}')
    // 过滤掉已包含该歌曲的歌单
    playlistList.value = allPlaylists.filter(pl => {
      const keys = songsMap[pl.localId] || []
      return !keys.includes(song.path)
    })
  } catch { playlistList.value = [] }
  showPlaylistSelect.value = true;
};

const addToPlaylist = (pl) => {
  const songs = JSON.parse(localStorage.getItem('local_playlist_songs') || '{}');
  const keys = songs[pl.localId] || [];
  const newKeys = targetSong.value ? [targetSong.value.path] : batchSongPaths.value;
  newKeys.forEach(k => { if (!keys.includes(k)) keys.push(k) });
  songs[pl.localId] = keys;
  localStorage.setItem('local_playlist_songs', JSON.stringify(songs));
  showPlaylistSelect.value = false;
};

const batchDelete = () => {
  for (const path of selectedSet.value) {
    const song = musicStore.songList.find(s => s.path === path);
    if (song) musicStore.removeSong(song);
  }
  selectedSet.value.clear();
  multiMode.value = false;
  // 清理空文件夹
  for (const folder of musicStore.folders) {
    const remaining = musicStore.songList.filter(s => s.path.startsWith(folder.path))
    if (!remaining.length) {
      musicStore.removeFolder(folder.path)
      if (activeFolder.value === folder.path) activeFolder.value = null
    }
  }
};

const batchAddToPlaylist = () => {
  targetSong.value = null;
  batchSongPaths.value = [...selectedSet.value];
  try { playlistList.value = JSON.parse(localStorage.getItem('local_playlists') || '[]') } catch { playlistList.value = [] }
  showPlaylistSelect.value = true;
};

const cancelMulti = () => {
  multiMode.value = false
  selectedSet.value.clear()
}

const scrollToCurrent = () => {
  const s = playerStore.currentSong
  if (!s) return
  const el = document.querySelector('.song-item.playing')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const filteredSongs = computed(() => {
  let list = musicStore.songList
  if (activeFolder.value) {
    list = list.filter(s => s.path.startsWith(activeFolder.value))
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.singer || '').toLowerCase().includes(q) ||
      (s.album || '').toLowerCase().includes(q) ||
      (s.genre || '').toLowerCase().includes(q) ||
      (s.path || '').toLowerCase().includes(q)
    )
  }
  return list
});

const formatTime = (seconds) => {
  if (!seconds || seconds < 0) return "00:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

function createSongFromMeta(meta) {
  return {
    path: meta.path,
    name: meta.title,
    singer: meta.singer,
    album: meta.album || '',
    year: meta.year || null,
    genre: meta.genre || '',
    track: meta.track || null,
    composer: meta.composer || '',
    duration: meta.duration || 0,
    durationFormat: meta.durationFormat || formatTime(meta.duration),
    playUrl: meta.path,
    coverUrl: meta.coverUrl || '',
    lyrics: meta.lyrics || [],
    syncedLyrics: meta.syncedLyrics || [],
    lyricsSource: meta.lyricsSource,
    codec: meta._raw?.codec || '',
    bitrate: meta._raw?.bitrate || null,
    sampleRate: meta._raw?.sampleRate || null,
    channels: meta._raw?.numberOfChannels || null,
  };
}

const handleAddMusic = async () => {
  try {
    const filePaths = await window.electron.selectAudioFiles()
    if (!filePaths.length) return

    for (const filePath of filePaths) {
      if (musicStore.songList.some(s => s.path === filePath)) continue
      const meta = await window.electron.parseAudio(filePath)
      if (!meta) continue
      await musicStore.addSong(createSongFromMeta(meta))
    }
    playerStore.setPlayList(musicStore.songList)
  } catch (err) {
    console.error("添加音乐失败", err)
  }
};

const handleAddFolder = async () => {
  try {
    if (!window.electron?.selectAudioFolder) {
      console.error("selectAudioFolder 不可用，请重启应用")
      return
    }
    const result = await window.electron.selectAudioFolder()
    if (!result || !result.files.length) {
      if (result) console.log("文件夹中未找到音频文件")
      return
    }

    const { dirPath, dirName, files } = result
    const newPaths = files.filter(p => !musicStore.songList.some(s => s.path === p))
    console.log(`[folder] 扫描到 ${files.length} 个文件，新文件 ${newPaths.length} 个`)
    if (!newPaths.length) { console.log("文件夹中无新歌曲"); return }

    const songs = []
    for (const filePath of newPaths) {
      const meta = await window.electron.parseAudio(filePath)
      if (meta) songs.push(createSongFromMeta(meta))
    }
    console.log(`[folder] 成功解析 ${songs.length} 个文件`)
    const added = await musicStore.addSongs(songs)
    if (added > 0) {
      await musicStore.addFolder(dirName, dirPath)
      playerStore.setPlayList(musicStore.songList)
    }
  } catch (err) {
    console.error("添加文件夹失败", err)
  }
};

const removeFolder = async (folder) => {
  await musicStore.removeFolder(folder.path)
  if (activeFolder.value === folder.path) activeFolder.value = null
};

const playItem = (song) => {
  const list = filteredSongs.value.length ? filteredSongs.value : musicStore.songList
  playerStore.setPlayList(list)
  playerStore.playGlobalSong(song)
}

const deleteSong = async (song) => {
  await musicStore.removeSong(song);
  for (const folder of musicStore.folders) {
    const remaining = musicStore.songList.filter(s => s.path.startsWith(folder.path))
    if (!remaining.length) {
      await musicStore.removeFolder(folder.path)
      if (activeFolder.value === folder.path) activeFolder.value = null
    }
  }
};

onMounted(async () => {
  if (!musicStore.loaded && !musicStore.loading) {
    await musicStore.initFromStorage()
  }
  // 文件夹 Strip 鼠标滚轮水平滚动
  const strip = folderStripRef.value
  if (strip) {
    strip.addEventListener('wheel', (e) => {
      e.preventDefault()
      strip.scrollLeft += e.deltaY
    }, { passive: false })
  }
  // 等 splash 淡出后再播入场动效
  const triggerEnter = () => requestAnimationFrame(() => { entered.value = true })
  const splash = document.getElementById('rhizome-splash')
  if (!splash || splash.classList.contains('hidden')) {
    triggerEnter()
  } else {
    window.addEventListener('splash-done', triggerEnter, { once: true })
  }
});
</script>

<style scoped>
.local-music {
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.local-music::-webkit-scrollbar {
  display: none;
}

.local-header {
  padding: 16px;
  border-bottom: 2px solid transparent;
}

.local-header h2 {
  font-size: 20px;
  margin: 0 0 4px;
}

.desc {
  font-size: 12px;
  opacity: .7;
}

.local-toolbar {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 2px solid transparent;
  align-items: center;
}

.toolbar-spacer {
  flex: 1;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 8px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.search-box svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  opacity: 0.5;
  flex-shrink: 0;
}

.search-input {
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  width: 160px;
}

.search-input::placeholder {
  color: var(--text-primary);
  opacity: 0.4;
}

.search-clear {
  background: transparent;
  border: none;
  color: var(--text-primary);
  opacity: 0.5;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  line-height: 1;
}

.rc-global-btn {
  height: 36px;
  padding: 0 14px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all .2s;
  font-size: 13px;
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

/* 文件夹横向滚动条 */
.folder-strip {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: none;
  border-bottom: 1px solid transparent;
  background: var(--bg-secondary);
}

.folder-strip::-webkit-scrollbar {
  display: none;
}

.folder-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  transition: all .15s;
  flex-shrink: 0;
}

.folder-chip svg {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  fill: none;
}

.folder-chip:hover {
  background: var(--bg-secondary);
}

.folder-chip.active {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}

.folder-count {
  font-size: 10px;
  opacity: .6;
  background: var(--bg-secondary);
  padding: 1px 5px;
  border-radius: 0;
}

.folder-chip.active .folder-count {
  background: rgba(0,0,0,0.15);
}

.song-list {
  margin: 0;
}

.song-item {
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid var(--border-color);
  gap: 0;
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

.song-item:hover {
  color: var(--btn-hover-text);
}
.song-item.sort-mode {
  cursor: grab;
}
.song-item.sort-mode:active {
  cursor: grabbing;
}
.song-item.dragging {
  opacity: 0.35;
}
.song-item.drag-over {
  border-top: 2px solid var(--btn-hover-bg);
}
.song-item:hover .song-index,
.song-item:hover .song-name,
.song-item:hover .song-artist,
.song-item:hover .song-album,
.song-item:hover .song-duration {
  color: inherit;
}

.song-index {
  width: 30px;
  text-align: center;
  font-size: 13px;
  opacity: .8;
  flex-shrink: 0;
}

.sort-order-input {
  width: 30px;
  height: 22px;
  text-align: center;
  font-size: 12px;
  font-family: monospace;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  outline: none;
  padding: 0 2px;
  margin-left: -3px;
}
.sort-order-input::placeholder {
  color: var(--text-primary);
  opacity: 0.3;
}
.sort-order-input:focus {
  border-color: var(--btn-hover-text);
  background: var(--bg-primary);
}

.song-cover {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 10px;
  background: var(--bg-secondary);
  overflow: hidden;
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-cover svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  opacity: .5;
}

.song-info {
  flex: 1;
  padding: 0 8px;
  min-width: 0;
}

.song-name {
  font-size: 13px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 12px;
  opacity: .65;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-album {
  font-size: 11px;
  opacity: .5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.song-duration {
  width: 60px;
  text-align: right;
  font-size: 12px;
  opacity: .75;
}


.modal-mask {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.6); display: flex; align-items: center;
  justify-content: center; z-index: 99999;
}
.playlist-select-popup {
  width: 280px; background: var(--bg-primary); color: var(--text-primary);
  border: 2px solid var(--border-color); padding: 16px;
}
.playlist-select-popup h4 { margin: 0 0 12px; font-size: 14px; }
.playlist-option {
  padding: 8px 10px; cursor: pointer; font-size: 13px;
  transition: background 0.15s;
}
.playlist-option:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.empty-hint { font-size: 12px; opacity: 0.5; padding: 20px 0; text-align: center; }
.cancel-btn {
  width: 100%; margin-top: 12px; padding: 8px;
  border: 2px solid var(--border-color); background: var(--bg-secondary);
  color: var(--text-primary); cursor: pointer; font-size: 12px;
}

.song-item.selected {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}
.song-item.selected .song-index,
.song-item.selected .song-name,
.song-item.selected .song-artist,
.song-item.selected .song-album,
.song-item.selected .song-duration {
  color: inherit;
}
.song-item.selected .song-cover {
  background: var(--btn-hover-text);
  border-color: var(--btn-hover-text);
  color: var(--btn-hover-bg);
}
.song-item.selected .song-btn {
  background: var(--btn-hover-text);
  color: var(--btn-hover-bg);
  border-color: var(--btn-hover-bg);
}

/* 当前播放歌曲高亮 */
.song-item.playing {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}
.song-item.playing .song-index,
.song-item.playing .song-name,
.song-item.playing .song-artist,
.song-item.playing .song-album,
.song-item.playing .song-duration {
  color: inherit;
}
.song-item.playing .song-cover {
  background: var(--btn-hover-text);
  border-color: var(--btn-hover-text);
  color: var(--btn-hover-bg);
}
.song-item.playing .song-btn {
  background: var(--btn-hover-text);
  color: var(--btn-hover-bg);
  border-color: var(--btn-hover-bg);
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
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: .5;
}

.loading-box {
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: .6;
  font-size: 13px;
}

.empty svg {
  width: 50px;
  height: 50px;
  margin-bottom: 12px;
  fill: none;
  stroke: currentColor;
}

/* === 精密组装入场 === */
.local-header h2 {
  opacity: 0; transform: translateY(-10px); letter-spacing: 3px;
  transition: opacity 0.18s cubic-bezier(0.2, 0, 0.2, 1),
              transform 0.18s cubic-bezier(0.2, 0, 0.2, 1),
              letter-spacing 0.25s cubic-bezier(0.2, 0, 0.2, 1);
}
.entered .local-header h2 { opacity: 1; transform: translateY(0); letter-spacing: 0; }

.local-header .desc {
  opacity: 0; transform: translateY(-6px);
  transition: opacity 0.15s ease 0.04s, transform 0.15s ease 0.04s;
}
.entered .local-header .desc { opacity: 1; transform: translateY(0); }

.local-toolbar .rc-global-btn {
  opacity: 0; transform: scaleX(0);
  transition: opacity 0.12s ease, transform 0.13s cubic-bezier(0.25, 0, 0, 1);
}
.local-toolbar .rc-global-btn:nth-child(1) { transition-delay: 0.08s; }
.local-toolbar .rc-global-btn:nth-child(2) { transition-delay: 0.13s; }
.local-toolbar .rc-global-btn:nth-child(3) { transition-delay: 0.18s; }
.local-toolbar .rc-global-btn:nth-child(4) { transition-delay: 0.23s; }
.entered .local-toolbar .rc-global-btn { opacity: 1; transform: scaleX(1); }

/* 搜索框入场 */
.search-box {
  opacity: 0; transform: translateX(8px);
  transition: opacity 0.15s ease 0.24s, transform 0.15s ease 0.24s;
}
.entered .search-box { opacity: 1; transform: translateX(0); }

.folder-strip {
  opacity: 0; transform: translateY(-6px);
  transition: opacity 0.15s ease 0.2s, transform 0.15s ease 0.2s;
}
.entered .folder-strip { opacity: 1; transform: translateY(0); }

.song-item {
  opacity: 0; transform: translateX(-20px);
  transition: opacity 0.15s cubic-bezier(0.2, 0, 0.2, 1),
              transform 0.15s cubic-bezier(0.2, 0, 0.2, 1);
}
.entered .song-item { opacity: 1; transform: translateX(0); }
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
.song-item:nth-child(26) { transition-delay: 0.815s; }
.song-item:nth-child(27) { transition-delay: 0.838s; }
.song-item:nth-child(28) { transition-delay: 0.861s; }
.song-item:nth-child(29) { transition-delay: 0.884s; }
.song-item:nth-child(30) { transition-delay: 0.907s; }
.song-item:nth-child(31) { transition-delay: 0.93s; }
.song-item:nth-child(32) { transition-delay: 0.953s; }
.song-item:nth-child(33) { transition-delay: 0.976s; }
.song-item:nth-child(34) { transition-delay: 0.999s; }
.song-item:nth-child(35) { transition-delay: 1.022s; }
.song-item:nth-child(36) { transition-delay: 1.045s; }
.song-item:nth-child(37) { transition-delay: 1.068s; }
.song-item:nth-child(38) { transition-delay: 1.091s; }
.song-item:nth-child(39) { transition-delay: 1.114s; }
.song-item:nth-child(40) { transition-delay: 1.137s; }
.song-item:nth-child(41) { transition-delay: 1.16s; }
.song-item:nth-child(42) { transition-delay: 1.183s; }
.song-item:nth-child(43) { transition-delay: 1.206s; }
.song-item:nth-child(44) { transition-delay: 1.229s; }
.song-item:nth-child(45) { transition-delay: 1.252s; }
.song-item:nth-child(46) { transition-delay: 1.275s; }
.song-item:nth-child(47) { transition-delay: 1.298s; }
.song-item:nth-child(48) { transition-delay: 1.321s; }
.song-item:nth-child(49) { transition-delay: 1.344s; }
.song-item:nth-child(50) { transition-delay: 1.367s; }

/* 分隔线从中点向两端生长 */
.local-header, .local-toolbar, .folder-strip { position: relative; }
.local-header::after, .local-toolbar::after, .folder-strip::after {
  content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px;
  background: var(--border-color); transform: scaleX(0);
  transition: transform 0.25s cubic-bezier(0.25, 0, 0, 1);
}
.local-toolbar::after, .folder-strip::after { height: 1px; }
.entered .local-header::after,
.entered .local-toolbar::after,
.entered .folder-strip::after { transform: scaleX(1); }
</style>
