import { useRef, useState, type ChangeEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  FileText,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { fetchPublicEspnLeague, profileFromEspnLeague, type EspnLeagueSync } from './espnSync'
import { parseRosterText, sampleRosterText, serializeRoster } from './rosterParser'
import { scoringFormats, type EspnPublicSync, type LeagueProfile, type RosterParseError } from './types'

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
  const [syncMetadata, setSyncMetadata] = useState<EspnPublicSync | undefined>(() => initialProfile?.sync)
  const [syncedLeague, setSyncedLeague] = useState<EspnLeagueSync | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
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
    setSyncMetadata(undefined)
    setFormError('')
    setStep(3)
  }

  const findPublicLeague = async () => {
    if (!/^\d{1,20}$/.test(league.leagueId)) {
      setFormError('Enter the numeric League ID from your ESPN fantasy league URL.')
      return
    }

    setIsSyncing(true)
    setFormError('')
    setSyncedLeague(null)
    try {
      const result = await fetchPublicEspnLeague(league.leagueId, league.season)
      setSyncedLeague(result)
      setSelectedTeamId(result.teams[0]?.id ?? null)
      setLeague((current) => ({
        ...current,
        leagueId: result.leagueId,
        leagueName: result.leagueName,
        season: result.season,
        scoring: result.scoring,
        teamCount: result.teamCount,
      }))
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'ESPN league sync failed. Use manual import instead.')
    } finally {
      setIsSyncing(false)
    }
  }

  const reviewSyncedTeam = () => {
    if (!syncedLeague || selectedTeamId === null) {
      setFormError('Choose your team from the synced ESPN league.')
      return
    }
    try {
      const profile = profileFromEspnLeague(syncedLeague, selectedTeamId)
      setLeague({
        leagueId: profile.leagueId,
        leagueName: profile.leagueName,
        teamName: profile.teamName,
        season: profile.season,
        scoring: profile.scoring,
        teamCount: profile.teamCount,
      })
      setRoster(profile.roster)
      setRosterText(serializeRoster(profile.roster))
      setParseErrors([])
      setSyncMetadata(profile.sync)
      setFormError('')
      setStep(3)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'That ESPN team could not be imported.')
    }
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
      sync: syncMetadata,
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
            <section className="espn-sync-card" aria-labelledby="espn-sync-title">
              <div className="setup-intro">
                <span className="setup-intro__icon"><RefreshCw aria-hidden="true" /></span>
                <div>
                  <p className="espn-sync-card__eyebrow">Recommended · read-only</p>
                  <h3 id="espn-sync-title">Sync a public ESPN league</h3>
                  <p>Enter the League ID from your ESPN league URL. No password, cookie, or login code is requested.</p>
                </div>
              </div>

              <div className="espn-sync-form">
                <label className="form-field">
                  <span>ESPN League ID</span>
                  <input value={league.leagueId} onChange={(event) => updateLeague('leagueId', event.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Example: 123456789" autoFocus />
                </label>
                <label className="form-field">
                  <span>Season</span>
                  <select value={league.season} onChange={(event) => updateLeague('season', Number(event.target.value))}>
                    {[currentSeason - 1, currentSeason, currentSeason + 1].map((season) => <option key={season}>{season}</option>)}
                  </select>
                </label>
                <button className="primary-action espn-sync-submit" type="button" onClick={findPublicLeague} disabled={isSyncing}>
                  <RefreshCw className={isSyncing ? 'is-spinning' : ''} aria-hidden="true" /> {isSyncing ? 'Checking ESPN…' : 'Find public league'}
                </button>
              </div>

              {syncedLeague && (
                <div className="espn-sync-result" role="status">
                  <span className="espn-sync-result__icon"><Database aria-hidden="true" /></span>
                  <div className="espn-sync-result__copy">
                    <strong>{syncedLeague.leagueName}</strong>
                    <span>{syncedLeague.scoring} · {syncedLeague.teamCount} teams · Week {syncedLeague.scoringPeriodId || 'preseason'}</span>
                  </div>
                  <label className="form-field espn-team-select">
                    <span>Choose your team</span>
                    <select aria-label="Choose your ESPN team" value={selectedTeamId ?? ''} onChange={(event) => setSelectedTeamId(Number(event.target.value))}>
                      {syncedLeague.teams.map((team) => <option key={team.id} value={team.id}>{team.name} · {team.roster.length} players</option>)}
                    </select>
                  </label>
                  <button className="secondary-action" type="button" onClick={reviewSyncedTeam}><Users aria-hidden="true" /> Review synced roster</button>
                </div>
              )}
            </section>

            <div className="setup-divider"><span>or import manually</span></div>

            <div className="setup-intro">
              <span className="setup-intro__icon"><ShieldCheck aria-hidden="true" /></span>
              <div>
                <h3>Enter league details manually</h3>
                <p>Use this fallback for private leagues or whenever ESPN public access is unavailable.</p>
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
            </div>

            <div className="privacy-note"><LockKeyhole aria-hidden="true" /><span>Fantasy Assistant requests public, read-only league data through its Cloudflare Worker. Your selected roster is stored only in this browser.</span></div>
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
                <p>{syncMetadata ? 'Confirm the public ESPN team and roster before saving it on this device.' : 'Confirm the league and player totals before saving this roster on your device.'}</p>
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

            <p className="phase-note">{syncMetadata ? 'Read-only ESPN sync is connected. Fantasy Assistant cannot submit lineup, waiver, trade, or draft changes to ESPN.' : 'Manual fallback is active. You can connect public ESPN read-only sync later from Manage roster.'}</p>
          </div>
        )}

        {formError && <p className="form-error" role="alert">{formError}</p>}

        <footer className="league-setup__footer">
          {step > 1 ? (
            <button className="back-action" type="button" onClick={() => { setStep((current) => current - 1); setFormError('') }}><ArrowLeft aria-hidden="true" /> Back</button>
          ) : <span />}
          {step === 1 && <button className="primary-action" type="button" onClick={continueFromLeague}>Continue to roster <ArrowRight aria-hidden="true" /></button>}
          {step === 2 && <button className="primary-action" type="button" onClick={reviewRoster}>Review import <ArrowRight aria-hidden="true" /></button>}
          {step === 3 && <button className="primary-action" type="button" onClick={saveProfile}>{syncMetadata ? 'Save synced ESPN roster' : initialProfile ? 'Save roster changes' : 'Save ESPN roster'} <Check aria-hidden="true" /></button>}
        </footer>
      </section>
    </div>
  )
}
