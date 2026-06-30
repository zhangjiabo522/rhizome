<template>
  <Teleport to="body">
    <div class="about-mask" @click.self="$emit('close')">
      <div class="about-modal" :class="[themeClass]">
        <div class="about-header">
          <h3>关于 Rhizome</h3>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>
        <div class="about-body">
          <div class="about-logo"><img src="/img.png" alt="Rhizome" style="filter: var(--logo-filter);" /></div>
          <h2 class="about-name">Rhizome</h2>
          <p class="about-version">v{{ version }}</p>
          <p class="about-desc">简约的本地音乐播放器</p>
          <div class="about-divider"></div>
          <div class="about-meta">
            <div class="about-row">
              <span class="about-label">作者</span>
              <span>AutumnDew</span>
            </div>
            <div class="about-row">
              <span class="about-label">构建</span>
              <span>Electron · Vue 3</span>
            </div>
            <div class="about-row">
              <span class="about-label">年份</span>
              <span>2026</span>
            </div>
            <div class="about-row">
              <span class="about-label">联系</span>
              <span >B站 @AutumnDew</span>
            </div>
          </div>
          <p class="about-thanks-label">特别感谢</p>
          <p class="about-thanks-name">Oud-香水</p>
          <p class="about-thanks">由 AutumnDew 独立开发</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useGlobalTheme } from '@/composables/useGlobalTheme'

defineEmits(['close'])
const { themeClass } = useGlobalTheme()
const version = '1.0.6'
</script>

<style scoped>
.about-mask {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.6); display: flex; align-items: center;
  justify-content: center; z-index: 9999;
}
.about-modal {
  width: 300px; background: var(--bg-primary); color: var(--text-primary);
  border: 2px solid var(--border-color);
}
.about-header {
  padding: 14px 20px; border-bottom: 1px solid var(--border-color);
  display: flex; justify-content: space-between; align-items: center;
}
.about-header h3 { margin: 0; font-size: 14px; }
.close-btn { background: transparent; border: none; color: var(--text-primary); font-size: 16px; cursor: pointer; }
.about-body { padding: 24px 20px; text-align: center; }
.about-logo { font-size: 40px; margin-bottom: 8px; }
.about-logo img { width: 64px; height: 64px; object-fit: contain; }
.about-name { font-size: 20px; margin: 0 0 4px; }
.about-version { font-size: 12px; opacity: 0.5; margin: 0 0 12px; font-family: monospace; }
.about-desc { font-size: 13px; opacity: 0.7; margin: 0 0 16px; }
.about-divider { width: 60px; height: 1px; background: var(--border-color); margin: 0 auto 16px; opacity: 0.4; }
.about-meta { text-align: left; padding: 0 20px; }
.about-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; }
.about-label { opacity: 0.5; }
.about-thanks { font-size: 12px; opacity: 0.4; margin: 20px 0 0; }
.about-thanks-label { font-size: 11px; opacity: 0.35; margin: 16px 0 2px; }
.about-thanks-name { font-size: 13px; margin: 0; }
</style>
