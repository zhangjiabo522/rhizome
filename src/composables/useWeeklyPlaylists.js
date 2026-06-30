const WEEKLY_KEY = 'rhizome-weekly-playlists'
const ENABLED_KEY = 'rhizome-weekly-playlists-enabled'

function getWeekKey() {
  const now = new Date()
  const year = now.getFullYear()
  // ISO week number
  const jan1 = new Date(year, 0, 1)
  const days = Math.floor((now - jan1) / 86400000)
  const week = Math.ceil((days + jan1.getDay() + 1) / 7)
  return `${year}-W${week}`
}

export function isWeeklyEnabled() {
  return localStorage.getItem(ENABLED_KEY) === 'true'
}

export function setWeeklyEnabled(val) {
  localStorage.setItem(ENABLED_KEY, String(!!val))
}

export function checkAndGenerateWeekly(songList) {
  if (!isWeeklyEnabled()) return null
  if (!songList || !songList.length) return null

  const weekKey = getWeekKey()
  const meta = JSON.parse(localStorage.getItem(WEEKLY_KEY) || '{}')

  if (meta.weekKey === weekKey) return null // Already generated this week

  // Double-check: does a playlist with this week's ID already exist?
  const existingPlaylists = JSON.parse(localStorage.getItem('local_playlists') || '[]')
  if (existingPlaylists.some(p => p.localId === `__weekly_top__${weekKey}`)) return null

  try {
    // Get play history with timestamps
    const history = JSON.parse(localStorage.getItem('playHistoryView') || '[]')
    const countMap = JSON.parse(localStorage.getItem('playCountReal') || '{}')

    // Current week's start (Monday 00:00)
    const now = new Date()
    const dayOfWeek = now.getDay() || 7 // Sun=7
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek + 1)
    weekStart.setHours(0, 0, 0, 0)

    // Songs played this week (by path)
    const thisWeekPlays = {}
    history.forEach(h => {
      if (h.playAt >= weekStart.getTime()) {
        thisWeekPlays[h.path] = (thisWeekPlays[h.path] || 0) + 1
      }
    })

    // Also use overall count for this week's discovery
    const playedPaths = new Set(Object.keys(countMap))

    // Top 10 this week
    const top10 = songList
      .map(s => ({ ...s, weeklyPlays: thisWeekPlays[s.path] || 0 }))
      .filter(s => s.weeklyPlays > 0)
      .sort((a, b) => b.weeklyPlays - a.weeklyPlays)
      .slice(0, 10)

    // Discovery: songs never played, then least played
    const neverPlayed = songList.filter(s => !playedPaths.has(s.path))
    const leastPlayed = songList
      .filter(s => playedPaths.has(s.path))
      .sort((a, b) => (countMap[a.path] || 0) - (countMap[b.path] || 0))

    const discovery = [...neverPlayed, ...leastPlayed].slice(0, 10)

    const result = {
      weekKey,
      top10: top10.map(s => s.path),
      discovery: discovery.map(s => s.path),
    }

    // Save as playlists
    const playlists = JSON.parse(localStorage.getItem('local_playlists') || '[]')
    const songsMap = JSON.parse(localStorage.getItem('local_playlist_songs') || '{}')

    // Remove ALL existing weekly playlists from the main list (we'll re-add only recent 4)
    const nonWeekly = playlists.filter(p => !p.localId?.startsWith('__weekly_top__') && !p.localId?.startsWith('__weekly_discovery__'))

    if (result.top10.length) {
      nonWeekly.push({
        localId: `__weekly_top__${weekKey}`,
        title: `本周最爱 · ${weekKey}`,
        intro: '本周听得最多的十首歌',
        isAuto: true,
        createdAt: Date.now()
      })
      songsMap[`__weekly_top__${weekKey}`] = result.top10
    }

    if (result.discovery.length) {
      nonWeekly.push({
        localId: `__weekly_discovery__${weekKey}`,
        title: `每周发现 · ${weekKey}`,
        intro: '还没听过的十首歌',
        isAuto: true,
        createdAt: Date.now()
      })
      songsMap[`__weekly_discovery__${weekKey}`] = result.discovery
    }

    // Keep only last 4 weeks (8 playlists max: 2 per week)
    const topIds = nonWeekly
      .filter(p => p.localId?.startsWith('__weekly_top__'))
      .sort((a, b) => b.createdAt - a.createdAt)
    const discIds = nonWeekly
      .filter(p => p.localId?.startsWith('__weekly_discovery__'))
      .sort((a, b) => b.createdAt - a.createdAt)

    const keepIds = new Set([
      ...topIds.slice(0, 4).map(p => p.localId),
      ...discIds.slice(0, 4).map(p => p.localId),
    ])

    const final = nonWeekly.filter(p => {
      if (p.localId?.startsWith('__weekly_top__') || p.localId?.startsWith('__weekly_discovery__')) {
        return keepIds.has(p.localId)
      }
      return true
    })

    // Clean up orphaned songs maps
    for (const key of Object.keys(songsMap)) {
      if ((key.startsWith('__weekly_top__') || key.startsWith('__weekly_discovery__')) && !keepIds.has(key)) {
        delete songsMap[key]
      }
    }

    localStorage.setItem('local_playlists', JSON.stringify(final))
    localStorage.setItem('local_playlist_songs', JSON.stringify(songsMap))
    localStorage.setItem(WEEKLY_KEY, JSON.stringify({ weekKey }))

    return result
  } catch (e) {
    console.error('[weekly] generation failed', e)
    return null
  }
}
