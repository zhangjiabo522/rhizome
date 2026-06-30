<template>
  <div class="playlist-detail" :class="[themeClass, { entered: entered }]">
    <div class="detail-header">
      <div class="detail-header-info">
        <div class="playlist-cover">
          <img v-if="playlistInfo.coverUrl" :src="playlistInfo.coverUrl" alt="cover" />
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 4h16v16H4V4z M8 8h8M8 12h6M8 16h4" stroke-width="2"/>
          </svg>
        </div>
        <div class="playlist-text">
          <h2>{{ playlistInfo.title }}</h2>
          <p class="desc">{{ playlistInfo.intro || '暂无简介' }}</p>
          <div class="playlist-stats">
            <span class="stat-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 18V5l12-2v13" stroke-width="2"/>
              </svg>
              {{ realSongList.length }}首
            </span>
          </div>
        </div>
      </div>
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke-width="2"/>
        </svg>
        <span>返回</span>
      </button>
    </div>

    <div class="detail-toolbar">
      <button class="rc-global-btn play-all-btn" @click="playAll">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
        </svg>
        <span>播放全部</span>
      </button>
      <button class="rc-global-btn" @click="openAddSongModal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 5v14M5 12h14" stroke-width="2"/>
        </svg>
        <span>添加歌曲</span>
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
        <button class="rc-global-btn" @click="batchRemove" :disabled="!selectedSet.size">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/></svg>
          <span>移除</span>
        </button>
      </template>
    </div>

    <div class="song-list">
      <div
          class="song-item"
          v-for="(item, idx) in realSongList"
          :key="item.path || idx"
          :class="{
            'sort-mode': sortMode,
            'dragging': sortMode && dragFromIdx === idx,
            'drag-over': sortMode && dragOverIdx === idx,
            'selected': multiMode && selectedSet.has(item.path),
            playing: isCurrentSong(item)
          }"
          :draggable="sortMode"
          @click="multiMode ? toggleSelect(item) : null"
          @dblclick="!sortMode && !multiMode && playSong(item)"
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
          <div class="song-name">{{ item.name || item.title || '未知歌曲' }}</div>
          <div class="song-artist">{{ item.singer || '未知歌手' }}</div>
        </div>
        <div class="song-duration">{{ formatTime(item.duration) }}</div>
        <div class="song-actions">
          <button class="song-btn" @click="playSong(item)" :disabled="!item.exists" title="播放">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
            </svg>
          </button>
          <button class="song-btn" @click="removeFromPlaylist(item)" :disabled="!item.exists" title="从歌单移除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/>
            </svg>
          </button>
          <FavoriteButton :song="item" />
        </div>
      </div>

      <div class="empty" v-if="realSongList.length===0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M4 4h16v16H4V4z M8 8h8M8 12h6M8 16h4" stroke-width="2"/>
        </svg>
        <p>暂无歌曲，点击添加歌曲</p>
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

    <!-- 添加歌曲弹窗 -->
    <div class="modal-mask" v-show="showAddSongModal" @click.self="closeAddSongModal">
      <div class="modal-content" :class="[themeClass]">
        <div class="modal-header">
          <h3>添加歌曲到「{{ playlistInfo.title }}」</h3>
          <button class="close-btn" @click="closeAddSongModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">选择本地音乐</label>
            <div class="song-select-list">
              <div
                  class="song-select-item"
                  v-for="song in availableSongs"
                  :key="song.path"
                  @click="toggleSelectSong(song)"
                  :class="{ active: selectedPathSet.has(song.path) }"
              >
                <span class="select-indicator"></span>
                <span class="song-name">{{ song.name }}</span>
                <span class="song-artist">- {{ song.singer }}</span>
              </div>
              <div class="empty-select" v-if="!availableSongs.length">暂无本地音乐</div>
            </div>
          </div>
          <div class="form-group">
            <button class="folder-add-btn" @click="addFolderToPlaylist">从文件夹添加</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeAddSongModal">取消</button>
          <button class="btn-confirm" @click="confirmAddSongs">确认添加 ({{ selectedPathSet.size }})</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { usePlayerStore } from '@/stores/playerStore'
