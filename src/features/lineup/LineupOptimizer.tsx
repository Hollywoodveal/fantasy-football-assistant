import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRightLeft,
  Check,
  ClipboardCheck,
  Info,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { parseRosterText, sampleRosterText } from '../league/rosterParser'
import type { LeagueProfile } from '../league/types'
import { optimizeLineup, type LineupAssignment, type LineupOptimization } from './lineupEngine'

const previewRoster = parseRosterText(sampleRosterText).players

type LineupOptimizerProps = {
  profile: LeagueProfile | null
  week: string
  onBack: () => void
  onManageRoster: () => void
  onToast: (message: string) => void
}

function AssignmentRow({ assignment }: { assignment: LineupAssignment }) {
  return (
    <div className={`lineup-assignment${assignment.player ? '' : ' lineup-assignment--empty'}`}>
      <span className="lineup-assignment__slot">{assignment.slot}</span>
      <div className="lineup-assignment__player">
        <strong>{assignment.player?.name ?? 'Needs roster player'}</strong>
        <small>{assignment.player ? `${assignment.player.position} · ${assignment.player.nflTeam} · ${assignment.source === 'bench' ? 'Bench' : 'Starter'}` : 'No eligible player is loaded'}</small>
      </div>
      {assignment.player && <span className={`lineup-source lineup-source--${assignment.source}`}>{assignment.source}</span>}
      <strong className="lineup-assignment__projection">{assignment.player ? `${assignment.projectedPoints.toFixed(1)} pts` : '—'}</strong>
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
  const optimization = useMemo(
    () => optimizeLineup(roster, { scoring: profile?.scoring ?? 'PPR', rosterSource: profile ? 'espn' : 'preview' }),
    [profile, roster],
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

  return (
    <div className="lineup-optimizer-page">
      <header className="lineup-optimizer__hero">
        <button className="back-action" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Back to dashboard</button>
        <div className="lineup-optimizer__hero-copy">
          <p className="lineup-optimizer__eyebrow">Phase 3.1 · Weekly lineup optimizer</p>
          <h1>Set your strongest lineup</h1>
          <p>See the highest-projected legal lineup for {week}, then preview changes before you set anything in ESPN.</p>
        </div>
        <div className="lineup-optimizer__source" aria-label={`${profile ? 'ESPN roster' : 'Preview roster'} source`}>
          <ClipboardCheck aria-hidden="true" />
          <span>{profile ? 'ESPN roster' : 'Preview roster'}</span>
          <small>{profile?.scoring ?? 'PPR'} · {roster.length} players</small>
        </div>
      </header>

      {!profile && (
        <div className="lineup-optimizer__notice" role="status">
          <Info aria-hidden="true" />
          <p><strong>Preview roster is active.</strong> Import your ESPN-compatible roster to get recommendations for your own players. Local estimates power this foundation; matchup and injury context arrive next.</p>
          <button className="secondary-action" type="button" onClick={onManageRoster}>Import ESPN roster</button>
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
              <p>{optimization.swaps.length ? `${optimization.swaps.length} move${optimization.swaps.length === 1 ? '' : 's'} improve the local projection.` : 'No higher-projected bench move found.'}</p>
            </div>
          </div>
          <div className="lineup-change-list">
            {optimization.swaps.length ? optimization.swaps.map((swap) => <ChangeRow key={swap.id} swap={swap} />) : <div className="lineup-empty-state"><Check aria-hidden="true" /><p>Your current starters are already the best available local projection.</p></div>}
          </div>
          <p className="lineup-boundary"><Info aria-hidden="true" /> Previewing changes here never writes to ESPN.</p>
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
    </div>
  )
}
