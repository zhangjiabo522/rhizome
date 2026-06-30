<template>
  <Teleport to="body">
    <div class="settings-mask" @click.self="$emit('close')">
      <div class="settings-modal" :class="[themeClass]">
        <div class="settings-header">
          <h3>设置</h3>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>
        <div class="settings-body">
          <div class="settings-row">
          <span class="settings-label">歌词字号</span>
          <div class="settings-stepper">
            <button class="stepper-btn" @click="changeLyricSize(-1)" :disabled="lyricSize <= 10">−</button>
            <span class="stepper-value">{{ lyricSize }}px</span>
            <button class="stepper-btn" @click="changeLyricSize(1)" :disabled="lyricSize >= 18">+</button>
          </div>
        </div>
        <div class="settings-row">
          <span class="settings-label">歌词对齐</span>
          <div class="settings-stepper">
            <button class="stepper-btn" :class="{ active: lyricAlign === 'left' }" @click="setLyricAlign('left')">左</button>
            <button class="stepper-btn" :class="{ active: lyricAlign === 'center' }" @click="setLyricAlign('center')">中</button>
            <button class="stepper-btn" :class="{ active: lyricAlign === 'right' }" @click="setLyricAlign('right')">右</button>
          </div>
        </div>
        <div class="settings-row">
          <span class="settings-label">开机自启</span>
          <div class="settings-stepper">
            <button class="stepper-btn toggle-btn" :class="{ active: autoLaunch }" @click="toggleAutoLaunch">
              <span v-if="autoLaunch">ON</span>
              <span v-else>OFF</span>
            </button>
          </div>
        </div>
        <div class="settings-row">
          <span class="settings-label">报告路径</span>
          <div class="settings-stepper">
            <button class="stepper-btn" style="width:auto;padding:0 8px;font-size:11px" @click="selectReportDir">
              {{ reportPath || '点击设置路径' }}
            </button>
          </div>
        </div>
        <div class="settings-row">
          <span class="settings-label">每周自动歌单</span>
          <div class="settings-stepper">
            <button class="stepper-btn toggle-btn" :class="{ active: weeklyEnabled }" @click="toggleWeekly">
              <span v-if="weeklyEnabled">ON</span>
              <span v-else>OFF</span>
            </button>
          </div>
        </div>
        <button class="settings-btn" @click="handleBackup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke-width="2"/></svg>
            <span>保存数据（备份）</span>
          </button>
          <button class="settings-btn" @click="handleRestore">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke-width="2"/></svg>
            <span>加载数据（恢复）</span>
          </button>
          <button class="settings-btn" @click="handleImage">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" stroke-width="2"/><path d="M21 15l-5-5L5 21" stroke-width="2"/></svg>
            <span>生成播放记录</span>
          </button>
          <button class="settings-btn" @click="handleClearAll">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M10 11v6M14 11v6M5 6h14v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6z" stroke-width="2"/></svg>
            <span>清除所有数据</span>
          </button>

          <button class="settings-btn" @click="showShortcuts = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h2M10 10h4M16 10h2M6 14h2M10 14h4M16 14h2" stroke-linecap="round"/></svg>
            <span>快捷键设置</span>
          </button>
          <button class="settings-btn" @click="showAbout = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" stroke-linecap="round"/></svg>
            <span>关于 Rhizome</span>
          </button>
        </div>
        <div class="settings-footer" v-if="msg">{{ msg }}</div>
      </div>
    </div>
  </Teleport>
  <ShortcutSettings v-if="showShortcuts" @close="showShortcuts = false" />
  <AboutModal v-if="showAbout" @close="showAbout = false" />
</template>

<script setup>
import { ref } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useLocalMusicStore } from '@/stores/localMusicStore'

import AboutModal from './AboutModal.vue'
import ShortcutSettings from './ShortcutSettings.vue'
import { generateReportBlob } from '@/composables/useReportGenerator'
import { isWeeklyEnabled, setWeeklyEnabled } from '@/composables/useWeeklyPlaylists'

const emit = defineEmits(['close'])
const { themeClass } = useGlobalTheme()
const localStore = useLocalMusicStore()
const msg = ref('')
const lyricSize = ref(
  Number(localStorage.getItem('rhizome-lyric-size') || 14)
)
const lyricAlign = ref(
  localStorage.getItem('rhizome-lyric-align') || 'center'
)
const showShortcuts = ref(false)
const showAbout = ref(false)
const autoLaunch = ref(false)

// 初始化开机自启状态
window.electron?.getAutoLaunch?.().then(v => { autoLaunch.value = !!v }).catch(() => {})

const toggleAutoLaunch = async () => {
  autoLaunch.value = !autoLaunch.value
  await window.electron?.setAutoLaunch?.(autoLaunch.value)
}

