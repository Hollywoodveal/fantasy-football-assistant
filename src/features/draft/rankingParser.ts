import type { ScoringFormat } from '../league/types'
import type { DraftPlayer, PlayerPosition, RankingImportIssue, RankingImportResult } from './types'

const validPositions = new Set<PlayerPosition>(['QB', 'RB', 'WR', 'TE', 'D/ST', 'K'])
const headerAliases = {
  rank: ['rank', 'overall', 'overallrank', 'ecr', 'rk', 'rnk', 'ovr'],
  name: ['player', 'playername', 'name', 'playerteam', 'playerteambye'],
  position: ['position', 'pos', 'elig', 'eligiblepositions'],
  team: ['team', 'nflteam', 'tm', 'proteam'],
  bye: ['bye', 'byeweek', 'byewk'],
  projectedPoints: ['projectedpoints', 'projection', 'proj', 'projpts', 'points', 'fpts', 'fantasypoints'],
  adp: ['adp', 'averagedraftposition', 'avgpick', 'averagepick'],
  tier: ['tier', 'tiers'],
  notes: ['notes', 'note', 'outlook', 'analysis'],
} as const

type CanonicalColumn = keyof typeof headerAliases
type ColumnIndexes = Record<CanonicalColumn, number>

const cleanHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

function detectDelimiter(line: string) {
  const candidates = [',', '\t', '|'] as const
  return candidates.reduce((best, delimiter) => line.split(delimiter).length > line.split(best).length ? delimiter : best, ',')
}

function splitRow(line: string, delimiter: string) {
  const values: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1 } else quoted = !quoted
    } else if (char === delimiter && !quoted) {
      values.push(current.trim())
      current = ''
    } else current += char
  }
  values.push(current.trim())
  return values
}

function columnIndexes(headers: string[]): ColumnIndexes {
  return Object.fromEntries(Object.entries(headerAliases).map(([key, aliases]) => [key, headers.findIndex((header) => (aliases as readonly string[]).includes(header))])) as ColumnIndexes
}

function numberValue(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizePosition(value: string): PlayerPosition | null {
  const prepared = value.toUpperCase().replace(/^D\s*\/\s*ST.*$/, 'DST')
  const first = prepared.split(/[\s,/]+/)[0].replace(/^DEF.*$/, 'D/ST').replace(/^DST.*$/, 'D/ST').replace(/\d+$/, '') as PlayerPosition
  return validPositions.has(first) ? first : null
}

function cleanPlayerName(value: string) {
  return value.replace(/\s+\([A-Z]{2,3}\s*[-–]?\s*\d{1,2}\)\s*$/i, '').replace(/\s+[A-Z]{2,3}\s*[-–]\s*\d{1,2}\s*$/i, '').trim()
}

function playerId(name: string, position: PlayerPosition) {
  const slug = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `import-${slug}-${position.replace('/', '').toLowerCase()}`
}

const delimiterName = (delimiter: string) => delimiter === '\t' ? 'tab' : delimiter === '|' ? 'pipe' : 'comma'

export function parseRankingCsv(text: string, sourceName: string, scoring: ScoringFormat, season = new Date().getFullYear()): RankingImportResult {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const issues: RankingImportIssue[] = []
  if (lines.length < 2) return { dataSet: null, issues: [{ lineNumber: 1, message: 'Add a header row and at least one player.', severity: 'error', suggestion: 'Download the template to see a supported format.' }] }

  const delimiter = detectDelimiter(lines[0])
  const headers = splitRow(lines[0], delimiter).map(cleanHeader)
  const indexes = columnIndexes(headers)
  if (indexes.name < 0 || indexes.position < 0) {
    return { dataSet: null, issues: [{ lineNumber: 1, message: 'Player and Position columns could not be detected.', severity: 'error', suggestion: 'Rename those headers to Player and Position. Rank is optional.' }] }
  }

  const seen = new Set<string>()
  const players: DraftPlayer[] = []
  const positionCounts: Partial<Record<PlayerPosition, number>> = {}
  lines.slice(1).forEach((line, rowIndex) => {
    const cells = splitRow(line, delimiter)
    const rawName = cells[indexes.name]?.trim() ?? ''
    const combinedDetails = rawName.match(/(?:\(|\s)([A-Z]{2,3})\s*[-–]?\s*(\d{1,2})\)?\s*$/i)
    const name = cleanPlayerName(rawName)
    const position = normalizePosition(cells[indexes.position] ?? '')
    const rank = numberValue(indexes.rank >= 0 ? cells[indexes.rank] : '', rowIndex + 1)
    if (!name || !position) {
      issues.push({ lineNumber: rowIndex + 2, message: !name ? 'Player name is missing.' : `Unsupported position: ${cells[indexes.position] || 'blank'}.`, severity: 'error', suggestion: !name ? 'Add a player name.' : 'Use QB, RB, WR, TE, D/ST, DST, DEF, or K.' })
      return
    }
    const duplicateKey = `${name.toLowerCase()}-${position}`
    if (seen.has(duplicateKey)) {
      issues.push({ lineNumber: rowIndex + 2, message: `${name} is duplicated and was skipped.`, severity: 'warning', suggestion: 'Keep only the preferred ranking row.' })
      return
    }
    seen.add(duplicateKey)
    positionCounts[position] = (positionCounts[position] ?? 0) + 1
    players.push({
      id: playerId(name, position),
      name,
      position,
      nflTeam: (indexes.team >= 0 ? cells[indexes.team]?.toUpperCase() : '') || combinedDetails?.[1]?.toUpperCase() || 'FA',
      bye: Math.max(0, Math.min(18, Math.round(numberValue(indexes.bye >= 0 ? (cells[indexes.bye] || combinedDetails?.[2]) : combinedDetails?.[2], 0)))),
      projectedPoints: Math.max(0, numberValue(indexes.projectedPoints >= 0 ? cells[indexes.projectedPoints] : '', 0)),
      adp: Math.max(1, numberValue(indexes.adp >= 0 ? cells[indexes.adp] : '', rank)),
      tier: Math.max(1, Math.round(numberValue(indexes.tier >= 0 ? cells[indexes.tier] : '', Math.ceil(rank / 12)))),
      notes: indexes.notes >= 0 ? (cells[indexes.notes] || `Imported ${position} ranking.`) : `Imported ${position} ranking.`,
    })
  })

  if (!players.length) return { dataSet: null, issues: issues.length ? issues : [{ lineNumber: 1, message: 'No valid players were found.', severity: 'error' }] }
  players.sort((a, b) => a.adp - b.adp)
  const mappedColumns = (Object.keys(indexes) as CanonicalColumn[]).filter((key) => indexes[key] >= 0)
  const projectionCount = players.reduce((count, player) => count + Number(player.projectedPoints > 0), 0)
  return { dataSet: { schemaVersion: 3, sourceName: sourceName.trim() || 'Custom rankings', season, scoring, importedAt: new Date().toISOString(), players, importSummary: { format: 'delimited', delimiter: delimiterName(delimiter), mappedColumns, projectionCount, positionCounts } }, issues }
}

export const rankingCsvTemplate = `Rank,Player,Position,Team,Bye,Projected Points,ADP,Tier,Notes
1,Example Running Back,RB,ATL,12,285.4,1.4,1,Three-down role
2,Example Wide Receiver,WR,CIN,10,312.6,2.8,1,Elite target share
3,Example Quarterback,QB,BUF,7,368.9,23.0,1,Rushing upside`
