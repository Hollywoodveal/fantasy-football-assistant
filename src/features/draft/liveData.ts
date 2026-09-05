import type { DraftDataSet, DraftPlayer, LivePlayerDataResponse, LivePlayerRecord, PlayerPosition } from './types'

const LIVE_DATA_PATH = '/api/live-data'
const REFRESH_AFTER_MS = 12 * 60 * 60 * 1000
const LIVE_POSITIONS = new Set<PlayerPosition>(['QB', 'RB', 'WR', 'TE', 'D/ST', 'K'])

const normalizedName = (value: string) => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\b(jr|sr|ii|iii|iv)\b/g, '')
  .replace(/[^a-z0-9]/g, '')

const playerKey = (name: string, position: PlayerPosition) => `${normalizedName(name)}:${position}`

function isLivePlayerRecord(value: unknown): value is LivePlayerRecord {
  if (!value || typeof value !== 'object') return false
  const player = value as Partial<LivePlayerRecord>
  return typeof player.providerPlayerId === 'string'
    && typeof player.name === 'string'
    && typeof player.position === 'string'
    && LIVE_POSITIONS.has(player.position as PlayerPosition)
    && typeof player.nflTeam === 'string'
    && typeof player.availabilityStatus === 'string'
    && typeof player.injuryStatus === 'string'
}

function isLiveDataResponse(value: unknown): value is LivePlayerDataResponse {
  if (!value || typeof value !== 'object') return false
  const response = value as Partial<LivePlayerDataResponse>
  return response.schemaVersion === 1
    && response.provider?.id === 'sleeper'
    && typeof response.provider.name === 'string'
    && typeof response.provider.usage === 'string'
    && typeof response.season === 'number'
    && typeof response.week === 'number'
    && typeof response.seasonType === 'string'
    && typeof response.refreshedAt === 'string'
    && Array.isArray(response.players)
    && response.players.every(isLivePlayerRecord)
}

export function liveDataNeedsRefresh(dataSet: DraftDataSet) {
  if (!dataSet.liveData) return true
  const refreshedAt = new Date(dataSet.liveData.refreshedAt).getTime()
  return !Number.isFinite(refreshedAt) || Date.now() - refreshedAt >= REFRESH_AFTER_MS
}

export function mergeLivePlayerData(dataSet: DraftDataSet, response: LivePlayerDataResponse): DraftDataSet {
  const byNameAndPosition = new Map(response.players.map((player) => [playerKey(player.name, player.position), player]))
  const defensesByTeam = new Map(response.players.filter((player) => player.position === 'D/ST').map((player) => [player.nflTeam, player]))
  let matchedPlayers = 0

  const players: DraftPlayer[] = dataSet.players.map((player) => {
    const livePlayer = byNameAndPosition.get(playerKey(player.name, player.position))
      ?? (player.position === 'D/ST' ? defensesByTeam.get(player.nflTeam) : undefined)
    if (!livePlayer) return player
    matchedPlayers += 1
    return {
      ...player,
      nflTeam: livePlayer.nflTeam || player.nflTeam,
      providerPlayerId: livePlayer.providerPlayerId,
      availabilityStatus: livePlayer.availabilityStatus,
      injuryStatus: livePlayer.injuryStatus,
      liveUpdatedAt: response.refreshedAt,
    }
  })

  return {
    ...dataSet,
    schemaVersion: 3,
    season: response.season || dataSet.season,
    players,
    liveData: {
      schemaVersion: 1,
      providerId: response.provider.id,
      providerName: response.provider.name,
      season: response.season,
      week: response.week,
      seasonType: response.seasonType,
      refreshedAt: response.refreshedAt,
      matchedPlayers,
      providerPlayers: response.players.length,
    },
  }
}

export async function refreshLivePlayerData(dataSet: DraftDataSet, signal?: AbortSignal) {
  let response: Response
  try {
    response = await fetch(LIVE_DATA_PATH, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new Error('Live player data is temporarily unavailable. Your saved rankings are still available.')
  }
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
      ? payload.message
      : 'Live player data is temporarily unavailable.'
    throw new Error(message)
  }
  if (!isLiveDataResponse(payload)) throw new Error('The live player data response was not recognized.')
  return mergeLivePlayerData(dataSet, payload)
}
