import type { DraftBoardPreferences } from './types'

const STORAGE_KEY = 'fantasy-assistant-draft-board-v1'

const emptyPreferences = (): DraftBoardPreferences => ({ schemaVersion: 1, favorites: [], notes: {} })

export function loadDraftBoardPreferences(): DraftBoardPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyPreferences()
    const parsed = JSON.parse(raw) as DraftBoardPreferences
    return parsed.schemaVersion === 1 && Array.isArray(parsed.favorites) && parsed.notes && typeof parsed.notes === 'object'
      ? parsed
      : emptyPreferences()
  } catch {
    return emptyPreferences()
  }
}

export function saveDraftBoardPreferences(preferences: DraftBoardPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    return true
  } catch {
    return false
  }
}
