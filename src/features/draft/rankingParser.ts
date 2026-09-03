import type { ScoringFormat } from '../league/types'
import type { DraftPlayer, PlayerPosition, RankingImportIssue, RankingImportResult } from './types'

const validPositions = new Set<PlayerPosition>(['QB', 'RB', 'WR', 'TE', 'D/ST', 'K'])
const headerAliases: Record<string, string[]> = {
  rank: ['rank', 'overall', 'overallrank', 'ecr', 'rk'],
  name: ['player', 'playername', 'name'],
  position: ['position', 'pos'],
  team: ['team', 'nflteam', 'tm'],
  bye: ['bye', 'byeweek'],
  projectedPoints: ['projectedpoints', 'projection', 'proj', 'projpts', 'points', 'fpts'],
  adp: ['adp', 'averagedraftposition'],
  tier: ['tier'],
  notes: ['notes', 'note', 'outlook'],
}

function cleanHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function detectDelimiter(line: string) {
  const candidates = [',', '\t', '|']
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

function columnIndex(headers: string[], key: keyof typeof headerAliases) {
  return headers.findIndex((header) => headerAliases[key].includes(header))
}

function numberValue(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizePosition(value: string): PlayerPosition | null {
  const normalized = value.toUpperCase().replace('DEF', 'D/ST').replace('DST', 'D/ST') as PlayerPosition
  return validPositions.has(normalized) ? normalized : null
}

function playerId(name: string, position: PlayerPosition, index: number) {
  const slug = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `import-${slug}-${position.replace('/', '').toLowerCase()}-${index}`
}

export function parseRankingCsv(text: string, sourceName: string, scoring: ScoringFormat, season = new Date().getFullYear()): RankingImportResult {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const issues: RankingImportIssue[] = []
  if (lines.length < 2) return { dataSet: null, issues: [{ lineNumber: 1, message: 'Add a header row and at least one player.' }] }

  const delimiter = detectDelimiter(lines[0])
  const headers = splitRow(lines[0], delimiter).map(cleanHeader)
  const indexes = {
    rank: columnIndex(headers, 'rank'), name: columnIndex(headers, 'name'), position: columnIndex(headers, 'position'),
    team: columnIndex(headers, 'team'), bye: columnIndex(headers, 'bye'), projectedPoints: columnIndex(headers, 'projectedPoints'),
    adp: columnIndex(headers, 'adp'), tier: columnIndex(headers, 'tier'), notes: columnIndex(headers, 'notes'),
  }
  if (indexes.rank < 0 || indexes.name < 0 || indexes.position < 0) {
    return { dataSet: null, issues: [{ lineNumber: 1, message: 'Required headers: Rank, Player, and Position.' }] }
  }

  const seen = new Set<string>()
  const players: DraftPlayer[] = []
  lines.slice(1).forEach((line, rowIndex) => {
    const cells = splitRow(line, delimiter)
    const name = cells[indexes.name]?.trim()
    const position = normalizePosition(cells[indexes.position] ?? '')
    const rank = numberValue(cells[indexes.rank], rowIndex + 1)
    if (!name || !position) {
      issues.push({ lineNumber: rowIndex + 2, message: !name ? 'Player name is missing.' : `Unsupported position: ${cells[indexes.position] || 'blank'}.` })
      return
    }
    const duplicateKey = `${name.toLowerCase()}-${position}`
    if (seen.has(duplicateKey)) {
      issues.push({ lineNumber: rowIndex + 2, message: `${name} is duplicated and was skipped.` })
      return
    }
    seen.add(duplicateKey)
    players.push({
      id: playerId(name, position, players.length + 1), name, position,
      nflTeam: indexes.team >= 0 ? (cells[indexes.team]?.toUpperCase() || 'FA') : 'FA',
      bye: Math.max(0, Math.min(18, Math.round(numberValue(indexes.bye >= 0 ? cells[indexes.bye] : '', 0)))),
      projectedPoints: Math.max(0, numberValue(indexes.projectedPoints >= 0 ? cells[indexes.projectedPoints] : '', 0)),
      adp: Math.max(1, numberValue(indexes.adp >= 0 ? cells[indexes.adp] : '', rank)),
      tier: Math.max(1, Math.round(numberValue(indexes.tier >= 0 ? cells[indexes.tier] : '', Math.ceil(rank / 12)))),
      notes: indexes.notes >= 0 ? (cells[indexes.notes] || `Imported ${position} ranking.`) : `Imported ${position} ranking.`,
    })
  })

  if (!players.length) return { dataSet: null, issues: issues.length ? issues : [{ lineNumber: 1, message: 'No valid players were found.' }] }
  players.sort((a, b) => a.adp - b.adp)
  return { dataSet: { schemaVersion: 1, sourceName: sourceName.trim() || 'Custom rankings', season, scoring, importedAt: new Date().toISOString(), players }, issues }
}

export const rankingCsvTemplate = `Rank,Player,Position,Team,Bye,Projected Points,ADP,Tier,Notes
1,Example Running Back,RB,ATL,12,285.4,1.4,1,Three-down role
2,Example Wide Receiver,WR,CIN,10,312.6,2.8,1,Elite target share
3,Example Quarterback,QB,BUF,7,368.9,23.0,1,Rushing upside`
