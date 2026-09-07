import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ClipboardList,
  Clock3,
  GitCompareArrows,
  Info,
  ListOrdered,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TriangleAlert,
  WalletCards,
  X,
} from 'lucide-react'
import { loadDraftDataSet, saveDraftDataSet } from '../draft/dataStorage'
import { liveDataNeedsRefresh, refreshLivePlayerData } from '../draft/liveData'
import type { LeagueProfile } from '../league/types'
import { parseRosterText, sampleRosterText } from '../league/rosterParser'
import {
  buildWaiverBoard,
  buildClaimStrategy,
  filterWaiverBoard,
  waiverPositions,
  type WaiverPositionFilter,
  type WaiverRecommendation,
} from './waiverEngine'
import {
  fetchWaiverAvailability,
  loadWaiverAvailability,
  saveWaiverAvailability,
  type WaiverAvailabilityInput,
  type WaiverAvailabilityResponse,
} from './waiverAvailability'
import { loadWaiverShortlist, saveWaiverShortlist } from './storage'
import {
  fetchWaiverWeekContext,
  loadWaiverWeekContext,
  saveWaiverWeekContext,
  type WaiverWeekContextResponse,
} from './waiverContext'

const previewRoster = parseRosterText(sampleRosterText).players

type WaiverWireProps = {
  profile: LeagueProfile | null
  week: string
  onBack: () => void
  onManageRoster: () => void
  onToast: (message: string) => void
}

export function WaiverPreview({ profile, onOpen }: { profile: LeagueProfile | null; onOpen: () => void }) {
  const [dataSet] = useState(loadDraftDataSet)
  const roster = profile?.roster ?? previewRoster
  const availability = useMemo(() => {
    if (!profile?.sync) return null
    const cached = loadWaiverAvailability({
      leagueId: profile.leagueId,
      season: profile.season,
      teamId: profile.sync.teamId,
    })
    return cached && Date.now() - Date.parse(cached.refreshedAt) <= 15 * 60 * 1000 ? cached : null
  }, [profile?.leagueId, profile?.season, profile?.sync])
  const recommendations = useMemo(
    () => buildWaiverBoard(roster, dataSet.players, {
      scoring: profile?.scoring ?? dataSet.scoring,
      availability: availability ? {
        refreshedAt: availability.refreshedAt,
        teamCount: availability.coverage.teams,
        rosteredPlayers: availability.rosteredPlayers,
      } : undefined,
    }).slice(0, 3),
    [availability, dataSet.players, dataSet.scoring, profile?.scoring, roster],
  )

  return (
    <section className="panel waiver-panel" id="waivers" aria-labelledby="waivers-title">
      <div className="panel__heading panel__heading--row">
        <span className="section-icon"><Target aria-hidden="true" /></span>
        <h2 id="waivers-title">Top waiver candidates</h2>
        <button className="text-action" type="button" onClick={onOpen}>View all</button>
      </div>
      <div className="waiver-labels" aria-hidden="true">
        <span>Rank</span><span>Pos</span><span>Player</span><span>Status</span><span>Roster gain</span>
      </div>
      <div className="waiver-list">
        {recommendations.map((recommendation) => (
          <button className="waiver-row" type="button" key={recommendation.candidate.id} onClick={onOpen}>
            <strong className="rank">{recommendation.rank}</strong>
            <span className="position-tag">{recommendation.candidate.position}</span>
            <span className="player">
              <strong>{recommendation.candidate.name}</strong>
              <small>{recommendation.drop ? `over ${recommendation.drop.name}` : 'open roster spot'}</small>
            </span>
            <span className="available">{recommendation.availability === 'verified-unrostered' ? 'ESPN verified' : 'Check ESPN'}</span>
            <strong className="gain">{gainLabel(recommendation.projectedGain)}</strong>
          </button>
        ))}
      </div>
      <button className="desktop-view-all text-action" type="button" onClick={onOpen}>Open waiver workspace</button>
    </section>
  )
}

