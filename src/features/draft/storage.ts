import type { DraftSession } from './types'

const STORAGE_KEY = 'fantasy-assistant-draft-v1'

export function loadDraftSession(): DraftSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DraftSession
    return parsed.schemaVersion === 1 && Array.isArray(parsed.picks) ? parsed : null
  } catch {
    return null
  }
}

export function saveDraftSession(session: DraftSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    return true
  } catch {
    return false
  }
}

export function clearDraftSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
