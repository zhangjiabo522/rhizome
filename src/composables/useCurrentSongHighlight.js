import { usePlayerStore } from '@/stores/playerStore'

export function useCurrentSongHighlight() {
  const playerStore = usePlayerStore()

  const isCurrentSong = (item) => {
    const s = playerStore.currentSong
    if (!s) return false
    return s.path === item.path
  }

  return { isCurrentSong }
}