import { useLocalMusicStore } from '@/stores/localMusicStore'
import { useCurrentSongHighlight } from '@/composables/useCurrentSongHighlight'
import FavoriteButton from '@/components/common/FavoriteButton.vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const { themeClass } = useGlobalTheme()
const playerStore = usePlayerStore()
const localMusicStore = useLocalMusicStore()
const { isCurrentSong } = useCurrentSongHighlight()

const playlistInfo = ref({})
const realSongList = ref([])
const showAddSongModal = ref(false)
const selectedPathSet = ref(new Set())
const entered = ref(false)

// 过滤已在当前歌单中的歌曲
const availableSongs = computed(() => {
  const pl = playlistInfo.value
  if (!pl?.localId) return localMusicStore.songList
  const map = JSON.parse(localStorage.getItem('local_playlist_songs') || '{}')
  const existingKeys = new Set(map[pl.localId] || [])
  return localMusicStore.songList.filter(s => !existingKeys.has(s.path))
})

// === 排序模式 ===
const sortMode = ref(false)
const dragFromIdx = ref(-1)
const dragOverIdx = ref(-1)
const sortOrderMap = ref({})

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

  const list = [...realSongList.value]
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

  realSongList.value = newList.filter(Boolean)
  persistSongOrder()
}

// === 多选模式 ===
const multiMode = ref(false)
const selectedSet = ref(new Set())

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

const toggleSelect = (song) => {
  const s = selectedSet.value
  s.has(song.path) ? s.delete(song.path) : s.add(song.path)
}

const isAllSelected = computed(() =>
  realSongList.value.length > 0 && realSongList.value.every(s => selectedSet.value.has(s.path))
)

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedSet.value.clear()
  } else {
    selectedSet.value = new Set(realSongList.value.map(s => s.path))
  }
}

const batchRemove = () => {
  const pl = playlistInfo.value
  if (!pl?.localId || !selectedSet.value.size) return
  const map = JSON.parse(localStorage.getItem('local_playlist_songs') || '{}')
  if (map[pl.localId]) {
    const removeSet = selectedSet.value
    map[pl.localId] = map[pl.localId].filter(k => !removeSet.has(k))
    localStorage.setItem('local_playlist_songs', JSON.stringify(map))
  }
  selectedSet.value.clear()
  multiMode.value = false
  loadPlaylistDetail()
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
  const list = [...realSongList.value]
  const [moved] = list.splice(dragFromIdx.value, 1)
  list.splice(idx, 0, moved)
  realSongList.value = list
  persistSongOrder()
  dragFromIdx.value = -1
  dragOverIdx.value = -1
}
const onDragEnd = () => {
  dragFromIdx.value = -1
  dragOverIdx.value = -1
}

const persistSongOrder = () => {
  const pl = playlistInfo.value
  if (!pl?.localId) return
  const map = JSON.parse(localStorage.getItem('local_playlist_songs') || '{}')
  map[pl.localId] = realSongList.value.map(s => s.path).filter(Boolean)
  localStorage.setItem('local_playlist_songs', JSON.stringify(map))
}

