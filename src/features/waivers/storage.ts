const STORAGE_KEY = 'fantasy-assistant-waiver-shortlist-v1'

export function loadWaiverShortlist() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

export function saveWaiverShortlist(playerIds: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(playerIds)]))
    return true
  } catch {
    return false
  }
}
