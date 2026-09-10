import type { WaiverContinuityRecord, WaiverOutcomeStatus } from './waiverContinuity.ts'

const STORAGE_KEY = 'fantasy-assistant-waiver-shortlist-v1'
const HISTORY_STORAGE_KEY = 'fantasy-assistant-waiver-history-v1'
const outcomeStatuses: WaiverOutcomeStatus[] = ['pending', 'won', 'lost', 'skipped']

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

function isContinuityRecord(value: unknown): value is WaiverContinuityRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<WaiverContinuityRecord>
  return record.schemaVersion === 1
    && typeof record.id === 'string'
    && typeof record.leagueId === 'string'
    && typeof record.teamId === 'number'
    && typeof record.season === 'number'
    && typeof record.week === 'number'
    && typeof record.syncedAt === 'string'
    && (record.verification === 'all-rosters' || record.verification === 'selected-roster-only')
    && Array.isArray(record.added)
    && Array.isArray(record.dropped)
    && Array.isArray(record.claims)
    && record.claims.every((claim) => claim
      && typeof claim.playerId === 'string'
      && typeof claim.name === 'string'
      && outcomeStatuses.includes(claim.status))
    && typeof record.lineupRefreshRequired === 'boolean'
}

export function loadWaiverHistory() {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isContinuityRecord) : []
  } catch {
    return []
  }
}

export function saveWaiverHistory(records: WaiverContinuityRecord[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records.slice(0, 30)))
    return true
  } catch {
    return false
  }
}

export function upsertWaiverHistory(records: WaiverContinuityRecord[], record: WaiverContinuityRecord) {
  return [record, ...records.filter((item) => item.id !== record.id)]
    .sort((first, second) => Date.parse(second.syncedAt) - Date.parse(first.syncedAt))
    .slice(0, 30)
}
