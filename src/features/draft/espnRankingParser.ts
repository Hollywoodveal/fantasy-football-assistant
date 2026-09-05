import type { ScoringFormat } from '../league/types'
import type { DraftPlayer, PlayerPosition, RankingImportIssue, RankingImportResult } from './types'

const espnPlayerPattern = /\b(\d{1,3})\.\s*\((QB|RB|WR|TE|K|DST)(\d{1,3})\)\s+(.+?),\s+([A-Z]{2,3})\s+\$(\d+)\s+(\d{1,2})(?=\s|$)/g

function playerId(name: string, position: PlayerPosition) {
  const slug = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `espn-${slug}-${position.replace('/', '').toLowerCase()}`
}

function sourceUpdatedAt(text: string) {
  const match = text.match(/Last Update:\s*([A-Za-z]+,\s+[A-Za-z]+\s+\d{1,2},\s+\d{4})/i)
  if (!match) return new Date().toISOString()
  const parsed = new Date(`${match[1]} 12:00:00 UTC`)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

export function detectEspnScoring(text: string, fallback: ScoringFormat): ScoringFormat {
  if (/Non[-\s]?PPR|0\s+PPR/i.test(text)) return 'Standard'
  if (/PPR Top 300|1\s+PPR/i.test(text)) return fallback === 'Half PPR' ? fallback : 'PPR'
  return fallback
}

function espnSheetName(text: string) {
  return /Non[-\s]?PPR|0\s+PPR/i.test(text) ? 'Non-PPR' : 'PPR'
}

export function parseEspnRankingText(text: string, scoring: ScoringFormat): RankingImportResult {
  const normalized = text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  const detectedScoring = detectEspnScoring(normalized, scoring)
  const issues: RankingImportIssue[] = []
  const players: DraftPlayer[] = []
  const positionCounts: Partial<Record<PlayerPosition, number>> = {}
  const seenRanks = new Set<number>()
  const seenPlayers = new Set<string>()
  let match: RegExpExecArray | null

  espnPlayerPattern.lastIndex = 0
  while ((match = espnPlayerPattern.exec(normalized)) !== null) {
    const rank = Number(match[1])
    const rawPosition = match[2]
    const position = (rawPosition === 'DST' ? 'D/ST' : rawPosition) as PlayerPosition
    const positionRank = Number(match[3])
    const name = match[4].trim()
    const nflTeam = match[5]
    const salaryCapValue = Number(match[6])
    const bye = Number(match[7])
    const duplicateKey = `${name.toLowerCase()}-${position}`

    if (rank < 1 || rank > 500 || seenRanks.has(rank) || seenPlayers.has(duplicateKey)) continue
    seenRanks.add(rank)
    seenPlayers.add(duplicateKey)
    positionCounts[position] = (positionCounts[position] ?? 0) + 1
    players.push({
      id: playerId(name, position),
      name,
      position,
      nflTeam,
      bye: Math.max(0, Math.min(18, bye)),
      projectedPoints: 0,
      adp: rank,
      tier: Math.max(1, Math.ceil(rank / 12)),
      notes: `ESPN ${rawPosition}${positionRank} · $${salaryCapValue} salary cap value`,
    })
  }

  if (!players.length) {
    return {
      dataSet: null,
      issues: [{
        lineNumber: 1,
        message: 'No ESPN Top 300 rankings were detected in this PDF.',
        severity: 'error',
        suggestion: 'Use ESPN\'s current PPR or non-PPR Top 300 cheat sheet. Image-only and positional-only PDFs are not supported.',
      }],
    }
  }

  players.sort((a, b) => a.adp - b.adp)
  if (players.length < 150) {
    issues.push({
      lineNumber: 1,
      message: `Only ${players.length} ESPN ranking entries were detected.`,
      severity: 'warning',
      suggestion: 'Use the Top 300 cheat sheet instead of the positional or beginner sheet for full-draft coverage.',
    })
  }

  const importedAt = sourceUpdatedAt(normalized)
  const season = new Date(importedAt).getUTCFullYear()
  return {
    dataSet: {
      schemaVersion: 3,
      sourceName: `ESPN ${espnSheetName(normalized)} Top 300`,
      season,
      scoring: detectedScoring,
      importedAt,
      players,
      importSummary: {
        format: 'espn-pdf',
        delimiter: 'comma',
        mappedColumns: ['rank', 'player', 'position', 'team', 'bye', 'salary cap value'],
        projectionCount: 0,
        positionCounts,
      },
    },
    issues,
  }
}
