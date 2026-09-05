type AssetBinding = {
  fetch(request: Request): Promise<Response>
}

type WorkerEnvironment = {
  ASSETS: AssetBinding
}

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void
}

type SleeperPlayer = {
  player_id?: string
  full_name?: string
  first_name?: string
  last_name?: string
  position?: string
  fantasy_positions?: string[]
  team?: string | null
  status?: string | null
  injury_status?: string | null
  active?: boolean
}

type SleeperState = {
  season?: string
  week?: number
  season_type?: string
}

type LivePosition = 'QB' | 'RB' | 'WR' | 'TE' | 'D/ST' | 'K'

const PLAYER_DATA_URL = 'https://api.sleeper.app/v1/players/nfl?active=true'
const NFL_STATE_URL = 'https://api.sleeper.app/v1/state/nfl'
const CACHE_NAME = 'fantasy-assistant-live-data-v1'
const CACHE_TTL_SECONDS = 86_400
const BROWSER_TTL_SECONDS = 900
const LIVE_DATA_PATH = '/api/live-data'

const apiHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
}

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...apiHeaders, ...extraHeaders } })
}

function normalizePosition(player: SleeperPlayer): LivePosition | null {
  const raw = (player.position || player.fantasy_positions?.[0] || '').toUpperCase()
  if (raw === 'DEF' || raw === 'DST' || raw === 'D/ST') return 'D/ST'
  return ['QB', 'RB', 'WR', 'TE', 'K'].includes(raw) ? raw as LivePosition : null
}

function playerName(player: SleeperPlayer) {
  return player.full_name?.trim() || [player.first_name, player.last_name].filter(Boolean).join(' ').trim()
}

async function fetchProviderJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Fantasy-Assistant/0.1' } })
  if (!response.ok) throw new Error(`Provider request failed with status ${response.status}.`)
  return response.json() as Promise<T>
}

async function buildLiveDataPayload() {
  const [playerMap, state] = await Promise.all([
    fetchProviderJson<Record<string, SleeperPlayer>>(PLAYER_DATA_URL),
    fetchProviderJson<SleeperState>(NFL_STATE_URL),
  ])
  const refreshedAt = new Date().toISOString()
  const players = Object.entries(playerMap).flatMap(([mapId, player]) => {
    const position = normalizePosition(player)
    const name = playerName(player)
    if (!position || !name || player.active === false) return []
    return [{
      providerPlayerId: player.player_id || mapId,
      name,
      position,
      nflTeam: player.team?.toUpperCase() || 'FA',
      availabilityStatus: player.status || (player.team ? 'Active' : 'Free Agent'),
      injuryStatus: player.injury_status || '',
    }]
  }).sort((first, second) => first.position.localeCompare(second.position) || first.name.localeCompare(second.name))

  if (players.length === 0) {
    throw new Error('Provider returned no active fantasy players.')
  }

  return {
    schemaVersion: 1,
    provider: {
      id: 'sleeper',
      name: 'Sleeper',
      usage: 'Read-only player metadata for non-commercial use; rankings and projections are not supplied.',
    },
    season: Number(state.season) || new Date().getUTCFullYear(),
    week: Number(state.week) || 0,
    seasonType: state.season_type || 'unknown',
    refreshedAt,
    players,
  }
}

async function handleLiveData(request: Request, context: WorkerContext) {
  const cache = await caches.open(CACHE_NAME)
  const cacheKey = new Request(new URL(LIVE_DATA_PATH, request.url), { method: 'GET' })
  const cached = await cache.match(cacheKey)
  if (cached) {
    const headers = new Headers(cached.headers)
    headers.set('Cache-Control', `public, max-age=${BROWSER_TTL_SECONDS}`)
    headers.set('X-Fantasy-Data-Cache', 'HIT')
    return new Response(cached.body, { status: cached.status, headers })
  }

  try {
    const payload = await buildLiveDataPayload()
    const serialized = JSON.stringify(payload)
    const cachedResponse = new Response(serialized, {
      headers: { ...apiHeaders, 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` },
    })
    context.waitUntil(cache.put(cacheKey, cachedResponse.clone()))
    return new Response(serialized, {
      headers: { ...apiHeaders, 'Cache-Control': `public, max-age=${BROWSER_TTL_SECONDS}`, 'X-Fantasy-Data-Cache': 'MISS' },
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown provider error.'
    return jsonResponse({
      code: 'live_data_unavailable',
      message: 'Live player metadata could not be refreshed. Your saved rankings are still available.',
      detail,
    }, 502, { 'Cache-Control': 'no-store' })
  }
}

export default {
  async fetch(request: Request, environment: WorkerEnvironment, context: WorkerContext) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } })
    }
    if (url.pathname === LIVE_DATA_PATH) {
      if (request.method !== 'GET') return jsonResponse({ code: 'method_not_allowed', message: 'Only GET is supported.' }, 405, { Allow: 'GET' })
      return handleLiveData(request, context)
    }
    if (url.pathname === '/api/health') {
      return jsonResponse({ status: 'ok', app: 'Fantasy Assistant', phase: '2.4.1' }, 200, { 'Cache-Control': 'no-store' })
    }
    if (url.pathname.startsWith('/api/')) return jsonResponse({ code: 'not_found', message: 'API route not found.' }, 404, { 'Cache-Control': 'no-store' })
    return environment.ASSETS.fetch(request)
  },
}
