<template>
  <div id="app-main" :class="{ revealed: appReady }">
    <router-view />
  </div>
</template>

<script setup>
import { useLocalMusicStore } from '@/stores/localMusicStore'
import { ref, onMounted } from "vue";
import { checkScheduledReports, generateReportBlob, getReportSavePath } from '@/composables/useReportGenerator'
import { checkAndGenerateWeekly } from '@/composables/useWeeklyPlaylists'

const appReady = ref(false)

async function generateScheduledReports(localStore) {
  try {
    const isDark = document.documentElement.classList.contains('theme-dark')
    const songs = localStore.songList.map(s => {
      const countMap = JSON.parse(localStorage.getItem('playCountReal') || '{}')
      return { ...s, playCount: countMap[s.path] || 0 }
    })
    const tasks = checkScheduledReports(songs, isDark)
    const savePath = getReportSavePath()
    if (!savePath) return  // 未设置路径，跳过
    for (const task of tasks) {
      const blob = await generateReportBlob(songs, isDark, task.title, task.subtitle)
      if (!blob) continue
      const savePath = getReportSavePath()
      if (savePath) {
        // 通过 Electron 写文件
        const arrayBuffer = await blob.arrayBuffer()
        const uint8 = new Uint8Array(arrayBuffer)
        const base64 = btoa(String.fromCharCode(...uint8))
        window.electron?.saveReportFile?.(savePath, task.filename, base64)
      }
    }
  } catch {}
}

onMounted(async () => {
  const localStore = useLocalMusicStore()
  await localStore.migrateIfNeeded()
  await localStore.initFromStorage()

  // 周报歌单（本周最爱 + 每周发现）
  checkAndGenerateWeekly(localStore.songList)

  // 定时报告（周报/月报/年报）—— 异步后台生成，不阻塞 UI
  generateScheduledReports(localStore)

  // 隐藏启动动画（确保至少显示 800ms）
  const splash = document.getElementById('rhizome-splash')
  if (splash) {
    const elapsed = performance.now()
    const minShow = 800
    const delay = Math.max(0, minShow - elapsed)
    setTimeout(() => {
      splash.classList.add('hidden')
      // splash 淡出完成后，同步显示主界面 + 触发入场动效
      setTimeout(() => {
        appReady.value = true
        window.dispatchEvent(new CustomEvent('splash-done'))
      }, 750)
    }, delay)
  } else {
    // 无 splash（二次进入等场景），直接显示
    appReady.value = true
    window.dispatchEvent(new CustomEvent('splash-done'))
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #121212;
  color: #fff;
  font-family: "Microsoft YaHei", sans-serif;
}
/* 统一全局：Element 弹窗样式 → 直角黑白硬朗风格 */
.rc-modal {
  border-radius: 0 !important;
  border: 2px solid var(--border-color) !important;
  backdrop-filter: blur(10px) saturate(1.2) !important;
  -webkit-backdrop-filter: blur(10px) saturate(1.2) !important;
  color: var(--text-primary) !important;
}

/* 弹窗标题 */
.rc-modal .el-message-box__header {
  border-bottom: 2px solid var(--border-color) !important;
  color: var(--text-primary) !important;
}
.rc-modal .el-message-box__title {
  color: var(--text-primary) !important;
  font-weight: 700 !important;
}

/* 弹窗内容 */
.rc-modal .el-message-box__content {
  color: var(--text-primary) !important;
}

/* 按钮区域 */
.rc-modal .el-message-box__btns {
  display: flex;
  gap: 8px;
}

/* 按钮全部直角 + 粗边框 */
.rc-modal .el-button {
  border-radius: 0 !important;
  border: 2px solid var(--border-color) !important;
  font-weight: 600 !important;
  transition: all 0.2s !important;
}

/* 确认按钮 */
.rc-modal .el-button--primary {
  background: var(--border-color) !important;
  color: var(--bg-primary) !important;
}

/* 取消按钮 */
.rc-modal .el-button:not(.el-button--primary) {
  background: transparent !important;
  color: var(--text-primary) !important;
}

/* 按钮 hover 动效 */
.rc-modal .el-button:hover {
  background: var(--btn-hover-bg) !important;
  color: var(--btn-hover-text) !important;
}

* {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE */
}
*::-webkit-scrollbar {
  display: none !important; /* Chrome / Edge / Safari */
}

/* 主界面：splash 结束后与入场动效同步淡入 */
#app-main {
  opacity: 0;
  transition: opacity 0.3s ease;
}
#app-main.revealed {
  opacity: 1;
}
</style>
