import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ClipboardList,
  Info,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
} from 'lucide-react'
import { loadDraftDataSet } from '../draft/dataStorage'
import type { LeagueProfile } from '../league/types'
import { parseRosterText, sampleRosterText } from '../league/rosterParser'
import {
  buildWaiverBoard,
  filterWaiverBoard,
  waiverPositions,
  type WaiverPositionFilter,
  type WaiverRecommendation,
} from './waiverEngine'
import { loadWaiverShortlist, saveWaiverShortlist } from './storage'

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
  const recommendations = useMemo(
    () => buildWaiverBoard(roster, dataSet.players, { scoring: profile?.scoring ?? dataSet.scoring }).slice(0, 3),
    [dataSet.players, dataSet.scoring, profile?.scoring, roster],
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
            <span className="available">Check ESPN</span>
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

function RecommendationCard({
  recommendation,
  active,
  targeted,
  onSelect,
  onToggleTarget,
}: {
  recommendation: WaiverRecommendation
  active: boolean
  targeted: boolean
  onSelect: () => void
  onToggleTarget: () => void
}) {
  const { candidate, drop } = recommendation
  return (
    <article className={`waiver-candidate${active ? ' waiver-candidate--active' : ''}`}>
      <button className="waiver-candidate__select" type="button" onClick={onSelect} aria-label={`Review ${candidate.name}`}>
        <span className="waiver-candidate__rank">{recommendation.rank}</span>
        <span className="position-tag">{candidate.position}</span>
        <span className="waiver-candidate__player">
          <strong>{candidate.name}</strong>
          <small>{candidate.nflTeam} · source rank {recommendation.sourceRank} · {candidate.projectionSource === 'ranking' ? 'ranking estimate' : 'local estimate'}</small>
        </span>
        <span className={`waiver-priority waiver-priority--${recommendation.priority}`}>{recommendation.priority}</span>
        <span className="waiver-candidate__swap">
          <small>{drop ? `Drop ${drop.name}` : recommendation.safeDrop ? 'Open roster spot' : 'No safe drop'}</small>
          <strong className={recommendation.projectedGain > 0 ? 'gain' : ''}>{gainLabel(recommendation.projectedGain)} pts</strong>
        </span>
      </button>
      <button className={`waiver-target-button${targeted ? ' waiver-target-button--active' : ''}`} type="button" onClick={onToggleTarget} aria-label={`${targeted ? 'Remove' : 'Add'} ${candidate.name} ${targeted ? 'from' : 'to'} claim plan`}>
        {targeted ? <Check aria-hidden="true" /> : <Star aria-hidden="true" />}
      </button>
    </article>
  )
}

export function WaiverWire({ profile, week, onBack, onManageRoster, onToast }: WaiverWireProps) {
  const roster = profile?.roster ?? previewRoster
  const [dataSet] = useState(loadDraftDataSet)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<WaiverPositionFilter>('ALL')
  const [upgradesOnly, setUpgradesOnly] = useState(true)
  const [shortlist, setShortlist] = useState<string[]>(loadWaiverShortlist)

  const board = useMemo(
    () => buildWaiverBoard(roster, dataSet.players, { scoring: profile?.scoring ?? dataSet.scoring }),
    [dataSet.players, dataSet.scoring, profile?.scoring, roster],
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

  const toggleShortlist = (playerId: string) => {
    const next = shortlist.includes(playerId)
      ? shortlist.filter((id) => id !== playerId)
      : [...shortlist, playerId]
    if (!saveWaiverShortlist(next)) {
      onToast('The claim plan could not be saved in this browser.')
      return
    }
    setShortlist(next)
    onToast(shortlist.includes(playerId) ? 'Removed from the local claim plan.' : 'Added to the local claim plan. ESPN was not changed.')
  }

  return (
    <div className="waiver-wire-page">
      <header className="waiver-wire__hero">
        <button className="back-action" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Back to dashboard</button>
        <div className="waiver-wire__hero-copy">
          <p className="lineup-optimizer__eyebrow">Phase 4.1 · Waiver Wire Foundation</p>
          <h1>Find your next roster upgrade</h1>
          <p>Compare add/drop value, modeled range, roster needs, and risk before making a claim for {week}.</p>
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

      <div className="waiver-boundary" role="status">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Read-only candidate analysis</strong>
          <span>ESPN free-agent availability is not verified in Phase 4.1. Confirm every candidate in ESPN before claiming; this page never submits adds or drops.</span>
        </div>
      </div>

      {selected && (
        <section className="waiver-feature panel" aria-label="Top waiver recommendation">
          <div className="waiver-feature__heading">
            <div>
              <p className="lineup-optimizer__eyebrow">{selected.priority === 'priority' ? 'Priority target' : selected.priority === 'upgrade' ? 'Possible upgrade' : 'Watch list'}</p>
              <h2>{selected.candidate.name}</h2>
              <span>{selected.candidate.position} · {selected.candidate.nflTeam} · availability unverified</span>
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

      <section className="waiver-board panel" aria-labelledby="waiver-board-title">
        <div className="panel__heading panel__heading--row">
          <span className="section-icon section-icon--lime"><Target aria-hidden="true" /></span>
          <div><h2 id="waiver-board-title">Candidate board</h2><p>{visible.length} of {board.length} unrostered ranking candidates</p></div>
          <span className="waiver-shortlist-count"><Star aria-hidden="true" /> {shortlist.length} planned</span>
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
              onSelect={() => setSelectedId(recommendation.candidate.id)}
              onToggleTarget={() => toggleShortlist(recommendation.candidate.id)}
            />
          ))}
          {!visible.length && <div className="waiver-empty"><Sparkles aria-hidden="true" /><p>No candidates match these filters. Try all positions or include watch-list players.</p></div>}
        </div>
        {visible.length > 60 && <p className="waiver-board__limit">Showing the first 60 results. Refine the search or position filter to find another player.</p>}
      </section>
    </div>
  )
}
