<template>
  <button
    class="fav-btn"
    :class="{ active: liked }"
    @click.stop="toggle"
    title="我喜欢"
  >
    <svg viewBox="0 0 24 24" :fill="liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  </button>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useFavorites } from '@/composables/useFavorites'

const props = defineProps({
  song: { type: Object, default: null }
})

const { isFavorited, toggleFavorite } = useFavorites()
const liked = ref(false)

watch(() => props.song, (s) => {
  liked.value = s?.path ? isFavorited(s.path) : false
}, { immediate: true })

const toggle = () => {
  if (!props.song?.path) return
  liked.value = toggleFavorite(props.song.path)
}
</script>

<style scoped>
.fav-btn {
  width: 30px;
  height: 30px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.fav-btn svg {
  width: 14px;
  height: 14px;
}
.fav-btn:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
  border-color: var(--btn-hover-text);
}
.fav-btn.active {
  color: #e74c3c;
  border-color: #e74c3c;
}
.fav-btn.active:hover {
  background: #e74c3c;
  color: #fff;
}
</style>
