<template>
  <div class="my-playlist" :class="[themeClass, { entered: entered }]">
    <div class="playlist-header">
      <h2>我的歌单</h2>
      <p class="desc">管理个人本地音乐歌单</p>
    </div>

    <div class="playlist-toolbar">
      <button class="rc-global-btn" @click="openCreateModal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 4v16M4 12h16" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>创建歌单</span>
      </button>
    </div>

    <div class="playlist-list">
      <div class="playlist-item" v-for="item in playlistList" :key="item.localId" @dblclick="goToPlaylistDetail(item)">
        <div class="playlist-index">{{ playlistList.indexOf(item) + 1 }}</div>
        <div class="playlist-cover" @click="goToPlaylistDetail(item)">
          <img v-if="item.coverUrl" :src="item.coverUrl" alt="cover" />
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 4h16v16H4V4z M8 8h8M8 12h6M8 16h4" stroke-width="2"/>
          </svg>
        </div>
        <div class="playlist-info">
          <div class="playlist-name">
            {{ item.title }}
            <span v-if="item.isFavorites" class="pl-tag fav-tag">♥</span>
            <span v-if="item.isAuto" class="pl-tag auto-tag">自动</span>
          </div>
          <div class="playlist-meta">
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 18V5l12-2v13" stroke-width="2"/>
              </svg>
              {{ item.songCount || 0 }}首
            </span>
          </div>
        </div>
        <div class="playlist-actions">
          <button class="song-btn" @click="playPlaylist(item)" title="播放">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
            </svg>
          </button>
          <button class="song-btn" @click="openAddSongModal(item)" title="添加歌曲">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 5v14M5 12h14" stroke-width="2"/>
            </svg>
          </button>
          <button class="song-btn" @click="editPlaylist(item)" title="编辑">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke-width="2"/>
            </svg>
          </button>
          <button
              v-if="!item.isFavorites && !item.isAuto"
              class="song-btn"
              :class="{ 'delete-warning': deleteTargetId === item.localId && deleteCount > 0 }"
              @click="handleDeleteClick(item)"
              :title="deleteTargetId === item.localId && deleteCount > 0 ? `再点 ${3 - deleteCount} 次删除` : '删除'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="empty" v-if="playlistList.length===0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M4 4h16v16H4V4zM8 8h8M8 12h6M8 16h4" stroke-width="2"/>
        </svg>
        <p>暂无歌单，点击创建歌单开始吧</p>
      </div>
    </div>

    <div class="modal-mask" v-show="showModal" @click.self="closeModal">
      <div class="modal-content" :class="[themeClass]">
        <div class="modal-header">
          <h3>{{ isEdit ? '编辑歌单' : '创建歌单' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">歌单名称</label>
            <input v-model="form.title" placeholder="请输入歌单名" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">歌单介绍</label>
            <textarea v-model="form.intro" placeholder="请输入简介" rows="3" class="form-textarea"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-confirm" @click="submitForm">确认保存</button>
        </div>
      </div>
    </div>

    <div class="modal-mask" v-show="showAddSongModal" @click.self="closeAddSongModal">
      <div class="modal-content" :class="[themeClass]">
        <div class="modal-header">
          <h3>添加歌曲到歌单</h3>
          <button class="close-btn" @click="closeAddSongModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">当前歌单：{{ currentAddPlaylist?.title }}</label>
          </div>
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
                <span class="song-name">{{ song.name }}</span>
                <span class="song-artist">- {{ song.singer }}</span>
              </div>
              <div class="empty-select" v-if="!availableSongs.length">
                暂无本地音乐
              </div>
            </div>
          </div>
          <div class="form-group">
            <button class="folder-add-btn" @click="addFolderToPlaylist">从文件夹添加</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeAddSongModal">取消</button>
          <button class="btn-confirm" @click="addSongsToPlaylist">确认添加 ({{ selectedPathSet.size }})</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, toRaw } from "vue";
import { useGlobalTheme } from "@/composables/useGlobalTheme";
import { usePlayerStore } from "@/stores/playerStore";
import { useLocalMusicStore } from "@/stores/localMusicStore";
import { useRouter } from 'vue-router'

const { themeClass } = useGlobalTheme();
const playerStore = usePlayerStore();
const localMusicStore = useLocalMusicStore();
const router = useRouter()

const LOCAL_PLAYLIST_KEY = "local_playlists";
const LOCAL_PLAYLIST_SONGS_KEY = "local_playlist_songs";
const playlistList = ref([]);

const showModal = ref(false);
const isEdit = ref(false);
const editTarget = ref(null);
const form = ref({ title: "", intro: "" });
const showAddSongModal = ref(false);
const currentAddPlaylist = ref(null);
const selectedPathSet = ref(new Set());
const deleteCount = ref(0);
const deleteTargetId = ref(null);
const entered = ref(false);

// 重置删除计数（任何其他操作调用）
const resetDeleteCount = () => {
  deleteCount.value = 0
  deleteTargetId.value = null
}

const handleDeleteClick = (item) => {
  // 禁止删除系统歌单
  if (item.isFavorites || item.isAuto) return
  if (deleteTargetId.value !== item.localId) {
    // 不同歌单，重新计数
    deleteTargetId.value = item.localId
    deleteCount.value = 1
    return
  }
  deleteCount.value++
  if (deleteCount.value >= 3) {
    // 真正删除
    let local = getLocalPlaylists()
    local = local.filter(i => i.localId !== item.localId);
    localStorage.setItem(LOCAL_PLAYLIST_KEY, JSON.stringify(local));
    const songs = getLocalPlaylistSongs()
    delete songs[item.localId];
    localStorage.setItem(LOCAL_PLAYLIST_SONGS_KEY, JSON.stringify(songs));
    resetDeleteCount()
    loadPlaylistList()
  }
}

// 过滤已在当前歌单中的歌曲
const availableSongs = computed(() => {
  if (!currentAddPlaylist.value) return localMusicStore.songList
  const songsMap = getLocalPlaylistSongs()
  const existingKeys = new Set(songsMap[currentAddPlaylist.value.localId] || [])
  return localMusicStore.songList.filter(s => !existingKeys.has(s.path))
})

function getLocalPlaylistSongs() {
  try {
    const data = localStorage.getItem(LOCAL_PLAYLIST_SONGS_KEY)
    if (!data) return {}
    const parsed = JSON.parse(data)
    if (Array.isArray(parsed)) {
      localStorage.setItem(LOCAL_PLAYLIST_SONGS_KEY, JSON.stringify({}))
      return {}
    }
    return parsed || {}
  } catch (e) { return {} }
}

function getLocalPlaylists() {
  try { return JSON.parse(localStorage.getItem(LOCAL_PLAYLIST_KEY) || "[]"); }
  catch (e) { return []; }
}

const loadPlaylistList = () => {
  const localList = getLocalPlaylists()
  const localSongs = getLocalPlaylistSongs()
  playlistList.value = localList.map(pl => {
    const keys = localSongs[pl.localId] || []
    // 取第一首有封面的歌曲作为歌单封面
    let cover = pl.coverUrl || ''
    if (!cover && keys.length) {
      for (const key of keys) {
        const found = localMusicStore.songList.find(x => x.path === key || x.songKey === key)
        if (found?.coverUrl) { cover = found.coverUrl; break }
      }
    }
    return { ...pl, songCount: keys.length, coverUrl: cover }
  })
};

const addSongsToPlaylist = () => {
  const keys = Array.from(selectedPathSet.value)
  if (!keys.length) return
  const pl = currentAddPlaylist.value
  const localSongs = getLocalPlaylistSongs()
  const songList = localSongs[pl.localId] || []
  const set = new Set(songList)
  keys.forEach(k => set.add(k))
  localSongs[pl.localId] = Array.from(set)
  localStorage.setItem(LOCAL_PLAYLIST_SONGS_KEY, JSON.stringify(localSongs))
  closeAddSongModal()
  loadPlaylistList()
}

const addFolderToPlaylist = async () => {
  const result = await window.electron.selectAudioFolder()
  if (!result || !result.files.length) return

  const pl = currentAddPlaylist.value
  const localSongs = getLocalPlaylistSongs()
  const existing = new Set(localSongs[pl.localId] || [])

  const newSongs = []
  for (const filePath of result.files) {
    const meta = await window.electron.parseAudio(filePath)
    if (meta?.path && !existing.has(meta.path)) {
      existing.add(meta.path)
      newSongs.push({
        path: meta.path, name: meta.title, singer: meta.singer,
        album: meta.album || '', year: meta.year || null, genre: meta.genre || '',
        track: meta.track || null, composer: meta.composer || '',
        duration: meta.duration || 0, durationFormat: meta.durationFormat || '00:00',
        playUrl: meta.path, coverUrl: meta.coverUrl || '',
        lyrics: meta.lyrics || [], syncedLyrics: meta.syncedLyrics || [], lyricsSource: meta.lyricsSource,
        codec: meta._raw?.codec || '', bitrate: meta._raw?.bitrate || null,
        sampleRate: meta._raw?.sampleRate || null, channels: meta._raw?.numberOfChannels || null,
      })
    }
  }

  if (newSongs.length) {
    localMusicStore.addSongs(newSongs)
    localMusicStore.addFolder(result.dirName, result.dirPath)
    localSongs[pl.localId] = Array.from(existing)
    localStorage.setItem(LOCAL_PLAYLIST_SONGS_KEY, JSON.stringify(localSongs))
  }

  closeAddSongModal()
  loadPlaylistList()
}

const submitForm = () => {
  if (!form.value.title?.trim()) return;
  const localList = getLocalPlaylists()
  const dup = localList.find(x =>
    x.title.trim() === form.value.title.trim() &&
    (!isEdit.value || x.localId !== editTarget.value?.localId)
  )
  if (dup) { alert('歌单名称已存在，请换一个名称'); return }
  const data = { title: form.value.title, intro: form.value.intro };
  if (isEdit.value && editTarget.value) {
    const idx = localList.findIndex(x => x.localId === editTarget.value.localId);
    if (idx !== -1) {
      localList[idx] = { ...localList[idx], ...data };
      localStorage.setItem(LOCAL_PLAYLIST_KEY, JSON.stringify(localList));
    }
  } else {
    localList.unshift({ ...data, localId: Date.now() });
    localStorage.setItem(LOCAL_PLAYLIST_KEY, JSON.stringify(localList));
  }
  closeModal();
  loadPlaylistList();
};

const toggleSelectSong = (song) => {
  selectedPathSet.value.has(song.path) ? selectedPathSet.value.delete(song.path) : selectedPathSet.value.add(song.path);
};

const openCreateModal = () => { resetDeleteCount(); isEdit.value = false; form.value = { title: "", intro: "" }; showModal.value = true; };
const editPlaylist = (item) => { resetDeleteCount(); isEdit.value = true; editTarget.value = item; form.value = { ...item }; showModal.value = true; };
const closeModal = () => showModal.value = false;
const openAddSongModal = (item) => { resetDeleteCount(); currentAddPlaylist.value = item; selectedPathSet.value.clear(); showAddSongModal.value = true; };
const closeAddSongModal = () => showAddSongModal.value = false;

const playPlaylist = (item) => {
  const localSongsMap = getLocalPlaylistSongs()
  const songPaths = localSongsMap[item.localId] || []
  if (!songPaths.length) return
  const localMusic = toRaw(localMusicStore.songList)
  const realSongList = songPaths.map(key => {
    const found = localMusic.find(x => x.path === key || x.songKey === key)
    if (found) return { ...found, exists: true }
    return null
  }).filter(Boolean)
  if (!realSongList.length) return
  playerStore.setPlayList(realSongList)
  playerStore.playGlobalSong(realSongList[0])
}

const goToPlaylistDetail = (item) => router.push(`/player/playlist-detail/${item.localId}`)

onMounted(async () => { if (!localMusicStore.loaded && !localMusicStore.loading) await localMusicStore.initFromStorage(); loadPlaylistList(); requestAnimationFrame(() => { entered.value = true }); });
</script>

<style scoped>
.my-playlist {
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.my-playlist::-webkit-scrollbar { display: none; }
.playlist-header { padding: 16px; border-bottom: 2px solid transparent; position: relative; }
.playlist-header::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--border-color); transform: scaleX(0); transition: transform 0.25s cubic-bezier(0.25, 0, 0, 1); }
.entered .playlist-header::after { transform: scaleX(1); }
.playlist-header h2 { font-size: 20px; margin: 0 0 4px; }
.desc { font-size: 12px; opacity: .7; margin: 0; }
.playlist-toolbar { display: flex; gap: 8px; padding: 12px; border-bottom: 2px solid transparent; position: relative; }
.playlist-toolbar::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--border-color); transform: scaleX(0); transition: transform 0.25s cubic-bezier(0.25, 0, 0, 1); }
.entered .playlist-toolbar::after { transform: scaleX(1); }
.rc-global-btn { height: 36px; padding: 0 14px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all .2s; font-size: 13px; }
.rc-global-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; }
.rc-global-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); transform: translateY(-1px); }
.playlist-list { margin: 0; }
.playlist-item {
  display: flex; align-items: center; padding: 0 12px; height: 52px;
  border-bottom: 1px solid var(--border-color);
  position: relative; z-index: 0;
}
.playlist-item::before {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background: var(--btn-hover-bg);
  transform: scaleX(0); transform-origin: center;
  transition: transform 0.25s ease;
}
.playlist-item:hover::before { transform: scaleX(1); }
.playlist-item:hover { color: var(--btn-hover-text); }
.playlist-item:hover .playlist-index,
.playlist-item:hover .playlist-name,
.playlist-item:hover .playlist-info,
.playlist-item:hover .playlist-meta { color: inherit; }
.playlist-index { width: 40px; text-align: center; font-size: 13px; opacity: .7; }
.playlist-cover { width: 36px; height: 36px; border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; background: var(--bg-secondary); margin-right: 12px; }
.playlist-cover img { width: 100%; height: 100%; object-fit: cover; }
.playlist-cover svg { width: 18px; height: 18px; stroke: currentColor; }
.playlist-info { flex: 1; padding: 0 12px; }
.playlist-name { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.pl-tag { font-size: 10px; padding: 1px 5px; margin-left: 6px; vertical-align: middle; }
.fav-tag { color: #e74c3c; }
.auto-tag { color: var(--text-primary); opacity: 0.5; border: 1px solid var(--border-color); }
.playlist-meta { display: flex; gap: 16px; font-size: 12px; opacity: .65; margin-bottom: 4px; }
.meta-item { display: inline-flex; align-items: center; gap: 4px; }
.meta-item svg { width: 12px; height: 12px; }
.playlist-actions { display: flex; gap: 6px; flex-shrink: 0; }
.song-btn { width: 32px; height: 32px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s; }
.song-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); border-color: var(--btn-hover-text); }
.song-btn.delete-warning { background: #ff6b6b33; border-color: #ff6b6b; color: #ff6b6b; }
.song-btn.delete-warning:hover { background: #ff6b6b; color: #fff; border-color: #ff6b6b; }
.song-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; }
.empty { padding: 60px 0; display: flex; flex-direction: column; align-items: center; opacity: .5; }
.empty svg { width: 60px; height: 60px; margin-bottom: 12px; fill: none; stroke: currentColor; }
.modal-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { width: 450px; background: var(--bg-primary); border: 2px solid var(--border-color); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 2px solid var(--border-color); }
.modal-header h3 { font-size: 16px; margin: 0; }
.close-btn { background: transparent; border: none; font-size: 20px; cursor: pointer; color: var(--text-primary); }
.close-btn:hover { opacity: .7; }
.modal-body { padding: 20px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.form-input, .form-textarea { width: 100%; padding: 8px 10px; border: 2px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; font-family: inherit; }
.form-input:focus, .form-textarea:focus { outline: none; }
.form-textarea { resize: vertical; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px; border-top: 2px solid var(--border-color); }
.btn-cancel, .btn-confirm { padding: 6px 16px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: all .2s; }
.btn-cancel:hover, .btn-confirm:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); transform: translateY(-1px); }
.btn-confirm { background: var(--border-color); color: var(--bg-primary); }
.song-select-list { max-height: 300px; overflow-y: auto; border: 2px solid var(--border-color); scrollbar-width: none; -ms-overflow-style: none; }
.song-select-list::-webkit-scrollbar { display: none; }
.song-select-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background .2s; }
.song-select-item:hover { background: var(--bg-secondary); }
.song-select-item.active { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.song-name { font-size: 13px; }
.song-artist { font-size: 12px; opacity: .7; }
.empty-select { padding: 40px; text-align: center; opacity: .5; font-size: 13px; }
.folder-add-btn { width: 100%; height: 36px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: all .2s; margin-top: 4px; }
.folder-add-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }

/* === 精密组装入场 === */
.playlist-header h2 {
  opacity: 0; transform: translateY(-10px); letter-spacing: 3px;
  transition: opacity 0.18s cubic-bezier(0.2, 0, 0.2, 1),
              transform 0.18s cubic-bezier(0.2, 0, 0.2, 1),
              letter-spacing 0.25s cubic-bezier(0.2, 0, 0.2, 1);
}
.entered .playlist-header h2 { opacity: 1; transform: translateY(0); letter-spacing: 0; }

.playlist-header .desc {
  opacity: 0; transform: translateY(-6px);
  transition: opacity 0.15s ease 0.04s, transform 0.15s ease 0.04s;
}
.entered .playlist-header .desc { opacity: 1; transform: translateY(0); }

.playlist-toolbar .rc-global-btn {
  opacity: 0; transform: scaleX(0);
  transition: opacity 0.12s ease, transform 0.13s cubic-bezier(0.25, 0, 0, 1);
}
.playlist-toolbar .rc-global-btn:nth-child(1) { transition-delay: 0.08s; }
.playlist-toolbar .rc-global-btn:nth-child(2) { transition-delay: 0.16s; }
.entered .playlist-toolbar .rc-global-btn { opacity: 1; transform: scaleX(1); }

.playlist-item {
  opacity: 0; transform: translateX(-20px);
  transition: opacity 0.15s cubic-bezier(0.2, 0, 0.2, 1),
              transform 0.15s cubic-bezier(0.2, 0, 0.2, 1);
}
.entered .playlist-item { opacity: 1; transform: translateX(0); }
.playlist-item:nth-child(1) { transition-delay: 0.24s; }
.playlist-item:nth-child(2) { transition-delay: 0.263s; }
.playlist-item:nth-child(3) { transition-delay: 0.286s; }
.playlist-item:nth-child(4) { transition-delay: 0.309s; }
.playlist-item:nth-child(5) { transition-delay: 0.332s; }
.playlist-item:nth-child(6) { transition-delay: 0.355s; }
.playlist-item:nth-child(7) { transition-delay: 0.378s; }
.playlist-item:nth-child(8) { transition-delay: 0.401s; }
</style>