/* 定位到当前播放歌曲 */
const scrollToCurrent = () => {
  const el = document.querySelector('.song-item.playing')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

/* 取消多选 */
const cancelMulti = () => {
  multiMode.value = false
  selectedSet.value.clear()
}

const formatTime = (sec) => {
  if (!sec) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}


const loadPlaylistDetail = () => {
  const id = route.params.id
  const localList = JSON.parse(localStorage.getItem('local_playlists') || '[]')
  const target = localList.find(it => String(it.localId) === String(id))
  if (!target) { ElMessage.error('歌单不存在'); router.back(); return }
  // 解析封面
  const songsMap = JSON.parse(localStorage.getItem('local_playlist_songs') || '{}')
  const songPaths = songsMap[target.localId] || []
  let cover = target.coverUrl || ''
  if (!cover && songPaths.length) {
    for (const key of songPaths) {
      const found = localMusicStore.songList.find(x => x.path === key || x.songKey === key)
      if (found?.coverUrl) { cover = found.coverUrl; break }
    }
  }
  playlistInfo.value = { ...target, coverUrl: cover }
  realSongList.value = songPaths.map(key => {
    const found = localMusicStore.songList.find(x => x.path === key || x.songKey === key)
    if (found) return { ...found, exists: true }
    return { path: key, title: '【未下载】', singer: '未知歌手', duration: 0, exists: false }
  })
}

const playAll = () => {
  const list = realSongList.value.filter(i => i.exists)
  if (!list.length) return ElMessage.warning('无可播放歌曲')
  playerStore.setPlayList(list)
  playerStore.playGlobalSong(list[0])
}

const playSong = (song) => {
  if (!song.exists) { ElMessage.warning('本地无此歌曲'); return }
  playerStore.setPlayList(realSongList.value.filter(i => i.exists))
  playerStore.playGlobalSong(song)
}

const removeFromPlaylist = (song) => {
  if (!song.path) return
  const pl = playlistInfo.value
  const map = JSON.parse(localStorage.getItem('local_playlist_songs') || '{}')
  if (map[pl.localId]) {
    map[pl.localId] = map[pl.localId].filter(k => k !== song.path)
    localStorage.setItem('local_playlist_songs', JSON.stringify(map))
  }
  loadPlaylistDetail()
}

// === 添加歌曲 ===
const openAddSongModal = () => {
  selectedPathSet.value.clear()
  showAddSongModal.value = true
}
const closeAddSongModal = () => showAddSongModal.value = false

const toggleSelectSong = (song) => {
  selectedPathSet.value.has(song.path) ? selectedPathSet.value.delete(song.path) : selectedPathSet.value.add(song.path)
}

const confirmAddSongs = () => {
  const keys = Array.from(selectedPathSet.value)
  if (!keys.length) return
  const pl = playlistInfo.value
  const map = JSON.parse(localStorage.getItem('local_playlist_songs') || '{}')
  const existing = new Set(map[pl.localId] || [])
  keys.forEach(k => existing.add(k))
  map[pl.localId] = Array.from(existing)
  localStorage.setItem('local_playlist_songs', JSON.stringify(map))
  closeAddSongModal()
  loadPlaylistDetail()
}

const addFolderToPlaylist = async () => {
  const result = await window.electron.selectAudioFolder()
  if (!result || !result.files.length) return
  const pl = playlistInfo.value
  const map = JSON.parse(localStorage.getItem('local_playlist_songs') || '{}')
  const existing = new Set(map[pl.localId] || [])
  const newSongs = []
  for (const filePath of result.files) {
    const meta = await window.electron.parseAudio(filePath)
    if (meta?.path && !existing.has(meta.path)) {
      existing.add(meta.path)
      newSongs.push({
        path: meta.path,
        name: meta.title,
        singer: meta.singer,
        album: meta.album || '',
        year: meta.year || null,
        genre: meta.genre || '',
        track: meta.track || null,
        composer: meta.composer || '',
        duration: meta.duration || 0,
        durationFormat: meta.durationFormat || '00:00',
        playUrl: meta.path,
        coverUrl: meta.coverUrl || '',
        lyrics: meta.lyrics || [],
        syncedLyrics: meta.syncedLyrics || [],
        lyricsSource: meta.lyricsSource,
        codec: meta._raw?.codec || '',
        bitrate: meta._raw?.bitrate || null,
        sampleRate: meta._raw?.sampleRate || null,
        channels: meta._raw?.numberOfChannels || null,
      })
    }
  }
  if (newSongs.length) {
    localMusicStore.addSongs(newSongs)
    localMusicStore.addFolder(result.dirName, result.dirPath)
    map[pl.localId] = Array.from(existing)
    localStorage.setItem('local_playlist_songs', JSON.stringify(map))
  }
  closeAddSongModal()
  loadPlaylistDetail()
}

const goBack = () => router.back()

onMounted(async () => { if (!localMusicStore.loaded && !localMusicStore.loading) await localMusicStore.initFromStorage(); loadPlaylistDetail(); requestAnimationFrame(() => { entered.value = true }) })
</script>

<style scoped>
.playlist-detail { width: 100%; height: 100%; background: var(--bg-primary); color: var(--text-primary); overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
.playlist-detail::-webkit-scrollbar { display: none; }
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px; border-bottom: 2px solid transparent; position: relative; }
.detail-header::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--border-color); transform: scaleX(0); transition: transform 0.25s cubic-bezier(0.25, 0, 0, 1); }
.entered .detail-header::after { transform: scaleX(1); }
.detail-header-info { display: flex; gap: 20px; flex: 1; }
.playlist-cover { width: 100px; height: 100px; border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--bg-secondary); }
.playlist-cover img { width: 100%; height: 100%; object-fit: cover; }
.playlist-cover svg { width: 50px; height: 50px; stroke: currentColor; }
.playlist-text { flex: 1; }
.playlist-text h2 { font-size: 20px; margin: 0 0 4px; }
.desc { font-size: 12px; opacity: .7; margin: 0 0 8px; }
.playlist-stats { display: flex; gap: 16px; margin-top: 8px; }
.stat-item { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; opacity: .75; }
.stat-item svg { width: 14px; height: 14px; }
.back-btn { height: 36px; padding: 0 14px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all .2s; flex-shrink: 0; }
.back-btn svg { width: 14px; height: 14px; }
.back-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); transform: translateY(-1px); }
.detail-toolbar { display: flex; gap: 8px; padding: 12px; border-bottom: 2px solid transparent; }
.detail-toolbar::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--border-color); transform: scaleX(0); transition: transform 0.25s cubic-bezier(0.25, 0, 0, 1); }
.entered .detail-toolbar::after { transform: scaleX(1); }
.rc-global-btn { height: 36px; padding: 0 14px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all .2s; }
.rc-global-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; }
.rc-global-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); transform: translateY(-1px); }
.play-all-btn { background: var(--border-color); color: var(--bg-primary); }
.play-all-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.song-list { margin: 0; }
.song-item {
  height: 52px; display: flex; align-items: center;
  padding: 0 12px; border-bottom: 1px solid var(--border-color);
  position: relative; z-index: 0;
}
.song-item::before {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background: var(--btn-hover-bg);
  transform: scaleX(0); transform-origin: center;
  transition: transform 0.25s ease;
}
.song-item:hover::before { transform: scaleX(1); }
.song-item:hover { color: var(--btn-hover-text); }
.song-item.sort-mode { cursor: grab; }
.song-item.sort-mode:active { cursor: grabbing; }
.song-item.dragging { opacity: 0.35; }
.song-item.drag-over { border-top: 2px solid var(--btn-hover-bg); }
.song-item.selected {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}
.song-item.selected .song-index,
.song-item.selected .song-name,
.song-item.selected .song-artist,
.song-item.selected .song-duration {
  color: inherit;
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
.song-item:hover .song-index,
.song-item:hover .song-name,
.song-item:hover .song-artist,
.song-item:hover .song-duration { color: inherit; 
}
.song-index { width: 30px; text-align: center; font-size: 13px; opacity: .8; flex-shrink: 0; }
.sort-order-input {
  width: 30px; height: 22px; text-align: center;
  font-size: 12px; font-family: monospace;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary); color: var(--text-primary);
  outline: none; padding: 0 2px;
  margin-left: -3px;
}
.sort-order-input::placeholder {
  color: var(--text-primary); opacity: 0.3;
}
.sort-order-input:focus {
  border-color: var(--btn-hover-text);
  background: var(--bg-primary);
}
.song-cover { width: 36px; height: 36px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 10px; background: var(--bg-secondary); overflow: hidden; }
.song-cover img { width: 100%; height: 100%; object-fit: cover; }
.song-cover svg { width: 18px; height: 18px; stroke: currentColor; opacity: .5; }
.song-info { flex: 1; padding: 0 8px; min-width: 0; }
.song-name { font-size: 13px; margin-bottom: 2px; }
.song-artist { font-size: 12px; opacity: .65; }
.song-duration { width: 60px; text-align: right; font-size: 12px; opacity: .75; }
.song-actions { display: flex; gap: 4px; margin-left: 8px; }
.song-btn { width: 30px; height: 30px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s; }
.song-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); border-color: var(--btn-hover-text); }
.song-btn svg { width: 14px; height: 14px; fill: none; stroke: currentColor; }
.song-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.empty { padding: 40px 0; display: flex; flex-direction: column; align-items: center; opacity: .5; }
.empty svg { width: 50px; height: 50px; margin-bottom: 12px; fill: none; stroke: currentColor; }
/* 弹窗 */
.modal-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { width: 450px; background: var(--bg-primary); border: 2px solid var(--border-color); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 2px solid var(--border-color); }
.modal-header h3 { font-size: 16px; margin: 0; }
.close-btn { background: transparent; border: none; font-size: 20px; cursor: pointer; color: var(--text-primary); }
.close-btn:hover { opacity: .7; }
.modal-body { padding: 20px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px; border-top: 2px solid var(--border-color); }
.btn-cancel, .btn-confirm { padding: 6px 16px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: all .2s; }
.btn-cancel:hover, .btn-confirm:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.btn-confirm { background: var(--border-color); color: var(--bg-primary); }
.song-select-list { max-height: 300px; overflow-y: auto; border: 2px solid var(--border-color); scrollbar-width: none; }
.song-select-list::-webkit-scrollbar { display: none; }
.song-select-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background .2s; }
.song-select-item:hover { background: var(--bg-secondary); }
.song-select-item.active { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.select-indicator { width: 16px; height: 16px; border: 2px solid var(--border-color); display: inline-block; flex-shrink: 0; }
.song-select-item.active .select-indicator { background: currentColor; }
.empty-select { padding: 40px; text-align: center; opacity: .5; font-size: 13px; }
.folder-add-btn { width: 100%; height: 36px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: all .2s; margin-top: 4px; }
.folder-add-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }

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
.playlist-cover {
  opacity: 0; transform: translateX(-40px);
  transition: opacity 0.18s cubic-bezier(0.2, 0, 0.2, 1),
              transform 0.18s cubic-bezier(0.2, 0, 0.2, 1);
}
.entered .playlist-cover { opacity: 1; transform: translateX(0); }

