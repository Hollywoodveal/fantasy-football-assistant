import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Undo2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import type { ScoringFormat } from '../league/types'
import { availablePlayers, isMyTurn, myPlayers, nextPickNumber, recommendations, slotAssignments, teamPickNumbers, totalPicks, totalRounds } from './engine'
import { clearDraftSession, loadDraftSession, saveDraftSession } from './storage'
import type { DraftPick, DraftPlayer, DraftPosition, DraftSession, DraftSettings } from './types'

const DEFAULT_SLOTS: DraftSettings['rosterSlots'] = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 1,
  'D/ST': 1,
  K: 1,
  BENCH: 6,
}

const positionFilters = ['ALL', 'QB', 'RB', 'WR', 'TE', 'D/ST', 'K'] as const
type PositionFilter = (typeof positionFilters)[number]

type DraftAssistantProps = {
  leagueName?: string
  teamName?: string
  scoring?: ScoringFormat
  onBack: () => void
  onToast: (message: string) => void
}

function createSettings(leagueName?: string, teamName?: string, scoring?: ScoringFormat): DraftSettings {
  return {
    schemaVersion: 1,
    leagueName: leagueName || 'My ESPN League',
    teamName: teamName || 'My Team',
    teamCount: 12,
    scoring: scoring || 'PPR',
    draftPosition: 1,
    rosterSlots: { ...DEFAULT_SLOTS },
  }
}

function DraftSetup({ initial, hasDraft, onStart, onBack }: { initial: DraftSettings; hasDraft: boolean; onStart: (settings: DraftSettings) => void; onBack: () => void }) {
  const [settings, setSettings] = useState(initial)
  const rounds = totalRounds(settings)

  const updateSlot = (slot: DraftPosition, value: number) => {
    setSettings((current) => ({
      ...current,
      rosterSlots: { ...current.rosterSlots, [slot]: Math.max(0, Math.min(12, value)) },
    }))
  }

  return (
    <div className="draft-setup-page">
      <button className="draft-back" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Dashboard</button>
      <section className="draft-setup" aria-labelledby="draft-setup-title">
        <div className="draft-setup__intro">
          <span className="section-icon section-icon--lime"><Settings2 aria-hidden="true" /></span>
          <div>
            <p className="draft-kicker">Phase 2 · Draft Assistant</p>
            <h1 id="draft-setup-title">Set up your draft</h1>
            <p>Tell us how your ESPN league drafts. You can start before you have a roster and adjust these settings later.</p>
          </div>
        </div>

        <div className="draft-setup__grid">
          <label><span>League name</span><input value={settings.leagueName} onChange={(event) => setSettings({ ...settings, leagueName: event.target.value })} /></label>
          <label><span>Your team name</span><input value={settings.teamName} onChange={(event) => setSettings({ ...settings, teamName: event.target.value })} /></label>
          <label><span>Scoring</span><span className="select-control"><select value={settings.scoring} onChange={(event) => setSettings({ ...settings, scoring: event.target.value as ScoringFormat })}><option>PPR</option><option>Half PPR</option><option>Standard</option></select><ChevronDown aria-hidden="true" /></span></label>
          <label><span>Number of teams</span><span className="select-control"><select value={settings.teamCount} onChange={(event) => { const teamCount = Number(event.target.value); setSettings({ ...settings, teamCount, draftPosition: Math.min(settings.draftPosition, teamCount) }) }}>{[8, 10, 12, 14, 16].map((count) => <option key={count} value={count}>{count} teams</option>)}</select><ChevronDown aria-hidden="true" /></span></label>
          <label><span>Your draft position</span><span className="select-control"><select value={settings.draftPosition} onChange={(event) => setSettings({ ...settings, draftPosition: Number(event.target.value) })}>{Array.from({ length: settings.teamCount }, (_, index) => <option key={index + 1} value={index + 1}>Pick {index + 1}</option>)}</select><ChevronDown aria-hidden="true" /></span></label>
        </div>

        <fieldset className="roster-settings">
          <legend>Roster positions</legend>
          <p>These slots shape position-need recommendations.</p>
          <div>{(Object.keys(settings.rosterSlots) as DraftPosition[]).map((slot) => (
            <label key={slot}><span>{slot}</span><input aria-label={`${slot} roster slots`} type="number" min="0" max="12" value={settings.rosterSlots[slot]} onChange={(event) => updateSlot(slot, Number(event.target.value))} /></label>
          ))}</div>
        </fieldset>

        <div className="draft-setup__summary">
          <span><strong>{rounds}</strong> rounds</span>
          <span><strong>{rounds * settings.teamCount}</strong> total picks</span>
          <span><strong>Snake</strong> draft order</span>
        </div>

        <div className="draft-data-note"><ShieldCheck aria-hidden="true" /><span><strong>No ESPN password required.</strong> Draft progress stays in this browser. Phase 2 uses a built-in demonstration ranking set until live data is connected.</span></div>
        <button className="primary-action draft-start" type="button" disabled={!settings.leagueName.trim() || !settings.teamName.trim() || rounds === 0} onClick={() => onStart(settings)}>{hasDraft ? 'Save settings and return' : 'Start draft assistant'} <Sparkles aria-hidden="true" /></button>
      </section>
    </div>
  )
}

