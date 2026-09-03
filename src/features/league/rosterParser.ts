import type {
  ImportedPlayer,
  PlayerPosition,
  RosterParseError,
  RosterParseResult,
  RosterSlot,
} from './types'

const positionAliases: Record<string, PlayerPosition> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
  K: 'K',
  DST: 'D/ST',
  DEF: 'D/ST',
  'D/ST': 'D/ST',
}

const slotAliases: Record<string, RosterSlot> = {
  START: 'Starter',
  STARTER: 'Starter',
  FLEX: 'Starter',
  OP: 'Starter',
  BENCH: 'Bench',
  BE: 'Bench',
  BN: 'Bench',
  IR: 'IR',
  RESERVE: 'IR',
}

const headerPattern = /^(position|pos)(\s*[|,\t]\s*|\s+)player/i
const teamPattern = /^[A-Z]{2,3}$/

function normalizePosition(value: string): PlayerPosition | null {
  return positionAliases[value.trim().toUpperCase().replaceAll('.', '')] ?? null
}

function normalizeSlot(value?: string): RosterSlot {
  if (!value) return 'Bench'
  return slotAliases[value.trim().toUpperCase()] ?? 'Bench'
}

function createPlayerId(name: string, position: PlayerPosition, lineNumber: number) {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `${position.toLowerCase().replace('/', '')}-${slug}-${lineNumber}`
}

function parseDelimitedLine(line: string, lineNumber: number): ImportedPlayer | null {
  const parts = line.split(/\s*[|,\t]\s*/).map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2) return null

  const firstPosition = normalizePosition(parts[0])
  const secondPosition = normalizePosition(parts[1])
  const position = firstPosition ?? secondPosition
  if (!position) return null

  const nameIndex = firstPosition ? 1 : 0
  const name = parts[nameIndex]
  if (!name || name.length < 2) return null

  const remaining = parts.filter((_, index) => index !== nameIndex && normalizePosition(parts[index]) !== position)
  const slotToken = remaining.find((part) => slotAliases[part.toUpperCase()])
  const teamToken = remaining.find((part) => teamPattern.test(part.toUpperCase()) && !slotAliases[part.toUpperCase()])

  return {
    id: createPlayerId(name, position, lineNumber),
    name,
    position,
    nflTeam: teamToken?.toUpperCase() ?? 'FA',
    slot: normalizeSlot(slotToken),
  }
}

function parseSpaceDelimitedLine(line: string, lineNumber: number): ImportedPlayer | null {
  const tokens = line.trim().split(/\s+/)
  const position = normalizePosition(tokens[0])
  if (!position) return null

  tokens.shift()
  const possibleSlot = tokens.at(-1)
  const slot = possibleSlot && slotAliases[possibleSlot.toUpperCase()]
    ? normalizeSlot(tokens.pop())
    : 'Bench'
  const possibleTeam = tokens.at(-1)?.toUpperCase()
  const nflTeam = possibleTeam && teamPattern.test(possibleTeam) ? (tokens.pop() ?? 'FA').toUpperCase() : 'FA'
  const name = tokens.join(' ').trim()
  if (name.length < 2) return null

  return {
    id: createPlayerId(name, position, lineNumber),
    name,
    position,
    nflTeam,
    slot,
  }
}

export function parseRosterText(source: string): RosterParseResult {
  const players: ImportedPlayer[] = []
  const errors: RosterParseError[] = []
  const seen = new Set<string>()

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1
    const line = rawLine.trim()
    if (!line || headerPattern.test(line)) return

    const player = /[|,\t]/.test(line)
      ? parseDelimitedLine(line, lineNumber)
      : parseSpaceDelimitedLine(line, lineNumber)

    if (!player) {
      errors.push({
        lineNumber,
        source: line,
        message: 'Use: Position | Player | NFL team | Starter, Bench, or IR',
      })
      return
    }

    const identity = `${player.position}:${player.name.toLowerCase()}`
    if (seen.has(identity)) {
      errors.push({ lineNumber, source: line, message: 'Duplicate player skipped' })
      return
    }

    seen.add(identity)
    players.push(player)
  })

  return { players, errors }
}

export function serializeRoster(roster: ImportedPlayer[]) {
  return roster
    .map((player) => `${player.position} | ${player.name} | ${player.nflTeam} | ${player.slot}`)
    .join('\n')
}

export const sampleRosterText = `QB | Jordan Love | GB | Starter
RB | Zamir White | LV | Starter
RB | Chase Brown | CIN | Starter
WR | Tank Dell | HOU | Starter
WR | Jaxon Smith-Njigba | SEA | Starter
TE | Jonnu Smith | MIA | Starter
K | Brandon Aubrey | DAL | Starter
D/ST | Pittsburgh Steelers | PIT | Starter
QB | Geno Smith | LV | Bench
RB | Tyjae Spears | TEN | Bench
WR | Christian Watson | GB | Bench
WR | Josh Downs | IND | Bench
RB | Ray Davis | BUF | Bench`