.playlist-text h2 {
  opacity: 0; transform: translateY(-10px); letter-spacing: 3px;
  transition: opacity 0.18s cubic-bezier(0.2, 0, 0.2, 1) 0.06s,
              transform 0.18s cubic-bezier(0.2, 0, 0.2, 1) 0.06s,
              letter-spacing 0.25s cubic-bezier(0.2, 0, 0.2, 1) 0.06s;
}
.entered .playlist-text h2 { opacity: 1; transform: translateY(0); letter-spacing: 0; }

.playlist-text .desc,
.playlist-text .playlist-stats {
  opacity: 0; transform: translateY(-6px);
  transition: opacity 0.15s ease 0.1s, transform 0.15s ease 0.1s;
}
.entered .playlist-text .desc,
.entered .playlist-text .playlist-stats { opacity: 1; transform: translateY(0); }

.back-btn {
  opacity: 0; transform: scaleX(0);
  transition: opacity 0.12s ease, transform 0.13s cubic-bezier(0.25, 0, 0, 1);
  transition-delay: 0.12s;
}
.entered .back-btn { opacity: 1; transform: scaleX(1); }

.detail-toolbar .rc-global-btn {
  opacity: 0; transform: scaleX(0);
  transition: opacity 0.12s ease, transform 0.13s cubic-bezier(0.25, 0, 0, 1);
}
.detail-toolbar .rc-global-btn:nth-child(1) { transition-delay: 0.08s; }
.detail-toolbar .rc-global-btn:nth-child(2) { transition-delay: 0.16s; }
.detail-toolbar .rc-global-btn:nth-child(3) { transition-delay: 0.24s; }
.detail-toolbar .rc-global-btn:nth-child(4) { transition-delay: 0.32s; }
.entered .detail-toolbar .rc-global-btn { opacity: 1; transform: scaleX(1); }

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
</style>