function gainLabel(value: number) {
  if (value > 0) return `+${value.toFixed(1)}`
  return value.toFixed(1)
}

function formatAvailabilityTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function matchupLabel(recommendation: WaiverRecommendation) {
  if (recommendation.gameStatus === 'bye') return `Week ${recommendation.week} bye`
  if (!recommendation.opponent) return 'Matchup pending'
  return `${recommendation.homeAway === 'away' ? 'at' : 'vs'} ${recommendation.opponent}`
}

function RecommendationCard({
  recommendation,
  active,
  targeted,
  compared,
  onSelect,
  onToggleTarget,
  onToggleCompare,
}: {
  recommendation: WaiverRecommendation
  active: boolean
  targeted: boolean
  compared: boolean
  onSelect: () => void
  onToggleTarget: () => void
  onToggleCompare: () => void
}) {
  const { candidate, drop } = recommendation
  return (
    <article className={`waiver-candidate${active ? ' waiver-candidate--active' : ''}`}>
      <button className="waiver-candidate__select" type="button" onClick={onSelect} aria-label={`Review ${candidate.name}`}>
        <span className="waiver-candidate__rank">{recommendation.rank}</span>
        <span className="position-tag">{candidate.position}</span>
        <span className="waiver-candidate__player">
          <strong>{candidate.name}</strong>
          <small>{candidate.nflTeam} · source rank {recommendation.sourceRank} · {candidate.projectionSource === 'ranking' ? 'ranking estimate' : 'local estimate'} · {recommendation.availability === 'verified-unrostered' ? 'ESPN verified' : 'unverified'}</small>
        </span>
        <span className={`waiver-priority waiver-priority--${recommendation.priority}`}>{recommendation.recommendationLabel}</span>
        <span className="waiver-candidate__swap">
          <small>{matchupLabel(recommendation)} · {drop ? `Drop ${drop.name}` : recommendation.safeDrop ? 'Open roster spot' : 'No safe drop'}</small>
          <strong className={recommendation.projectedGain > 0 ? 'gain' : ''}>{gainLabel(recommendation.projectedGain)} pts</strong>
        </span>
      </button>
      <div className="waiver-candidate__actions">
        <button className={`waiver-compare-button${compared ? ' waiver-compare-button--active' : ''}`} type="button" onClick={onToggleCompare} aria-label={`${compared ? 'Remove' : 'Add'} ${candidate.name} ${compared ? 'from' : 'to'} comparison`}>
          <GitCompareArrows aria-hidden="true" />
        </button>
        <button className={`waiver-target-button${targeted ? ' waiver-target-button--active' : ''}`} type="button" onClick={onToggleTarget} aria-label={`${targeted ? 'Remove' : 'Add'} ${candidate.name} ${targeted ? 'from' : 'to'} claim plan`}>
          {targeted ? <Check aria-hidden="true" /> : <Star aria-hidden="true" />}
        </button>
      </div>
    </article>
  )
}

