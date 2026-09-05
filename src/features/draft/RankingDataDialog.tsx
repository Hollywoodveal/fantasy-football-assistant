import { useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, Check, Database, Download, FileUp, RefreshCw, ShieldCheck, WandSparkles, X } from 'lucide-react'
import type { ScoringFormat } from '../league/types'
import { refreshLivePlayerData } from './liveData'
import { parseRankingCsv, rankingCsvTemplate } from './rankingParser'
import type { DraftDataSet, RankingImportIssue } from './types'

type RankingDataDialogProps = {
  current: DraftDataSet
  picksCount: number
  requiredPlayers: number
  onClose: () => void
  onImport: (dataSet: DraftDataSet) => void
  onLiveDataUpdate: (dataSet: DraftDataSet) => void
  onReset: () => void
}

function downloadTemplate() {
  const blob = new Blob([rankingCsvTemplate], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'fantasy-assistant-ranking-template.csv'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function RankingDataDialog({ current, picksCount, requiredPlayers, onClose, onImport, onLiveDataUpdate, onReset }: RankingDataDialogProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [sourceName, setSourceName] = useState('My current rankings')
  const [scoring, setScoring] = useState<ScoringFormat>(current.scoring)
  const [text, setText] = useState('')
  const [issues, setIssues] = useState<RankingImportIssue[]>([])
  const [preview, setPreview] = useState<DraftDataSet | null>(null)
  const [liveRefreshState, setLiveRefreshState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [liveRefreshMessage, setLiveRefreshMessage] = useState('')
  const locked = picksCount > 0
  const ageInDays = Math.max(0, Math.floor((Date.now() - new Date(current.importedAt).getTime()) / 86_400_000))

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const parse = (value = text, name = sourceName) => {
    const result = parseRankingCsv(value, name, scoring)
    setIssues(result.issues)
    setPreview(result.dataSet)
  }

  const readFile = async (file?: File) => {
    if (!file) return
    const value = await file.text()
    setText(value)
    const inferredName = file.name.replace(/\.(csv|txt)$/i, '')
    setSourceName(inferredName)
    parse(value, inferredName)
  }

  const refreshLiveData = async () => {
    setLiveRefreshState('loading')
    setLiveRefreshMessage('')
    try {
      const nextDataSet = await refreshLivePlayerData(current)
      onLiveDataUpdate(nextDataSet)
      setLiveRefreshState('success')
      setLiveRefreshMessage(`${nextDataSet.liveData?.matchedPlayers ?? 0} ranking entries matched current NFL player records.`)
    } catch (error) {
      setLiveRefreshState('error')
      setLiveRefreshMessage(error instanceof Error ? error.message : 'Live player data could not be refreshed.')
    }
  }

  return (
    <div className="dialog-backdrop ranking-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        className="dialog ranking-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ranking-dialog-title"
        aria-describedby="ranking-dialog-description"
      >
        <button className="dialog__close" type="button" onClick={onClose} aria-label="Close rankings" autoFocus><X aria-hidden="true" /></button>
        <span className="dialog__icon dialog__icon--blue"><Database aria-hidden="true" /></span>
        <p className="dialog__context">Phase 2.3.2 · Draft-day ready</p>
        <h2 id="ranking-dialog-title">Manage your draft rankings</h2>
        <p className="dialog__intro" id="ranking-dialog-description">Refresh current player status, then combine it with rankings from your preferred provider. Your ranking file stays in this browser.</p>

        <section className="live-data-card" aria-labelledby="live-data-title">
          <div className="live-data-card__heading">
            <Activity aria-hidden="true" />
            <div><span>Player metadata</span><strong id="live-data-title">{current.liveData?.providerName ?? 'Live source not checked'}</strong></div>
            <button type="button" disabled={liveRefreshState === 'loading'} onClick={refreshLiveData}><RefreshCw className={liveRefreshState === 'loading' ? 'is-spinning' : ''} aria-hidden="true" /> {liveRefreshState === 'loading' ? 'Refreshing' : 'Refresh live data'}</button>
          </div>
          {current.liveData ? (
            <div className="live-data-card__stats">
              <span><small>Season</small><strong>{current.liveData.season}</strong></span>
              <span><small>Week</small><strong>{current.liveData.week || 'Preseason'}</strong></span>
              <span><small>Matched</small><strong>{current.liveData.matchedPlayers}/{current.players.length}</strong></span>
              <span><small>Checked</small><strong>{new Date(current.liveData.refreshedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</strong></span>
            </div>
          ) : <p className="live-data-card__empty">Refresh to verify teams, availability, and injury designations. Rankings, ADP, and projections are never replaced.</p>}
          {liveRefreshMessage && <p className={`live-data-message is-${liveRefreshState}`} role={liveRefreshState === 'error' ? 'alert' : 'status'}>{liveRefreshMessage}</p>}
          <p className="live-data-card__boundary"><ShieldCheck aria-hidden="true" /> Sleeper supplies read-only player metadata for non-commercial use. Your selected ranking source remains authoritative.</p>
        </section>

        <div className="ranking-current">
          <div><span>Current source</span><strong>{current.sourceName}</strong></div>
          <div><span>Players</span><strong>{current.players.length}</strong></div>
          <div><span>Scoring</span><strong>{current.scoring}</strong></div>
          <div><span>Updated</span><strong>{new Date(current.importedAt).toLocaleDateString()}</strong></div>
        </div>
        <div className={current.players.length >= requiredPlayers ? 'ranking-coverage is-ready' : 'ranking-coverage'}><span>{current.players.length >= requiredPlayers ? 'Full draft coverage' : 'Partial draft pool'}</span><strong>{current.players.length >= requiredPlayers ? `Enough players for all ${requiredPlayers} picks.` : `Import at least ${requiredPlayers} players to cover every scheduled pick.`}</strong></div>
        {ageInDays > 14 && <div className="ranking-stale"><AlertTriangle aria-hidden="true" /><span>These rankings are {ageInDays} days old. Import a fresh export before draft day.</span></div>}

        {locked ? (
          <div className="ranking-lock"><AlertTriangle aria-hidden="true" /><div><strong>Finish or reset the current draft first.</strong><p>Changing player IDs during a draft could invalidate saved picks, so ranking replacement is locked after pick one.</p></div></div>
        ) : (
          <>
            <div className="ranking-fields">
              <label><span>Source name</span><input list="ranking-source-options" value={sourceName} onChange={(event) => setSourceName(event.target.value)} /><datalist id="ranking-source-options"><option value="ESPN export" /><option value="FantasyPros export" /><option value="My custom rankings" /></datalist></label>
              <label><span>Scoring format</span><select value={scoring} onChange={(event) => setScoring(event.target.value as ScoringFormat)}><option>PPR</option><option>Half PPR</option><option>Standard</option></select></label>
            </div>
            <label className="ranking-paste"><span>Ranking CSV</span><textarea value={text} onChange={(event) => { setText(event.target.value); setPreview(null); setIssues([]) }} placeholder={rankingCsvTemplate} /></label>
            <input ref={fileInput} className="sr-only" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(event) => readFile(event.target.files?.[0])} />
            <div className="ranking-actions">
              <button className="secondary-action" type="button" onClick={() => fileInput.current?.click()}><FileUp aria-hidden="true" /> Upload CSV</button>
              <button className="plain-action" type="button" onClick={downloadTemplate}><Download aria-hidden="true" /> Download template</button>
              <button className="primary-action" type="button" disabled={!text.trim()} onClick={() => parse()}>Validate rankings</button>
            </div>

            {preview && <><div className="ranking-mapping"><WandSparkles aria-hidden="true" /><span><strong>Columns detected automatically</strong>{preview.importSummary?.mappedColumns.join(' · ') || 'Player · Position'} · {preview.importSummary?.delimiter || 'comma'} separated</span></div><div className="ranking-position-counts">{(['QB', 'RB', 'WR', 'TE', 'D/ST', 'K'] as const).map((item) => <span key={item}><b>{item}</b>{preview.importSummary?.positionCounts[item] ?? 0}</span>)}</div><div className="ranking-preview"><Check aria-hidden="true" /><div><strong>{preview.players.length} valid players ready</strong><p>{preview.importSummary?.projectionCount ?? 0} include projections · {issues.length} rows need attention{preview.players.length < requiredPlayers ? ` · ${requiredPlayers - preview.players.length} short of full draft coverage` : ''}</p></div><button className="primary-action" type="button" onClick={() => onImport(preview)}>Use these rankings</button></div></>}
            {issues.length > 0 && <div className="ranking-issues" role="status"><strong>Import notes</strong>{issues.slice(0, 5).map((issue) => <p className={`is-${issue.severity}`} key={`${issue.lineNumber}-${issue.message}`}>Line {issue.lineNumber}: {issue.message}{issue.suggestion ? ` ${issue.suggestion}` : ''}</p>)}{issues.length > 5 && <p>Plus {issues.length - 5} more rows.</p>}</div>}
          </>
        )}

        <div className="ranking-privacy"><ShieldCheck aria-hidden="true" /><span>No ranking file is uploaded to Fantasy Assistant. Live metadata is fetched through the Cloudflare Worker, and future provider keys stay server-side.</span></div>
        {current.sourceName !== 'Fantasy Assistant demo' && !locked && <button className="ranking-reset" type="button" onClick={onReset}>Restore built-in demonstration rankings</button>}
      </section>
    </div>
  )
}