const reportPath = ref(localStorage.getItem('rhizome-report-path') || '')
const selectReportDir = async () => {
  const p = await window.electron?.selectReportDir?.()
  if (p) {
    reportPath.value = p
    localStorage.setItem('rhizome-report-path', p)
}
}

const weeklyEnabled = ref(isWeeklyEnabled())
const toggleWeekly = () => {
  weeklyEnabled.value = !weeklyEnabled.value
  setWeeklyEnabled(weeklyEnabled.value)
}

const changeLyricSize = (delta) => {
  lyricSize.value = Math.max(10, Math.min(18, lyricSize.value + delta))
  localStorage.setItem('rhizome-lyric-size', lyricSize.value.toString())
  document.documentElement.style.setProperty('--lyric-font-size', lyricSize.value + 'px')
}

const setLyricAlign = (val) => {
  lyricAlign.value = val
  localStorage.setItem('rhizome-lyric-align', val)
  document.documentElement.style.setProperty('--lyric-align', val)
}

function showMsg(text) { msg.value = text; setTimeout(() => msg.value = '', 2000) }

async function handleBackup() {
  const ok = await window.electron?.backupData?.()
  showMsg(ok ? '备份完成' : '已取消')
}

async function handleRestore() {
  const ok = await window.electron?.restoreData?.()
  if (ok) {
    showMsg('恢复完成，重启后生效')
  } else {
    showMsg('已取消或文件无效')
  }
}

async function handleImage() {
  const songs = [...localStore.songList]
  try {
    const countMap = JSON.parse(localStorage.getItem('playCountReal') || '{}')
    songs.forEach(s => s.playCount = countMap[s.path] || 0)
  } catch { songs.forEach(s => s.playCount = 0) }
  songs.sort((a, b) => b.playCount - a.playCount)
  const top10 = songs.slice(0, 10).filter(s => s.playCount > 0)
  if (!top10.length) { showMsg('暂无播放数据'); return }

  // 若未设置路径，提示用户先设置
  if (!reportPath.value) {
    showMsg('请先设置报告保存路径')
    const p = await window.electron?.selectReportDir?.()
    if (!p) return
    reportPath.value = p
    localStorage.setItem('rhizome-report-path', p)
  }

  const isDark = document.documentElement.classList.contains('theme-dark')
  const now = new Date()
  const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${String(now.getSeconds()).padStart(2,'0')}`
  const filename = `rhizome-play-record-${ts}.png`
  const blob = await generateReportBlob(songs, isDark, 'Rhizome', '播放记录 · Top 10')
  if (!blob) { showMsg('生成失败'); return }
  const arrayBuffer = await blob.arrayBuffer()
  const uint8 = new Uint8Array(arrayBuffer)
  const base64 = btoa(String.fromCharCode(...uint8))
  const ok = await window.electron?.saveReportFile?.(reportPath.value, filename, base64)
  if (ok) {
    showMsg('已保存到 ' + filename)
    // 打开所在文件夹
    window.electron?.openPath?.(reportPath.value)
  } else {
    showMsg('保存失败')
  }
}

async function handleClearAll() {
  const ok = confirm('确定要清除所有数据（包括歌单）吗？应用将自动退出。')
  if (!ok) return
  localStorage.clear()
  await window.electron?.clearAllData?.()
  window.electron?.appQuit?.()
}
</script>

<style scoped>
.settings-mask { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.settings-modal { width: 360px; background: var(--bg-primary); color: var(--text-primary); border: 2px solid var(--border-color); }
.settings-header { padding: 14px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.settings-header h3 { margin: 0; font-size: 14px; }
.close-btn { background: transparent; border: none; color: var(--text-primary); font-size: 16px; cursor: pointer; }
.settings-body { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
.settings-btn { width: 100%; height: 44px; padding: 0 16px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; transition: all .2s; }
.settings-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
.settings-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }

.settings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 44px;
  padding: 0 16px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
}
.settings-label { font-size: 13px; color: var(--text-primary); }
.settings-stepper { display: flex; align-items: center; gap: 8px; }
.stepper-btn { width: 28px; height: 28px; border: 2px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.stepper-btn:hover:not(:disabled) { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.stepper-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.stepper-btn.active { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.toggle-btn {
  width: auto;
  min-width: 44px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}
.toggle-btn.active {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
  border-color: var(--btn-hover-text);
}
.stepper-value { font-size: 13px; font-family: monospace; min-width: 36px; text-align: center; color: var(--text-primary); }

.settings-footer { padding: 10px 20px; border-top: 1px solid var(--border-color); font-size: 12px; opacity: .6; text-align: center; }
</style>
