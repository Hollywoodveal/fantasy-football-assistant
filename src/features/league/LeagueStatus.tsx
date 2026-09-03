import { Check, Database, Link2, ShieldCheck } from 'lucide-react'
import type { LeagueProfile } from './types'

type LeagueStatusProps = {
  profile: LeagueProfile | null
  onManage: () => void
}

export function LeagueStatus({ profile, onManage }: LeagueStatusProps) {
  if (!profile) {
    return (
      <section className="league-status league-status--empty" aria-labelledby="league-status-title">
        <span className="league-status__icon"><Link2 aria-hidden="true" /></span>
        <div className="league-status__copy">
          <h2 id="league-status-title">Connect your ESPN league</h2>
          <p>Import your league settings and roster without sharing an ESPN password.</p>
        </div>
        <span className="league-status__privacy"><ShieldCheck aria-hidden="true" /> Stored on this device</span>
        <button className="secondary-action league-status__action" type="button" onClick={onManage}>
          Import roster
        </button>
      </section>
    )
  }

  const starters = profile.roster.filter((player) => player.slot === 'Starter').length
  const bench = profile.roster.filter((player) => player.slot === 'Bench').length

  return (
    <section className="league-status" aria-labelledby="league-status-title">
      <span className="league-status__icon league-status__icon--connected"><Database aria-hidden="true" /></span>
      <div className="league-status__copy">
        <span className="league-status__eyebrow"><Check aria-hidden="true" /> ESPN roster imported</span>
        <h2 id="league-status-title">{profile.teamName}</h2>
        <p>{profile.leagueName} · {profile.scoring} · {profile.teamCount} teams</p>
      </div>
      <div className="league-status__counts" aria-label="Imported roster summary">
        <span><strong>{profile.roster.length}</strong> Players</span>
        <span><strong>{starters}</strong> Starters</span>
        <span><strong>{bench}</strong> Bench</span>
      </div>
      <button className="secondary-action league-status__action" type="button" onClick={onManage}>
        Manage roster
      </button>
    </section>
  )
}
