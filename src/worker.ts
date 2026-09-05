import {
  buildEspnLeagueUrl,
  parseEspnLeague,
  validateEspnSyncInput,
  type EspnLeagueDocument,
} from './features/league/espnSync.ts'

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
const ESPN_LEAGUE_PATH = '/api/espn/league'
const ESPN_CACHE_NAME = 'fantasy-assistant-espn-public-v1'
const ESPN_EDGE_TTL_SECONDS = 300
const ESPN_BROWSER_TTL_SECONDS = 60

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

async function handleEspnLeague(request: Request, context: WorkerContext) {
  const requestUrl = new URL(request.url)
  let input: { leagueId: string; season: number }
  try {
    input = validateEspnSyncInput(requestUrl.searchParams.get('leagueId'), requestUrl.searchParams.get('season'))
  } catch (error) {
    return jsonResponse({
      code: 'invalid_espn_league',
      message: error instanceof Error ? error.message : 'Enter a valid ESPN League ID and season.',
    }, 400, { 'Cache-Control': 'no-store' })
  }

  const cache = await caches.open(ESPN_CACHE_NAME)
  const cacheUrl = new URL(ESPN_LEAGUE_PATH, request.url)
  cacheUrl.search = new URLSearchParams({ leagueId: input.leagueId, season: String(input.season) }).toString()
  const cacheKey = new Request(cacheUrl, { method: 'GET' })
  const cached = await cache.match(cacheKey)
  if (cached) {
    const headers = new Headers(cached.headers)
    headers.set('Cache-Control', `public, max-age=${ESPN_BROWSER_TTL_SECONDS}`)
    headers.set('X-Fantasy-ESPN-Cache', 'HIT')
    return new Response(cached.body, { status: cached.status, headers })
  }

  let providerResponse: Response
  try {
    providerResponse = await fetch(buildEspnLeagueUrl(input.leagueId, input.season), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Fantasy-Assistant/0.1 (read-only public league sync)',
      },
    })
  } catch {
    return jsonResponse({
      code: 'espn_unavailable',
      message: 'ESPN could not be reached. Your saved roster is unchanged; try again or use manual import.',
    }, 502, { 'Cache-Control': 'no-store' })
  }

  if (providerResponse.status === 401 || providerResponse.status === 403) {
    return jsonResponse({
      code: 'espn_private_league',
      message: 'ESPN did not expose this league publicly. Make the league public while syncing, or use manual roster import.',
    }, 403, { 'Cache-Control': 'no-store' })
  }
  if (providerResponse.status === 404) {
    return jsonResponse({
      code: 'espn_league_not_found',
      message: 'ESPN could not find that league for the selected season. Check the League ID and season.',
    }, 404, { 'Cache-Control': 'no-store' })
  }
  if (!providerResponse.ok) {
    return jsonResponse({
      code: 'espn_unavailable',
      message: 'ESPN league data is temporarily unavailable. Your saved roster is unchanged.',
    }, 502, { 'Cache-Control': 'no-store' })
  }

  try {
    const document = await providerResponse.json() as EspnLeagueDocument
    const payload = parseEspnLeague(document, input.leagueId, input.season)
    const serialized = JSON.stringify(payload)
    const cachedResponse = new Response(serialized, {
      headers: { ...apiHeaders, 'Cache-Control': `public, max-age=${ESPN_EDGE_TTL_SECONDS}` },
    })
    context.waitUntil(cache.put(cacheKey, cachedResponse.clone()))
    return new Response(serialized, {
      headers: {
        ...apiHeaders,
        'Cache-Control': `public, max-age=${ESPN_BROWSER_TTL_SECONDS}`,
        'X-Fantasy-ESPN-Cache': 'MISS',
      },
    })
  } catch {
    return jsonResponse({
      code: 'espn_response_invalid',
      message: 'ESPN returned league data in an unsupported format. Your saved roster is unchanged.',
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
    if (url.pathname === ESPN_LEAGUE_PATH) {
      if (request.method !== 'GET') return jsonResponse({ code: 'method_not_allowed', message: 'Only GET is supported.' }, 405, { Allow: 'GET' })
      return handleEspnLeague(request, context)
    }
    if (url.pathname === '/api/health') {
      return jsonResponse({ status: 'ok', app: 'Fantasy Assistant', phase: '3.2' }, 200, { 'Cache-Control': 'no-store' })
    }
    if (url.pathname.startsWith('/api/')) return jsonResponse({ code: 'not_found', message: 'API route not found.' }, 404, { 'Cache-Control': 'no-store' })
    return environment.ASSETS.fetch(request)
  },
}