function RosterRail({ settings, roster }: { settings: DraftSettings; roster: DraftPlayer[] }) {
  const assignments = slotAssignments(settings, roster)
  return (
    <aside className="draft-roster" aria-labelledby="draft-roster-title">
      <div className="draft-side-heading"><div><p>Your team</p><h2 id="draft-roster-title">{settings.teamName}</h2></div><strong>{roster.length}/{totalRounds(settings)}</strong></div>
      <div className="draft-roster__rows">
        {assignments.map(({ slot, player }, index) => (
          <div className={player ? 'draft-roster-row is-filled' : 'draft-roster-row'} key={`${slot}-${index}`}>
            <span>{slot}</span>
            {player ? <p><strong>{player.name}</strong><small>{player.nflTeam} · Bye {player.bye}</small></p> : <p><em>Open slot</em></p>}
          </div>
        ))}
      </div>
    </aside>
  )
}

export function DraftAssistant({ leagueName, teamName, scoring, onBack, onToast }: DraftAssistantProps) {
  const [session, setSession] = useState<DraftSession | null>(() => loadDraftSession())
  const [showSetup, setShowSetup] = useState(() => !session)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [position, setPosition] = useState<PositionFilter>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [resetArmed, setResetArmed] = useState(false)

  useEffect(() => {
    if (!session) return
    if (!saveDraftSession(session)) onToast('Draft progress could not be saved in this browser.')
  }, [session, onToast])

  const settings = session?.settings
  const picks = useMemo(() => session?.picks ?? [], [session?.picks])
  const available = useMemo(() => availablePlayers(picks), [picks])
  const ranked = useMemo(() => settings ? recommendations(settings, picks) : [], [settings, picks])
  const roster = useMemo(() => myPlayers(picks), [picks])
  const playerScores = useMemo(() => new Map(ranked.map((item) => [item.player.id, item])), [ranked])
  const filtered = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase()
    return available.filter((player) =>
      (position === 'ALL' || player.position === position) &&
      (!term || `${player.name} ${player.nflTeam} ${player.position}`.toLowerCase().includes(term)),
    ).sort((a, b) => (playerScores.get(b.id)?.score ?? 0) - (playerScores.get(a.id)?.score ?? 0))
  }, [available, deferredSearch, position, playerScores])
  const recommendation = selectedId ? ranked.find((item) => item.player.id === selectedId) ?? ranked[0] : ranked[0]

  const startDraft = (nextSettings: DraftSettings) => {
    const now = new Date().toISOString()
    setSession((current) => ({ schemaVersion: 1, settings: nextSettings, picks: current?.picks ?? [], startedAt: current?.startedAt ?? now, updatedAt: now }))
    setShowSetup(false)
    setSelectedId(null)
    onToast('Draft room ready. Mark every selection as it happens in ESPN.')
  }

  const makePick = (player: DraftPlayer, draftedBy: DraftPick['draftedBy']) => {
    if (!session) return
    const pick: DraftPick = { playerId: player.id, pickNumber: nextPickNumber(session.picks), draftedBy, draftedAt: new Date().toISOString() }
    setSession({ ...session, picks: [...session.picks, pick], updatedAt: pick.draftedAt })
    setSelectedId(null)
    onToast(draftedBy === 'mine' ? `${player.name} added to your roster.` : `${player.name} removed from the available board.`)
  }

  const undoPick = () => {
    if (!session?.picks.length) return
    const last = session.picks.at(-1)
    const player = availablePlayers(session.picks.slice(0, -1)).find((item) => item.id === last?.playerId)
    setSession({ ...session, picks: session.picks.slice(0, -1), updatedAt: new Date().toISOString() })
    onToast(`${player?.name ?? 'Last pick'} returned to the board.`)
  }

  const resetDraft = () => {
    if (!resetArmed) {
      setResetArmed(true)
      window.setTimeout(() => setResetArmed(false), 4000)
      return
    }
    clearDraftSession()
    setSession(null)
    setShowSetup(true)
    setResetArmed(false)
    setSelectedId(null)
    onToast('Draft reset. Your league setup is ready to edit.')
  }

  if (showSetup || !session || !settings) {
    return <DraftSetup initial={session?.settings ?? createSettings(leagueName, teamName, scoring)} hasDraft={Boolean(session?.picks.length)} onStart={startDraft} onBack={onBack} />
  }

  const pickNumber = nextPickNumber(picks)
  const maxPicks = totalPicks(settings)
  const round = Math.min(totalRounds(settings), Math.ceil(pickNumber / settings.teamCount))
  const turn = isMyTurn(settings, picks)
  const upcomingMine = teamPickNumbers(settings).find((pick) => pick >= pickNumber)
  const progress = Math.min(100, (picks.length / maxPicks) * 100)

  return (
    <div className="draft-room">
      <header className="draft-room__bar">
        <button className="draft-back" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Dashboard</button>
        <div><span>{settings.teamCount}-Team {settings.scoring}</span><strong>Snake draft · Pick {settings.draftPosition}</strong></div>
        <div><span>Round {round} · Pick {pickNumber}</span><strong>{turn ? 'Your team is on the clock' : `Your next pick: ${upcomingMine ?? 'complete'}`}</strong></div>
        <div className="draft-progress"><span><small>Draft progress</small><strong>{picks.length}/{maxPicks}</strong></span><div><i style={{ width: `${progress}%` }} /></div></div>
        <button className="draft-settings-button" type="button" onClick={() => setShowSetup(true)}><Settings2 aria-hidden="true" /> Settings</button>
      </header>

      <div className="draft-room__layout">
        <main className="draft-workspace">
          {recommendation ? (
            <section className={turn ? 'draft-recommendation is-my-turn' : 'draft-recommendation'} aria-labelledby="recommendation-title">
              <div className="draft-recommendation__identity">
                <span className="draft-rank">#{Math.round(recommendation.player.adp)}</span>
                <div><p>{turn ? "You're on the clock" : 'Best available recommendation'}</p><h1 id="recommendation-title">{recommendation.player.name}</h1><span><b>{recommendation.player.position}</b> · {recommendation.player.nflTeam} · Bye {recommendation.player.bye}</span></div>
              </div>
              <div className="draft-recommendation__stats"><span><small>Proj. pts</small><strong>{recommendation.player.projectedPoints.toFixed(1)}</strong></span><span><small>ADP</small><strong>{recommendation.player.adp.toFixed(1)}</strong></span><span><small>Tier</small><strong>{recommendation.player.tier}</strong></span></div>
              <div className="draft-recommendation__why"><p>Why this pick</p>{recommendation.reasons.map((reason) => <span key={reason}><Check aria-hidden="true" />{reason}</span>)}</div>
              <div className="draft-recommendation__actions">
                <button className="primary-action" type="button" onClick={() => makePick(recommendation.player, 'mine')}><UserPlus aria-hidden="true" /> Draft to my team</button>
                <button className="plain-action" type="button" onClick={() => makePick(recommendation.player, 'other')}><X aria-hidden="true" /> Taken by another team</button>
              </div>
            </section>
          ) : (
            <section className="draft-empty"><Check aria-hidden="true" /><h1>Draft board complete</h1><p>You have used every player in the Phase 2 demonstration rankings.</p></section>
          )}

          <section className="draft-board" aria-labelledby="draft-board-title">
            <div className="draft-board__heading"><div><h2 id="draft-board-title">Best available</h2><p>Recommendation order adjusts to your roster and league settings.</p></div><span className="demo-data-label"><AlertTriangle aria-hidden="true" /> Demonstration rankings</span></div>
            <div className="draft-board__tools">
              <label className="draft-search"><Search aria-hidden="true" /><span className="sr-only">Search players</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player or team" /></label>
              <label className="position-filter"><span className="sr-only">Filter by position</span><select value={position} onChange={(event) => setPosition(event.target.value as PositionFilter)}>{positionFilters.map((item) => <option key={item}>{item === 'ALL' ? 'All positions' : item}</option>)}</select><ChevronDown aria-hidden="true" /></label>
              <button type="button" onClick={undoPick} disabled={!picks.length}><Undo2 aria-hidden="true" /> Undo last pick</button>
              <button className={resetArmed ? 'is-danger' : ''} type="button" onClick={resetDraft}><RotateCcw aria-hidden="true" /> {resetArmed ? 'Confirm reset' : 'Reset draft'}</button>
            </div>

            <div className="draft-table-wrap">
              <table className="draft-table">
                <thead><tr><th>Rec.</th><th>Player</th><th>Pos</th><th>Team</th><th>Bye</th><th>Proj.</th><th>ADP</th><th>Tier</th><th><span className="sr-only">Draft actions</span></th></tr></thead>
                <tbody>{filtered.map((player, index) => (
                  <tr className={recommendation?.player.id === player.id ? 'is-selected' : ''} key={player.id} onClick={() => setSelectedId(player.id)}>
                    <td>{index + 1}</td><td><button className="player-name-button" type="button" onClick={() => setSelectedId(player.id)}>{player.name}</button><small>{player.notes}</small></td><td><span className={`draft-position draft-position--${player.position.replace('/', '')}`}>{player.position}</span></td><td>{player.nflTeam}</td><td>{player.bye}</td><td>{player.projectedPoints.toFixed(1)}</td><td>{player.adp.toFixed(1)}</td><td>{player.tier}</td><td><div className="row-actions"><button type="button" onClick={(event) => { event.stopPropagation(); makePick(player, 'mine') }} aria-label={`Draft ${player.name} to my team`}><UserPlus aria-hidden="true" /></button><button type="button" onClick={(event) => { event.stopPropagation(); makePick(player, 'other') }} aria-label={`Mark ${player.name} drafted by another team`}><X aria-hidden="true" /></button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {!filtered.length && <div className="draft-no-results"><Search aria-hidden="true" /><p>No available players match that search.</p><button type="button" onClick={() => { setSearch(''); setPosition('ALL') }}>Clear filters</button></div>}
          </section>
        </main>

        <div className="draft-sidebar">
          <RosterRail settings={settings} roster={roster} />
          <section className="draft-pick-help"><Clock3 aria-hidden="true" /><div><h2>Keep ESPN in sync</h2><p>After every real selection, mark that player here. Use <strong>Draft to my team</strong> only for your picks.</p></div></section>
          <section className="draft-summary"><div><Users aria-hidden="true" /><span><small>Players taken</small><strong>{picks.length}</strong></span></div><div><Sparkles aria-hidden="true" /><span><small>Your roster</small><strong>{roster.length}</strong></span></div></section>
        </div>
      </div>
    </div>
  )
}
