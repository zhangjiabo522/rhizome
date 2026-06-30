<template>
  <div class="rc-player-container" :class="[themeClass]">
    <div class="rc-sub-sidebar">
      <div class="rc-sub-func-group">
        <button
            v-for="item in playerSubFuncList"
            :key="item.key"
            class="rc-sub-func-btn"
            :class="{ active: activeSubFunc === item.key }"
            @click="switchSubFunc(item.key)"
        >
          <svg class="rc-sub-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path :d="item.iconPath" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <div class="rc-sub-bottom-group">
        <div class="rc-sub-divider-wrapper">
          <div class="rc-sub-divider"></div>
        </div>
        <button class="rc-sub-func-btn" @click="toggleTheme">
          <svg class="rc-sub-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path :d="themeIcon" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="rc-sub-func-btn" @click="showSettings = true">
          <svg class="rc-sub-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke-width="2"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke-width="2"/>
          </svg>
        </button>
      </div>
    </div>

    <SettingsModal v-if="showSettings" @close="showSettings = false" />

    <div class="rc-player-content">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import SettingsModal from '@/components/common/SettingsModal.vue'

const router = useRouter()
const route = useRoute()
const { themeClass, isDark, toggleTheme } = useGlobalTheme()
const showSettings = ref(false)

const themeIcon = 'M12 3v1 M12 20v1 M3 12h1 M20 12h1 M5.64 5.64l.7.7 M17.66 17.66l.7.7 M5.64 18.36l.7-.7 M17.66 6.34l.7-.7 M12 7a5 5 0 1 0 5 5'

const playerSubFuncList = [
  {
    key: 'local',
    label: '本地音乐',
    iconPath: 'M12 3v18M8 7v10M16 7v10M4 11v2M20 11v2',
    path: '/player/local',
  },
  {
    key: 'playlist',
    label: '我的歌单',
    iconPath: 'M4 4h16v16H4V4z M8 8h8M8 12h6M8 16h4',
    path: '/player/playlist',
  },
  {
    key: 'history',
    label: '播放历史',
    iconPath: 'M12 8v4l3 3M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
    path: '/player/history',
  },
  {
    key: 'stats',
    label: '听歌统计',
    iconPath: 'M3 3v16a2 2 0 0 0 2 2h16M7 14l3-3 3 3 4-4',
    path: '/player/stats',
  },
]

const activeSubFunc = ref('local')

const updateActiveFromRoute = () => {
  const path = route.path
  if (path.startsWith('/player/playlist-detail/') || path.startsWith('/player/detail')) return

  const currentItem = playerSubFuncList.find(
      item => path === item.path || path.startsWith(item.path + '/')
  )
  activeSubFunc.value = currentItem ? currentItem.key : 'local'
}

const switchSubFunc = (key) => {
  const item = playerSubFuncList.find(i => i.key === key)
  if (!item) return
  activeSubFunc.value = key
  router.push(item.path)
}

onMounted(updateActiveFromRoute)

watch(() => route.path, updateActiveFromRoute)
</script>

<style scoped>
.rc-player-container {
  width: 100%;
  height: 100%;
  display: flex;
  min-height: 0;
  background: var(--bg-primary);
}

.rc-sub-sidebar {
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  background: var(--bg-sidebar);
  border-right: 2px solid var(--border-color);
  flex-shrink: 0;
}

.rc-sub-func-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.rc-sub-bottom-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding-bottom: 12px;
}

.rc-sub-divider-wrapper {
  width: 70%;
  display: flex;
  justify-content: center;
  margin: 4px 0;
}

.rc-sub-divider {
  width: 80%;
  height: 2px;
  background: var(--border-color);
}

.rc-sub-func-btn {
  width: 40px;
  height: 40px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s ease;
  cursor: pointer;
  border-radius: 0;
  flex-shrink: 0;
}

.rc-sub-func-btn:hover,
.rc-sub-func-btn.active {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}

.rc-sub-icon {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  fill: none;
}


.rc-player-content {
  flex: 1;
  overflow: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.rc-player-content::-webkit-scrollbar {
  display: none;
}
</style>
