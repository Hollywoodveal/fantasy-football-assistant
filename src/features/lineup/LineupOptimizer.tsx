import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRightLeft,
  Check,
  ClipboardCheck,
  CloudOff,
  Clock3,
  Info,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { parseRosterText, sampleRosterText } from '../league/rosterParser'
import type { LeagueProfile } from '../league/types'
import { optimizeLineup, type LineupAssignment, type LineupOptimization } from './lineupEngine'
import {
  fetchWeeklyIntelligence,
  loadWeeklyIntelligence,
  saveWeeklyIntelligence,
  type WeeklyIntelligenceResponse,
} from './weeklyIntelligence'

const previewRoster = parseRosterText(sampleRosterText).players

type LineupOptimizerProps = {
  profile: LeagueProfile | null
  week: string
  onBack: () => void
  onManageRoster: () => void
  onToast: (message: string) => void
}

function formatKickoff(kickoff: string | undefined) {
  if (!kickoff) return ''
  const date = new Date(kickoff)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(date)
}

function formatFreshness(refreshedAt: string) {
  const date = new Date(refreshedAt)
  if (Number.isNaN(date.getTime())) return 'time unavailable'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function AssignmentRow({ assignment }: { assignment: LineupAssignment }) {
  const player = assignment.player
  const matchup = player?.opponent
    ? `${player.homeAway === 'away' ? '@' : 'vs'} ${player.opponent}`
    : player?.gameStatus === 'bye' ? 'Bye week' : 'Matchup pending'
  const gameState = player?.gameStatus === 'in-progress'
    ? 'Live'
    : player?.gameStatus === 'final' ? 'Final' : ''
  const kickoff = formatKickoff(player?.kickoff)
  return (
    <div className={`lineup-assignment${assignment.player ? '' : ' lineup-assignment--empty'}`}>
      <span className="lineup-assignment__slot">{assignment.slot}</span>
      <div className="lineup-assignment__player">
        <strong>{player?.name ?? 'Needs roster player'}</strong>
        <small>{player ? `${player.position} · ${player.nflTeam} · ${matchup}${gameState ? ` · ${gameState}` : kickoff ? ` · ${kickoff}` : ''}` : 'No eligible player is loaded'}</small>
        {player && <span className="lineup-assignment__meta">{player.projectionSource === 'espn-weekly' ? `ESPN projection · ${player.confidence ?? 'medium'} confidence` : 'Local estimate fallback'}</span>}
      </div>
      {player && player.availability && !['active', 'unknown'].includes(player.availability) && <span className={`lineup-status lineup-status--${player.availability}`}>{player.availability}</span>}
      {player && <span className={`lineup-source lineup-source--${assignment.source}`}>{assignment.source}</span>}
      <div className="lineup-assignment__points">
        <strong className="lineup-assignment__projection">{player ? `${assignment.projectedPoints.toFixed(1)} pts` : '—'}</strong>
        {player?.actualPoints !== undefined && <small>{player.actualPoints.toFixed(1)} actual</small>}
      </div>
    </div>
  )
}

function SummaryMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`lineup-summary__metric${accent ? ' lineup-summary__metric--accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ChangeRow({ swap }: { swap: LineupOptimization['swaps'][number] }) {
  return (
    <div className="lineup-change">
      <span className="position-tag">{swap.position}</span>
      <div className="lineup-change__players">
        <strong>{swap.bench.name}</strong>
        <span>{swap.starter ? `over ${swap.starter.name}` : `fills ${swap.slot}`}</span>
        <small>{swap.reason}</small>
      </div>
      <strong className="gain">+{swap.gain.toFixed(1)} pts</strong>
    </div>
  )
}

export function LineupOptimizer({ profile, week, onBack, onManageRoster, onToast }: LineupOptimizerProps) {
  const roster = profile?.roster ?? previewRoster
  const selectedWeek = Number.parseInt(week.replace(/\D/g, ''), 10) || profile?.sync?.scoringPeriodId || 1
  const leagueId = profile?.leagueId
  const season = profile?.season
  const syncTeamId = profile?.sync?.teamId
  const profileImportedAt = profile?.importedAt
  const [weeklyData, setWeeklyData] = useState<WeeklyIntelligenceResponse | null>(null)
  const [weeklyError, setWeeklyError] = useState('')
  const [isWeeklyLoading, setIsWeeklyLoading] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    if (!leagueId || !season || !syncTeamId) {
      setWeeklyData(null)
      setWeeklyError('')
      setIsWeeklyLoading(false)
      return
    }

    const input = {
      leagueId,
      teamId: syncTeamId,
      season,
      week: selectedWeek,
    }
    const cached = loadWeeklyIntelligence(input)
    setWeeklyData(cached)
    setWeeklyError('')
    setIsWeeklyLoading(true)
    const controller = new AbortController()

    fetchWeeklyIntelligence(input, controller.signal)
      .then((result) => {
        setWeeklyData(result)
        saveWeeklyIntelligence(result)
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setWeeklyError(error instanceof Error ? error.message : 'Weekly ESPN data is unavailable. Local estimates remain active.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsWeeklyLoading(false)
      })

    return () => controller.abort()
  }, [leagueId, profileImportedAt, refreshVersion, season, selectedWeek, syncTeamId])

  const currentWeeklyData = weeklyData
    && weeklyData.leagueId === leagueId
    && weeklyData.teamId === syncTeamId
    && weeklyData.season === season
    && weeklyData.week === selectedWeek
    ? weeklyData
    : null

  const optimization = useMemo(
    () => optimizeLineup(roster, {
      scoring: profile?.scoring ?? 'PPR',
      rosterSource: profile ? 'espn' : 'preview',
      weeklyIntelligence: currentWeeklyData?.players,
    }),
    [currentWeeklyData?.players, profile, roster],
  )
  const [previewApplied, setPreviewApplied] = useState(false)

  useEffect(() => {
    setPreviewApplied(false)
  }, [profile?.importedAt, week])

  const activeAssignments = previewApplied ? optimization.optimized : optimization.current
  const activePoints = previewApplied ? optimization.optimizedPoints : optimization.currentPoints

  const handlePreview = () => {
    setPreviewApplied(true)
    onToast('Optimized lineup preview applied. ESPN was not changed.')
  }

  const resetPreview = () => {
    setPreviewApplied(false)
    onToast('Lineup preview reset.')
  }

  const refreshWeeklyData = () => {
    setRefreshVersion((version) => version + 1)
    onToast('Refreshing ESPN weekly intelligence…')
  }

  const freshness = currentWeeklyData ? formatFreshness(currentWeeklyData.refreshedAt) : ''
  const liveProjectionCount = currentWeeklyData?.coverage.projectedPlayers ?? 0
  const hasLiveData = Boolean(currentWeeklyData)

  return (
    <div className="lineup-optimizer-page">
      <header className="lineup-optimizer__hero">
        <button className="back-action" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Back to dashboard</button>
        <div className="lineup-optimizer__hero-copy">
          <p className="lineup-optimizer__eyebrow">Phase 3.3 · Live weekly player intelligence</p>
          <h1>Set your strongest lineup</h1>
          <p>Blend ESPN weekly projections, matchups, game status, and injury context into a legal lineup for {week}.</p>
        </div>
        <div className="lineup-optimizer__source" aria-label={`${hasLiveData ? 'Live ESPN weekly data' : profile ? 'ESPN roster with local estimates' : 'Preview roster'} source`}>
          {hasLiveData ? <Activity aria-hidden="true" /> : <ClipboardCheck aria-hidden="true" />}
          <span>{hasLiveData ? 'ESPN weekly live' : profile ? 'ESPN roster' : 'Preview roster'}</span>
          <small>{hasLiveData ? `${liveProjectionCount}/${currentWeeklyData?.coverage.rosterPlayers} projections · ${freshness}` : `${profile?.scoring ?? 'PPR'} · ${roster.length} players`}</small>
        </div>
      </header>

      {!profile && (
        <div className="lineup-optimizer__notice" role="status">
          <Info aria-hidden="true" />
          <p><strong>Preview roster is active.</strong> Sync a public ESPN league to add weekly projections, opponents, kickoff status, and injury context for your players.</p>
          <button className="secondary-action" type="button" onClick={onManageRoster}>Import ESPN roster</button>
        </div>
      )}

      {profile && !profile.sync && (
        <div className="lineup-optimizer__notice" role="status">
          <Info aria-hidden="true" />
          <p><strong>Manual roster estimates are active.</strong> Connect a public ESPN league to unlock live weekly projections, matchups, and injury status.</p>
          <button className="secondary-action" type="button" onClick={onManageRoster}>Connect ESPN</button>
        </div>
      )}

      {profile?.sync && (
        <div className={`weekly-intelligence${weeklyError ? ' weekly-intelligence--warning' : ''}`} role="status">
          {weeklyError ? <CloudOff aria-hidden="true" /> : <Activity aria-hidden="true" />}
          <div>
            <strong>{weeklyError ? currentWeeklyData ? 'Using last saved weekly data' : 'Using safe fallback estimates' : isWeeklyLoading && !currentWeeklyData ? 'Loading weekly intelligence…' : `Week ${selectedWeek} intelligence ready`}</strong>
            <span>{weeklyError
              ? `${weeklyError}${currentWeeklyData ? ` Last saved update: ${freshness}.` : ''}`
              : currentWeeklyData
                ? `${currentWeeklyData.coverage.projectedPlayers} ESPN projections · ${currentWeeklyData.coverage.scheduledPlayers} matchups · updated ${freshness}`
                : 'Checking ESPN projections, schedule, and player status.'}</span>
          </div>
          <button className="secondary-action" type="button" onClick={refreshWeeklyData} disabled={isWeeklyLoading}>
            <RefreshCw className={isWeeklyLoading ? 'is-spinning' : ''} aria-hidden="true" /> {isWeeklyLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      )}

      <section className="lineup-summary panel" aria-label="Lineup projection summary">
        <div className="lineup-summary__heading">
          <div>
            <p className="lineup-optimizer__eyebrow">{week} projection</p>
            <h2>{previewApplied ? 'Optimized preview' : 'Current lineup'}</h2>
          </div>
          {previewApplied && <span className="optimized-state"><Check aria-hidden="true" /> Preview active</span>}
        </div>
        <div className="lineup-summary__metrics">
          <SummaryMetric label="Current" value={`${optimization.currentPoints.toFixed(1)} pts`} />
          <SummaryMetric label="Optimized" value={`${optimization.optimizedPoints.toFixed(1)} pts`} accent />
          <SummaryMetric label="Projected gain" value={`${optimization.projectedGain > 0 ? '+' : ''}${optimization.projectedGain.toFixed(1)} pts`} accent />
        </div>
        <div className="lineup-summary__actions">
          {!previewApplied ? (
            <button className="primary-action" type="button" onClick={handlePreview} disabled={!optimization.swaps.length}><Sparkles aria-hidden="true" /> Preview optimized lineup</button>
          ) : (
            <button className="secondary-action" type="button" onClick={resetPreview}><RotateCcw aria-hidden="true" /> Reset preview</button>
          )}
          {profile && <button className="plain-action" type="button" onClick={onManageRoster}>Manage roster</button>}
        </div>
      </section>

      <div className="lineup-optimizer__grid">
        <section className="panel lineup-changes" aria-labelledby="lineup-changes-title">
          <div className="panel__heading panel__heading--row">
            <span className="section-icon section-icon--lime"><ArrowRightLeft aria-hidden="true" /></span>
            <div>
              <h2 id="lineup-changes-title">Recommended changes</h2>
              <p>{optimization.swaps.length ? `${optimization.swaps.length} move${optimization.swaps.length === 1 ? '' : 's'} improve the ${hasLiveData ? 'blended weekly' : 'local'} projection.` : 'No higher-projected bench move found.'}</p>
            </div>
          </div>
          <div className="lineup-change-list">
            {optimization.swaps.length ? optimization.swaps.map((swap) => <ChangeRow key={swap.id} swap={swap} />) : <div className="lineup-empty-state"><Check aria-hidden="true" /><p>Your current starters are already the best available {hasLiveData ? 'weekly' : 'local'} projection.</p></div>}
          </div>
          <p className="lineup-boundary"><Info aria-hidden="true" /> ESPN access remains read-only. Previewing changes here never writes to your league.</p>
        </section>

        <section className="panel lineup-projected" aria-labelledby="lineup-projected-title">
          <div className="panel__heading panel__heading--row">
            <span className="section-icon"><ClipboardCheck aria-hidden="true" /></span>
            <div>
              <h2 id="lineup-projected-title">Projected lineup</h2>
              <p>{previewApplied ? 'Optimized assignment' : 'Current starter assignment'} · {activePoints.toFixed(1)} pts</p>
            </div>
          </div>
          <div className="lineup-assignment-list">
            {activeAssignments.map((assignment, index) => <AssignmentRow assignment={assignment} key={`${assignment.slot}-${index}`} />)}
          </div>
        </section>
      </div>

      {optimization.warnings.length > 0 && (
        <section className="lineup-warnings" aria-label="Lineup warnings">
          <AlertCircle aria-hidden="true" />
          <div><strong>Roster checks</strong>{optimization.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
        </section>
      )}

      <p className="weekly-intelligence__footnote"><Clock3 aria-hidden="true" /> Live fields are advisory and may change before kickoff. Always confirm late injury news in ESPN.</p>
    </div>
  )
}
