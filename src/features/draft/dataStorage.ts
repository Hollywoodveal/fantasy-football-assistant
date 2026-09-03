import { draftPlayers } from './players'
import type { DraftDataSet } from './types'

const STORAGE_KEY = 'fantasy-assistant-rankings-v1'

export function builtInDataSet(): DraftDataSet {
  return {
    schemaVersion: 2,
    sourceName: 'Fantasy Assistant demo',
    season: new Date().getFullYear(),
    scoring: 'PPR',
    importedAt: '2026-09-03T00:00:00.000Z',
    players: draftPlayers,
  }
}

export function loadDraftDataSet(): DraftDataSet {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return builtInDataSet()
    const parsed = JSON.parse(raw) as DraftDataSet & { schemaVersion: number }
    if (![1, 2].includes(parsed.schemaVersion) || !Array.isArray(parsed.players) || !parsed.players.length) return builtInDataSet()
    return { ...parsed, schemaVersion: 2 }
  } catch {
    return builtInDataSet()
  }
}

export function saveDraftDataSet(dataSet: DraftDataSet) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataSet))
    return true
  } catch {
    return false
  }
}

export function clearDraftDataSet() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