export function WaiverWire({ profile, week, onBack, onManageRoster, onToast }: WaiverWireProps) {
  const roster = profile?.roster ?? previewRoster
  const [dataSet, setDataSet] = useState(loadDraftDataSet)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<WaiverPositionFilter>('ALL')
  const [upgradesOnly, setUpgradesOnly] = useState(true)
  const [shortlist, setShortlist] = useState<string[]>(loadWaiverShortlist)
  const [availability, setAvailability] = useState<WaiverAvailabilityResponse | null>(null)
  const [availabilityError, setAvailabilityError] = useState('')
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [weekContext, setWeekContext] = useState<WaiverWeekContextResponse | null>(null)
  const [weekContextError, setWeekContextError] = useState('')
  const [isWeekContextLoading, setIsWeekContextLoading] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const weekNumber = Number(week.replace(/[^0-9]/g, '')) || 1
  const weekContextInput = useMemo(() => ({ season: profile?.season ?? dataSet.season, week: weekNumber }), [dataSet.season, profile?.season, weekNumber])
  const availabilityInput = useMemo<WaiverAvailabilityInput | null>(() => profile?.sync ? ({
    leagueId: profile.leagueId,
    season: profile.season,
    teamId: profile.sync.teamId,
  }) : null, [profile?.leagueId, profile?.season, profile?.sync])

  useEffect(() => {
    if (!availabilityInput) {
      setAvailability(null)
      setAvailabilityError('')
      setIsAvailabilityLoading(false)
      return
    }

    const cached = loadWaiverAvailability(availabilityInput)
    setAvailability(cached)
    setAvailabilityError('')
    setIsAvailabilityLoading(true)
    const controller = new AbortController()

    fetchWaiverAvailability(availabilityInput, controller.signal, refreshVersion > 0)
      .then((result) => {
        setAvailability(result)
        if (!saveWaiverAvailability(result)) onToast('ESPN availability was verified, but the snapshot could not be saved in this browser.')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setAvailabilityError(error instanceof Error ? error.message : 'ESPN availability could not be verified.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsAvailabilityLoading(false)
      })

    return () => controller.abort()
  }, [availabilityInput, onToast, profile?.importedAt, refreshVersion])

  useEffect(() => {
    if (!liveDataNeedsRefresh(dataSet)) return
    const controller = new AbortController()
    refreshLivePlayerData(dataSet, controller.signal)
      .then((nextDataSet) => {
        setDataSet(nextDataSet)
        if (!saveDraftDataSet(nextDataSet)) onToast('Live player status was refreshed, but could not be saved in this browser.')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        onToast(error instanceof Error ? error.message : 'Live player status could not be refreshed.')
      })
    return () => controller.abort()
  }, [dataSet, onToast])

  useEffect(() => {
    const cached = loadWaiverWeekContext(weekContextInput)
    setWeekContext(cached)
    setWeekContextError('')
    setIsWeekContextLoading(true)
    const controller = new AbortController()
    fetchWaiverWeekContext(weekContextInput, controller.signal)
      .then((result) => {
        setWeekContext(result)
        if (!saveWaiverWeekContext(result)) onToast('Weekly matchup context loaded, but could not be saved in this browser.')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setWeekContextError(error instanceof Error ? error.message : 'Weekly matchup context could not be loaded.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsWeekContextLoading(false)
      })
    return () => controller.abort()
  }, [onToast, weekContextInput])

  const currentAvailability = availability
    && availabilityInput
    && availability.leagueId === availabilityInput.leagueId
    && availability.season === availabilityInput.season
    && availability.teamId === availabilityInput.teamId
    ? availability
    : null
  const currentWeekContext = weekContext
    && weekContext.season === weekContextInput.season
    && weekContext.week === weekContextInput.week
    ? weekContext
    : null
  const availabilityIsStale = Boolean(currentAvailability && Date.now() - Date.parse(currentAvailability.refreshedAt) > 5 * 60 * 1000)

  const board = useMemo(
    () => buildWaiverBoard(roster, dataSet.players, {
      scoring: profile?.scoring ?? dataSet.scoring,
      availability: currentAvailability ? {
        refreshedAt: currentAvailability.refreshedAt,
        teamCount: currentAvailability.coverage.teams,
        rosteredPlayers: currentAvailability.rosteredPlayers,
      } : undefined,
      weekContext: currentWeekContext ? {
        week: currentWeekContext.week,
        teams: currentWeekContext.teams,
      } : undefined,
    }),
    [currentAvailability, currentWeekContext, dataSet.players, dataSet.scoring, profile?.scoring, roster],
  )
  const visible = useMemo(
    () => filterWaiverBoard(board, { search, position, upgradesOnly }),
    [board, position, search, upgradesOnly],
  )
  const [selectedId, setSelectedId] = useState<string>('')
  const selected = visible.find((recommendation) => recommendation.candidate.id === selectedId)
    ?? visible[0]
    ?? board.find((recommendation) => recommendation.candidate.id === selectedId)
    ?? board[0]
  const rosterHasOpenSpot = roster.filter((player) => player.slot !== 'IR').length < 15
  const claimPlan = useMemo(
    () => buildClaimStrategy(board, shortlist, currentAvailability?.claimRules),
    [board, currentAvailability?.claimRules, shortlist],
  )
  const comparisons = useMemo(
    () => compareIds.flatMap((id) => {
      const recommendation = board.find((item) => item.candidate.id === id)
      return recommendation ? [recommendation] : []
    }),
    [board, compareIds],
  )

  const toggleShortlist = (playerId: string) => {
    const wasTargeted = shortlist.includes(playerId)
    const next = wasTargeted
      ? shortlist.filter((id) => id !== playerId)
      : [...shortlist, playerId]
    if (!saveWaiverShortlist(next)) {
      onToast('The claim plan could not be saved in this browser.')
      return
    }
    setShortlist(next)
    onToast(wasTargeted ? 'Removed from the local claim plan.' : 'Added to the local claim plan. ESPN was not changed.')
  }

  const buildRecommendedPlan = () => {
    const next = board.filter((recommendation) => recommendation.safeDrop && recommendation.priority !== 'watch').slice(0, 3).map((recommendation) => recommendation.candidate.id)
    if (!next.length) {
      onToast('No safe priority or upgrade claims are available for this roster.')
      return
    }
    if (!saveWaiverShortlist(next)) {
      onToast('The recommended claim plan could not be saved in this browser.')
      return
    }
    setShortlist(next)
    onToast('Recommended claim order saved locally. ESPN was not changed.')
  }

  const toggleComparison = (playerId: string) => {
    setCompareIds((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId)
      if (current.length >= 2) {
        onToast('Compare up to two waiver candidates at a time.')
        return current
      }
      return [...current, playerId]
    })
  }

  return (
    <div className="waiver-wire-page">
      <header className="waiver-wire__hero">
        <button className="back-action" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Back to dashboard</button>
        <div className="waiver-wire__hero-copy">
          <p className="lineup-optimizer__eyebrow">Phase 4.3 · Smarter Waiver Recommendations</p>
          <h1>Find your next roster upgrade</h1>
          <p>Separate immediate starters from streamers and stashes, compare add/drop value, and build a smarter claim strategy for {week}.</p>
        </div>
        <div className="lineup-optimizer__source" aria-label="Waiver candidate data source">
          <ClipboardList aria-hidden="true" />
          <span>{dataSet.sourceName}</span>
          <small>{dataSet.players.length} candidates · {profile?.scoring ?? dataSet.scoring}</small>
        </div>
      </header>

      {!profile && (
        <div className="lineup-optimizer__notice" role="status">
          <Info aria-hidden="true" />
          <p><strong>Preview roster is active.</strong> Import your ESPN roster so add/drop comparisons reflect your team.</p>
          <button className="secondary-action" type="button" onClick={onManageRoster}>Import ESPN roster</button>
        </div>
      )}

      <div className={`waiver-verification ${availabilityError || availabilityIsStale ? 'waiver-verification--error' : currentAvailability ? 'waiver-verification--verified' : ''}`} role="status">
        <span className="waiver-verification__icon">
          {isAvailabilityLoading ? <RefreshCw className="is-spinning" aria-hidden="true" /> : currentAvailability ? <ShieldCheck aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
        </span>
        <div>
          <strong>{currentAvailability
            ? availabilityError || availabilityIsStale
              ? `Last verified snapshot covers ${currentAvailability.coverage.teams} ESPN rosters`
              : `Verified unrostered across ${currentAvailability.coverage.teams} ESPN rosters`
            : isAvailabilityLoading ? 'Checking every ESPN roster…' : profile?.sync ? 'ESPN verification unavailable' : 'Connect a public ESPN league to verify availability'}</strong>
          <span>{currentAvailability
            ? `${availabilityError ? `${availabilityError} · ` : ''}${availabilityIsStale ? 'Refresh recommended before submitting · ' : ''}${currentAvailability.coverage.rosteredPlayers} rostered players excluded · checked ${formatAvailabilityTime(currentAvailability.refreshedAt)}`
            : availabilityError || (profile?.sync ? 'The board remains usable with unverified labels.' : 'Until then, confirm each player inside ESPN before claiming.')}</span>
        </div>
        {profile?.sync && (
          <button className="secondary-action" type="button" disabled={isAvailabilityLoading} onClick={() => setRefreshVersion((version) => version + 1)}>
            <RefreshCw aria-hidden="true" /> {isAvailabilityLoading ? 'Checking' : 'Refresh ESPN'}
          </button>
        )}
      </div>

      <div className={`waiver-intelligence-status${weekContextError ? ' waiver-intelligence-status--warning' : ''}`} role="status">
        {weekContextError ? <TriangleAlert aria-hidden="true" /> : isWeekContextLoading && !currentWeekContext ? <RefreshCw className="is-spinning" aria-hidden="true" /> : <Activity aria-hidden="true" />}
        <div>
          <strong>{weekContextError
            ? currentWeekContext ? `Using saved ${week} matchup context` : 'Using season-ranking matchup fallback'
            : isWeekContextLoading && !currentWeekContext ? `Loading ${week} matchup context…` : `${week} matchup intelligence ready`}</strong>
          <span>{weekContextError || (currentWeekContext
            ? `${currentWeekContext.teams.length} NFL team schedules matched · player status ${dataSet.liveData ? `updated ${formatAvailabilityTime(dataSet.liveData.refreshedAt)}` : 'uses saved ranking data'}`
            : 'Rankings and roster need remain active while the schedule loads.')}</span>
        </div>
      </div>

      <div className="waiver-boundary" role="status">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Read-only verification and claim planning</strong>
          <span>A verified label means the player was absent from every roster in the latest public ESPN snapshot—not that waivers have cleared. Recheck ESPN before submitting; this app never submits adds, drops, bids, or claims.</span>
        </div>
      </div>

      {selected && (
        <section className="waiver-feature panel" aria-label="Top waiver recommendation">
          <div className="waiver-feature__heading">
            <div>
              <p className="lineup-optimizer__eyebrow">{selected.recommendationLabel}</p>
              <h2>{selected.candidate.name}</h2>
              <span>{selected.candidate.position} · {selected.candidate.nflTeam} · {selected.availability === 'verified-unrostered' ? 'verified unrostered in latest ESPN snapshot' : 'availability unverified'}</span>
            </div>
            <button className={`secondary-action${shortlist.includes(selected.candidate.id) ? ' secondary-action--selected' : ''}`} type="button" onClick={() => toggleShortlist(selected.candidate.id)}>
              {shortlist.includes(selected.candidate.id) ? <Check aria-hidden="true" /> : <Star aria-hidden="true" />}
              {shortlist.includes(selected.candidate.id) ? 'In claim plan' : 'Add to claim plan'}
            </button>
          </div>
          <div className="waiver-feature__metrics">
            <div><span>Local projection</span><strong>{selected.candidate.projectedPoints.toFixed(1)}</strong><small>points</small></div>
            <div><span>Modeled range</span><strong>{selected.candidate.floorPoints.toFixed(1)}–{selected.candidate.ceilingPoints.toFixed(1)}</strong><small>{selected.candidate.riskLevel} risk</small></div>
            <div><span>{selected.drop ? 'Over current player' : rosterHasOpenSpot ? 'Estimated roster lift' : 'Roster value'}</span><strong className={selected.projectedGain > 0 ? 'gain' : ''}>{gainLabel(selected.projectedGain)}</strong><small>{selected.comparison ? `vs ${selected.comparison.name}` : 'fills a missing position'}</small></div>
            <div><span>{week} matchup</span><strong>{matchupLabel(selected)}</strong><small>{selected.injuryStatus || `${selected.candidate.riskLevel} modeled risk`}</small></div>
          </div>
          <div className="waiver-feature__decision">
            <div className="waiver-swap">
              <span className="waiver-swap__add"><ArrowUp aria-hidden="true" /><small>Add</small><strong>{selected.candidate.name}</strong></span>
              <span className="waiver-swap__drop"><ArrowDown aria-hidden="true" /><small>Drop</small><strong>{selected.drop?.name ?? (selected.safeDrop ? 'No drop needed' : 'No safe drop')}</strong></span>
            </div>
            <ul>{selected.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </div>
        </section>
      )}

      <section className="waiver-comparison panel" aria-labelledby="waiver-comparison-title">
        <div className="panel__heading panel__heading--row">
          <span className="section-icon section-icon--lime"><GitCompareArrows aria-hidden="true" /></span>
          <div><h2 id="waiver-comparison-title">Compare candidates</h2><p>Select up to two players from the candidate board.</p></div>
          <span className="waiver-shortlist-count">{comparisons.length}/2 selected</span>
        </div>
        {comparisons.length ? (
          <div className="waiver-comparison__grid">
            {comparisons.map((recommendation) => (
              <article className="waiver-comparison__card" key={recommendation.candidate.id}>
                <button type="button" onClick={() => toggleComparison(recommendation.candidate.id)} aria-label={`Remove ${recommendation.candidate.name} from comparison`}><X aria-hidden="true" /></button>
                <span className={`waiver-priority waiver-priority--${recommendation.priority}`}>{recommendation.recommendationLabel}</span>
                <h3>{recommendation.candidate.name}</h3>
                <p>{recommendation.candidate.position} · {recommendation.candidate.nflTeam} · {matchupLabel(recommendation)}</p>
                <dl>
                  <div><dt>Projection</dt><dd>{recommendation.candidate.projectedPoints.toFixed(1)}</dd></div>
                  <div><dt>Roster lift</dt><dd className={recommendation.projectedGain > 0 ? 'gain' : ''}>{gainLabel(recommendation.projectedGain)}</dd></div>
                  <div><dt>Range</dt><dd>{recommendation.candidate.floorPoints.toFixed(1)}–{recommendation.candidate.ceilingPoints.toFixed(1)}</dd></div>
                  <div><dt>Risk</dt><dd>{recommendation.candidate.riskLevel}</dd></div>
                </dl>
              </article>
            ))}
            {comparisons.length === 1 && <div className="waiver-comparison__empty"><GitCompareArrows aria-hidden="true" /><span>Choose one more player to compare.</span></div>}
          </div>
        ) : (
          <div className="waiver-comparison__empty"><GitCompareArrows aria-hidden="true" /><span>Use the compare buttons on the candidate board to review two options side by side.</span></div>
        )}
      </section>

      <section className="waiver-claim-plan panel" aria-labelledby="claim-plan-title">
        <div className="panel__heading panel__heading--row">
          <span className="section-icon section-icon--lime"><ListOrdered aria-hidden="true" /></span>
          <div>
            <h2 id="claim-plan-title">Claim strategy</h2>
            <p>{currentAvailability?.claimRules.mode === 'faab'
              ? `FAAB plan${currentAvailability.claimRules.budgetRemaining === undefined ? '' : ` · $${currentAvailability.claimRules.budgetRemaining} remaining`}`
              : `Priority plan${currentAvailability?.claimRules.waiverRank ? ` · waiver position #${currentAvailability.claimRules.waiverRank}` : ''}`}</p>
          </div>
          {!claimPlan.length && <button className="secondary-action" type="button" onClick={buildRecommendedPlan}><Sparkles aria-hidden="true" /> Build recommended plan</button>}
        </div>

        {claimPlan.length ? (
          <div className="waiver-claim-list">
            {claimPlan.map((item) => (
              <article className="waiver-claim" key={item.recommendation.candidate.id}>
                <span className="waiver-claim__order">{item.order}</span>
                <div className="waiver-claim__move">
                  <strong>{item.recommendation.candidate.name}</strong>
                  <span>Add {item.recommendation.candidate.position} · {item.recommendation.drop ? `drop ${item.recommendation.drop.name}` : 'no drop needed'}</span>
                </div>
                <span className={`waiver-claim__role waiver-claim__role--${item.role}`}>{item.role === 'backup' ? `Backup to #${item.backupFor}` : 'Primary'}</span>
                <div className="waiver-claim__strategy">
                  {currentAvailability?.claimRules.mode === 'faab' ? <WalletCards aria-hidden="true" /> : <ListOrdered aria-hidden="true" />}
                  <span>{item.strategyLabel}</span>
                  <small>{gainLabel(item.recommendation.projectedGain)} projected roster value</small>
                </div>
                <button className="waiver-claim__remove" type="button" onClick={() => toggleShortlist(item.recommendation.candidate.id)} aria-label={`Remove ${item.recommendation.candidate.name} from claim plan`}>Remove</button>
              </article>
            ))}
          </div>
        ) : (
          <div className="waiver-claim-empty">
            <Star aria-hidden="true" />
            <p><strong>No claims planned yet.</strong><span>Star candidates below or build a safe top-three plan. Suggested bids and order are advisory.</span></p>
          </div>
        )}
      </section>

      <section className="waiver-board panel" aria-labelledby="waiver-board-title">
        <div className="panel__heading panel__heading--row">
          <span className="section-icon section-icon--lime"><Target aria-hidden="true" /></span>
          <div><h2 id="waiver-board-title">Candidate board</h2><p>{visible.length} of {board.length} {currentAvailability ? 'ESPN-verified unrostered' : 'locally unrostered'} ranking candidates</p></div>
          <span className="waiver-shortlist-count"><Star aria-hidden="true" /> {claimPlan.length} planned</span>
        </div>

        <div className="waiver-tools">
          <label className="waiver-search"><Search aria-hidden="true" /><span className="sr-only">Search candidates</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player or NFL team" /></label>
          <label className="waiver-position"><span className="sr-only">Filter by position</span><select value={position} onChange={(event) => setPosition(event.target.value as WaiverPositionFilter)}>{waiverPositions.map((value) => <option key={value} value={value}>{value === 'ALL' ? 'All positions' : value}</option>)}</select></label>
          <label className="waiver-upgrades"><input type="checkbox" checked={upgradesOnly} onChange={(event) => setUpgradesOnly(event.target.checked)} /><span>Upgrades only</span></label>
        </div>

        <div className="waiver-candidate-list">
          {visible.slice(0, 60).map((recommendation) => (
            <RecommendationCard
              key={recommendation.candidate.id}
              recommendation={recommendation}
              active={selected?.candidate.id === recommendation.candidate.id}
              targeted={shortlist.includes(recommendation.candidate.id)}
              compared={compareIds.includes(recommendation.candidate.id)}
              onSelect={() => setSelectedId(recommendation.candidate.id)}
              onToggleTarget={() => toggleShortlist(recommendation.candidate.id)}
              onToggleCompare={() => toggleComparison(recommendation.candidate.id)}
            />
          ))}
          {!visible.length && <div className="waiver-empty"><Sparkles aria-hidden="true" /><p>No candidates match these filters. Try all positions or include watch-list players.</p></div>}
        </div>
        {visible.length > 60 && <p className="waiver-board__limit">Showing the first 60 results. Refine the search or position filter to find another player.</p>}
      </section>
    </div>
  )
}
