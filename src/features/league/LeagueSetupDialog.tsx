import { useRef, useState, type ChangeEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import { parseRosterText, sampleRosterText, serializeRoster } from './rosterParser'
import { scoringFormats, type LeagueProfile, type RosterParseError } from './types'

type LeagueSetupDialogProps = {
  initialProfile: LeagueProfile | null
  onClose: () => void
  onSave: (profile: LeagueProfile) => void
}

type LeagueDraft = Pick<LeagueProfile, 'leagueId' | 'leagueName' | 'teamName' | 'season' | 'scoring' | 'teamCount'>

const currentSeason = new Date().getFullYear()

export function LeagueSetupDialog({ initialProfile, onClose, onSave }: LeagueSetupDialogProps) {
  const [step, setStep] = useState(initialProfile ? 3 : 1)
  const [league, setLeague] = useState<LeagueDraft>(() => initialProfile ?? {
    leagueId: '',
    leagueName: '',
    teamName: '',
    season: currentSeason,
    scoring: 'PPR',
    teamCount: 12,
  })
  const [rosterText, setRosterText] = useState(() => initialProfile ? serializeRoster(initialProfile.roster) : '')
  const [roster, setRoster] = useState(() => initialProfile?.roster ?? [])
  const [parseErrors, setParseErrors] = useState<RosterParseError[]>([])
  const [formError, setFormError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateLeague = <Key extends keyof LeagueDraft>(key: Key, value: LeagueDraft[Key]) => {
    setLeague((current) => ({ ...current, [key]: value }))
    setFormError('')
  }

  const continueFromLeague = () => {
    if (!league.leagueName.trim() || !league.teamName.trim()) {
      setFormError('Enter both your ESPN league name and team name to continue.')
      return
    }
    setStep(2)
  }

  const reviewRoster = () => {
    const result = parseRosterText(rosterText)
    setRoster(result.players)
    setParseErrors(result.errors)
    if (result.players.length === 0) {
      setFormError('Add at least one valid player before continuing.')
      return
    }
    setFormError('')
    setStep(3)
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setRosterText(text)
    setFormError('')
    event.target.value = ''
  }

  const saveProfile = () => {
    onSave({
      schemaVersion: 1,
      platform: 'espn',
      ...league,
      leagueId: league.leagueId.trim(),
      leagueName: league.leagueName.trim(),
      teamName: league.teamName.trim(),
      roster,
      importedAt: new Date().toISOString(),
    })
  }

  const starterCount = roster.filter((player) => player.slot === 'Starter').length
  const benchCount = roster.filter((player) => player.slot === 'Bench').length

  return (
    <div className="dialog-backdrop league-setup-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="league-setup" role="dialog" aria-modal="true" aria-labelledby="league-setup-title">
        <header className="league-setup__header">
          <div>
            <p>ESPN-compatible setup</p>
            <h2 id="league-setup-title">{initialProfile ? 'Manage your league' : 'Connect your league'}</h2>
          </div>
          <button className="dialog__close" type="button" onClick={onClose} aria-label="Close league setup"><X aria-hidden="true" /></button>
        </header>

        <ol className="setup-progress" aria-label={`Step ${step} of 3`}>
          {['League', 'Roster', 'Review'].map((label, index) => {
            const number = index + 1
            return (
              <li className={number === step ? 'setup-progress__active' : number < step ? 'setup-progress__complete' : ''} key={label}>
                <span>{number < step ? <Check aria-hidden="true" /> : number}</span>{label}
              </li>
            )
          })}
        </ol>

        {step === 1 && (
          <div className="league-setup__body">
            <div className="setup-intro">
              <span className="setup-intro__icon"><ShieldCheck aria-hidden="true" /></span>
              <div>
                <h3>Tell us about your ESPN league</h3>
                <p>This creates the scoring and roster context future recommendations will use.</p>
              </div>
            </div>

            <div className="setup-form-grid">
              <label className="form-field">
                <span>League name</span>
                <input value={league.leagueName} onChange={(event) => updateLeague('leagueName', event.target.value)} placeholder="The League of Ordinary Gentlemen" autoFocus />
              </label>
              <label className="form-field">
                <span>Your team name</span>
                <input value={league.teamName} onChange={(event) => updateLeague('teamName', event.target.value)} placeholder="Hollywood Veal" />
              </label>
              <label className="form-field">
                <span>Scoring</span>
                <select value={league.scoring} onChange={(event) => updateLeague('scoring', event.target.value as LeagueDraft['scoring'])}>
                  {scoringFormats.map((format) => <option key={format}>{format}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>League size</span>
                <select value={league.teamCount} onChange={(event) => updateLeague('teamCount', Number(event.target.value))}>
                  {[8, 10, 12, 14, 16].map((count) => <option value={count} key={count}>{count} teams</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Season</span>
                <select value={league.season} onChange={(event) => updateLeague('season', Number(event.target.value))}>
                  {[currentSeason, currentSeason + 1].map((season) => <option key={season}>{season}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>ESPN League ID <small>Optional</small></span>
                <input value={league.leagueId} onChange={(event) => updateLeague('leagueId', event.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Found in your ESPN league URL" />
              </label>
            </div>

            <div className="privacy-note"><LockKeyhole aria-hidden="true" /><span>Never enter an ESPN password, private cookie, or login code. Phase 1 stores this setup only in your browser.</span></div>
          </div>
        )}

        {step === 2 && (
          <div className="league-setup__body">
            <div className="setup-intro">
              <span className="setup-intro__icon"><FileText aria-hidden="true" /></span>
              <div>
                <h3>Import your roster</h3>
                <p>Paste one player per line or upload a TXT/CSV file. Columns can use pipes, commas, or tabs.</p>
              </div>
            </div>

            <div className="import-format">
              <code>QB | Player name | NFL team | Starter</code>
              <button type="button" onClick={() => { setRosterText(sampleRosterText); setFormError('') }}>Use sample roster</button>
            </div>

            <label className="form-field form-field--wide">
              <span>Roster list</span>
              <textarea value={rosterText} onChange={(event) => { setRosterText(event.target.value); setFormError('') }} placeholder="QB | Jordan Love | GB | Starter" autoFocus />
            </label>

            <div className="import-actions">
              <input className="sr-only" ref={fileInputRef} type="file" accept=".txt,.csv,text/plain,text/csv" onChange={handleFile} />
              <button className="upload-action" type="button" onClick={() => fileInputRef.current?.click()}><Upload aria-hidden="true" /> Upload TXT or CSV</button>
              <span>Your file is read locally and is not uploaded.</span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="league-setup__body">
            <div className="setup-intro setup-intro--review">
              <span className="setup-intro__icon setup-intro__icon--complete"><Check aria-hidden="true" /></span>
              <div>
                <h3>Review your ESPN roster</h3>
                <p>Confirm the league and player totals before saving this roster on your device.</p>
              </div>
            </div>

            <div className="review-league">
              <div><span>League</span><strong>{league.leagueName}</strong></div>
              <div><span>Team</span><strong>{league.teamName}</strong></div>
              <div><span>Format</span><strong>{league.scoring} · {league.teamCount} teams</strong></div>
            </div>

            <div className="review-counts" aria-label="Roster totals">
              <span><strong>{roster.length}</strong> Players</span>
              <span><strong>{starterCount}</strong> Starters</span>
              <span><strong>{benchCount}</strong> Bench</span>
            </div>

            {parseErrors.length > 0 && (
              <details className="parse-errors">
                <summary>{parseErrors.length} {parseErrors.length === 1 ? 'line needs' : 'lines need'} attention</summary>
                <ul>
                  {parseErrors.map((error) => <li key={`${error.lineNumber}-${error.source}`}><strong>Line {error.lineNumber}:</strong> {error.message}</li>)}
                </ul>
              </details>
            )}

            <div className="roster-preview" aria-label="Imported players">
              <div className="roster-preview__labels" aria-hidden="true"><span>Pos</span><span>Player</span><span>Team</span><span>Slot</span></div>
              {roster.map((player) => (
                <div className="roster-preview__row" key={player.id}>
                  <span className="position-tag">{player.position}</span>
                  <strong>{player.name}</strong>
                  <span>{player.nflTeam}</span>
                  <span>{player.slot}</span>
                </div>
              ))}
            </div>

            <p className="phase-note">Player projections and automatic ESPN syncing arrive in later phases. This release creates the secure league and roster foundation.</p>
          </div>
        )}

        {formError && <p className="form-error" role="alert">{formError}</p>}

        <footer className="league-setup__footer">
          {step > 1 ? (
            <button className="back-action" type="button" onClick={() => { setStep((current) => current - 1); setFormError('') }}><ArrowLeft aria-hidden="true" /> Back</button>
          ) : <span />}
          {step === 1 && <button className="primary-action" type="button" onClick={continueFromLeague}>Continue to roster <ArrowRight aria-hidden="true" /></button>}
          {step === 2 && <button className="primary-action" type="button" onClick={reviewRoster}>Review import <ArrowRight aria-hidden="true" /></button>}
          {step === 3 && <button className="primary-action" type="button" onClick={saveProfile}>{initialProfile ? 'Save roster changes' : 'Save ESPN roster'} <Check aria-hidden="true" /></button>}
        </footer>
      </section>
    </div>
  )
}
