import { useRef, useState } from 'react'
import { AlertTriangle, Check, Database, Download, FileUp, ShieldCheck, X } from 'lucide-react'
import type { ScoringFormat } from '../league/types'
import { parseRankingCsv, rankingCsvTemplate } from './rankingParser'
import type { DraftDataSet, RankingImportIssue } from './types'

type RankingDataDialogProps = {
  current: DraftDataSet
  picksCount: number
  requiredPlayers: number
  onClose: () => void
  onImport: (dataSet: DraftDataSet) => void
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

export function RankingDataDialog({ current, picksCount, requiredPlayers, onClose, onImport, onReset }: RankingDataDialogProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [sourceName, setSourceName] = useState('My current rankings')
  const [scoring, setScoring] = useState<ScoringFormat>(current.scoring)
  const [text, setText] = useState('')
  const [issues, setIssues] = useState<RankingImportIssue[]>([])
  const [preview, setPreview] = useState<DraftDataSet | null>(null)
  const locked = picksCount > 0

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

  return (
    <div className="dialog-backdrop ranking-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog ranking-dialog" role="dialog" aria-modal="true" aria-labelledby="ranking-dialog-title">
        <button className="dialog__close" type="button" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></button>
        <span className="dialog__icon dialog__icon--blue"><Database aria-hidden="true" /></span>
        <p className="dialog__context">Phase 2.1 · Ranking data</p>
        <h2 id="ranking-dialog-title">Manage your draft rankings</h2>
        <p className="dialog__intro">Import a current CSV from your preferred ranking provider. The file is processed and saved only in this browser.</p>

        <div className="ranking-current">
          <div><span>Current source</span><strong>{current.sourceName}</strong></div>
          <div><span>Players</span><strong>{current.players.length}</strong></div>
          <div><span>Scoring</span><strong>{current.scoring}</strong></div>
          <div><span>Updated</span><strong>{new Date(current.importedAt).toLocaleDateString()}</strong></div>
        </div>
        <div className={current.players.length >= requiredPlayers ? 'ranking-coverage is-ready' : 'ranking-coverage'}><span>{current.players.length >= requiredPlayers ? 'Full draft coverage' : 'Partial draft pool'}</span><strong>{current.players.length >= requiredPlayers ? `Enough players for all ${requiredPlayers} picks.` : `Import at least ${requiredPlayers} players to cover every scheduled pick.`}</strong></div>

        {locked ? (
          <div className="ranking-lock"><AlertTriangle aria-hidden="true" /><div><strong>Finish or reset the current draft first.</strong><p>Changing player IDs during a draft could invalidate saved picks, so ranking replacement is locked after pick one.</p></div></div>
        ) : (
          <>
            <div className="ranking-fields">
              <label><span>Source name</span><input value={sourceName} onChange={(event) => setSourceName(event.target.value)} /></label>
              <label><span>Scoring format</span><select value={scoring} onChange={(event) => setScoring(event.target.value as ScoringFormat)}><option>PPR</option><option>Half PPR</option><option>Standard</option></select></label>
            </div>
            <label className="ranking-paste"><span>Ranking CSV</span><textarea value={text} onChange={(event) => { setText(event.target.value); setPreview(null); setIssues([]) }} placeholder={rankingCsvTemplate} /></label>
            <input ref={fileInput} className="sr-only" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(event) => readFile(event.target.files?.[0])} />
            <div className="ranking-actions">
              <button className="secondary-action" type="button" onClick={() => fileInput.current?.click()}><FileUp aria-hidden="true" /> Upload CSV</button>
              <button className="plain-action" type="button" onClick={downloadTemplate}><Download aria-hidden="true" /> Download template</button>
              <button className="primary-action" type="button" disabled={!text.trim()} onClick={() => parse()}>Validate rankings</button>
            </div>

            {preview && <div className="ranking-preview"><Check aria-hidden="true" /><div><strong>{preview.players.length} valid players ready</strong><p>{preview.players.filter((player) => player.projectedPoints > 0).length} include projections · {issues.length} rows need attention{preview.players.length < requiredPlayers ? ` · ${requiredPlayers - preview.players.length} short of full draft coverage` : ''}</p></div><button className="primary-action" type="button" onClick={() => onImport(preview)}>Use these rankings</button></div>}
            {issues.length > 0 && <div className="ranking-issues" role="status"><strong>Import notes</strong>{issues.slice(0, 5).map((issue) => <p key={`${issue.lineNumber}-${issue.message}`}>Line {issue.lineNumber}: {issue.message}</p>)}{issues.length > 5 && <p>Plus {issues.length - 5} more rows.</p>}</div>}
          </>
        )}

        <div className="ranking-privacy"><ShieldCheck aria-hidden="true" /><span>No file is uploaded to Fantasy Assistant. A future server-side provider connection can use an API key without exposing it in the browser.</span></div>
        {current.sourceName !== 'Fantasy Assistant demo' && !locked && <button className="ranking-reset" type="button" onClick={onReset}>Restore built-in demonstration rankings</button>}
      </section>
    </div>
  )
}
