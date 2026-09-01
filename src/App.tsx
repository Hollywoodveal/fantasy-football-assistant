import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  X,
  Zap,
  WifiOff,
  AlertCircle,
  Moon,
  Sun,
} from 'lucide-react'
import { Brand } from './components/Brand'
import { BottomNavigation, SideNavigation, type NavKey } from './components/Navigation'
import { lineupMoves, waiverTargets } from './data/demo'

type DialogView = 'lineup' | 'waivers' | 'draft' | 'more' | 'help' | null
type Theme = 'dark' | 'light'

function App() {
  const [week, setWeek] = useState(() => localStorage.getItem('selectedWeek') || 'Week 1')
  const [activeNav, setActiveNav] = useState<NavKey>('home')
  const [dialog, setDialog] = useState<DialogView>(null)
  const [optimized, setOptimized] = useState(() => localStorage.getItem('lineupOptimized') === 'true')
  const [toast, setToast] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    return saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
  })
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const projectedTotal = optimized ? '137.2' : '124.8'

  // Persist week selection
  useEffect(() => {
    localStorage.setItem('selectedWeek', week)
  }, [week])

  // Persist optimized state
  useEffect(() => {
    localStorage.setItem('lineupOptimized', String(optimized))
  }, [optimized])

  // Persist theme preference
  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.style.colorScheme = theme
  }, [theme])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Help dialog (?)
      if (e.shiftKey && e.key === '?') {
        e.preventDefault()
        setDialog('help')
        return
      }

      // Close dialog (Escape)
      if (e.key === 'Escape' && dialog) {
        setDialog(null)
        return
      }

      // Navigation shortcuts (Alt+number)
      if (e.altKey) {
        const navMap: Record<string, NavKey> = {
          '1': 'home',
          '2': 'lineup',
          '3': 'draft',
          '4': 'waivers',
          '5': 'more',
        }
        if (navMap[e.key]) {
          e.preventDefault()
          navigate(navMap[e.key])
        }
      }

      // Optimize lineup (Ctrl+L or Cmd+L)
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault()
        setDialog('lineup')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dialog])

  const navigate = (key: NavKey) => {
    setActiveNav(key)
    if (key === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (key === 'more') {
      setDialog('more')
      return
    }
    const section = document.getElementById(key)
    section?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const applyLineup = () => {
    try {
      setOptimized(true)
      setDialog(null)
      setToast('Lineup preview optimized. ESPN was not changed.')
      setHasError(false)
    } catch (error) {
      setHasError(true)
      setErrorMessage('Failed to apply lineup changes.')
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className={`app-shell${isOnline ? '' : ' offline'}${theme === 'light' ? ' light-mode' : ''}`}>
      {!isOnline && (
        <div className="offline-indicator" role="status">
          <WifiOff aria-hidden="true" />
          Offline — using cached data
        </div>
      )}

      <SideNavigation active={activeNav} onNavigate={navigate} />

      <main className="app-main">
        <header className="top-bar">
          <div className="mobile-brand"><Brand compact /></div>
          <button className="league-select desktop-only" type="button" onClick={() => setDialog('more')}>
            Hollywood Veal <ChevronDown aria-hidden="true" />
          </button>
          <label className="week-select">
            <span className="sr-only">Select fantasy week</span>
            <select value={week} onChange={(event) => setWeek(event.target.value)}>
              {Array.from({ length: 18 }, (_, index) => (
                <option key={index + 1}>Week {index + 1}</option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" />
          </label>
          <button 
            className="theme-toggle" 
            type="button" 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="profile-button" type="button" onClick={() => setDialog('more')} aria-label="Open profile and settings">
            A<span aria-hidden="true" />
          </button>
        </header>

        <div className="content-wrap">
          <section className="welcome" aria-labelledby="welcome-title">
            <div className="field-lines" aria-hidden="true" />
            <h1 id="welcome-title">Good evening, Anthony</h1>
            <p>Your best moves for the week</p>
          </section>

          <section className="matchup" aria-label={`${week} projected matchup`}>
            <div className="team team--home">
              <span className="team-mark team-mark--home"><Zap aria-hidden="true" /></span>
              <span className="team__name">Hollywood Veal</span>
            </div>
            <div className="matchup__score">
              <strong className={optimized ? 'score-optimized' : ''}>{projectedTotal}</strong>
              <span aria-hidden="true">—</span>
              <strong>118.3</strong>
              <small>Projected</small>
            </div>
            <div className="team team--away">
              <span className="team__name">Gridiron Kings</span>
              <span className="team-mark"><Trophy aria-hidden="true" /></span>
            </div>
          </section>

          {hasError && (
            <div className="error-message" role="alert">
              <AlertCircle aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="dashboard-grid">
            <section className="panel lineup-panel" id="lineup" aria-labelledby="lineup-title">
              <div className="panel__heading">
                <span className="section-icon section-icon--lime"><ClipboardCheck aria-hidden="true" /></span>
                <div>
                  <h2 id="lineup-title">Optimize your lineup</h2>
                  <p>{optimized ? 'Your strongest lineup is ready' : <>3 changes could add <strong>+12.4 pts</strong></>}</p>
                </div>
                {optimized && <span className="optimized-state"><Check aria-hidden="true" /> Optimized</span>}
                <button className="mobile-lineup-action" type="button" onClick={() => setDialog('lineup')}>
                  Review changes <ChevronRight aria-hidden="true" />
                </button>
              </div>

              <div className="lineup-list">
                {lineupMoves.slice(0, 3).map((move) => (
                  <div className="lineup-row" key={move.id}>
                    <span className="start-label">Start</span>
                    <span className="position-tag">{move.position}</span>
                    <span className="player player--start">
                      <strong>{move.start}</strong>
                      <small>{move.startMeta}</small>
                    </span>
                    <span className="swap"><ArrowRightLeft aria-hidden="true" /><small>over</small></span>
                    <span className="player player--sit">
                      <strong>{move.sit}</strong>
                      <small>{move.sitMeta}</small>
                    </span>
                    <strong className="gain">+{move.gain.toFixed(1)} pts</strong>
                  </div>
                ))}
              </div>

              <button className={`primary-action desktop-lineup-action${optimized ? ' primary-action--done' : ''}`} type="button" onClick={() => setDialog('lineup')}>
                {optimized ? 'Review optimized lineup' : 'Review changes'}
                {optimized ? <Check aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
              </button>
            </section>

            <section className="panel waiver-panel" id="waivers" aria-labelledby="waivers-title">
              <div className="panel__heading panel__heading--row">
                <span className="section-icon"><Target aria-hidden="true" /></span>
                <h2 id="waivers-title">Top waiver targets</h2>
                <button className="text-action" type="button" onClick={() => setDialog('waivers')}>View all <ChevronRight aria-hidden="true" /></button>
              </div>
              <div className="waiver-labels" aria-hidden="true">
                <span>Rank</span><span>Player</span><span>Available</span><span>Proj. gain</span>
              </div>
              <div className="waiver-list">
                {waiverTargets.slice(0, 3).map((target) => (
                  <button className="waiver-row" type="button" key={target.id} onClick={() => setDialog('waivers')}>
                    <strong className="rank">{target.rank}</strong>
                    <span className="position-tag">{target.position}</span>
                    <span className="player">
                      <strong>{target.player}</strong>
                      <small>{target.matchup}</small>
                    </span>
                    <span className="available">{target.available}%</span>
                    <strong className="gain">+{target.gain.toFixed(1)} pts</strong>
                  </button>
                ))}
              </div>
              <button className="desktop-view-all text-action" type="button" onClick={() => setDialog('waivers')}>View all <ChevronRight aria-hidden="true" /></button>
            </section>

            <section className="panel draft-panel" id="draft" aria-labelledby="draft-title">
              <span className="section-icon"><Trophy aria-hidden="true" /></span>
              <div>
                <h2 id="draft-title">Draft room</h2>
                <p>Prep for your upcoming draft.</p>
              </div>
              <div className="draft-board-art" aria-hidden="true">
                <span /><span /><span /><span /><span /><span /><span /><span /><span />
              </div>
              <button className="secondary-action" type="button" onClick={() => setDialog('draft')}>Open draft board <ChevronRight aria-hidden="true" /></button>
            </section>
          </div>
        </div>
      </main>

      <BottomNavigation active={activeNav} onNavigate={navigate} />

      {dialog && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
          <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <button className="dialog__close" type="button" onClick={() => setDialog(null)} aria-label="Close"><X aria-hidden="true" /></button>

            {dialog === 'lineup' && (
              <>
                <span className="dialog__icon"><Sparkles aria-hidden="true" /></span>
                <p className="dialog__context">{week} recommendation</p>
                <h2 id="dialog-title">Add 12.4 projected points</h2>
                <p className="dialog__intro">These changes favor the strongest balanced projection while accounting for matchup and role.</p>
                <div className="dialog-moves">
                  {lineupMoves.map((move) => (
                    <div key={move.id}>
                      <span className="position-tag">{move.position}</span>
                      <p><strong>{move.start}</strong><span>over {move.sit}</span></p>
                      <strong className="gain">+{move.gain.toFixed(1)}</strong>
                    </div>
                  ))}
                </div>
                <div className="dialog__note"><Zap aria-hidden="true" /><span>This previews the recommendation here. It does not change your ESPN lineup.</span></div>
                <button className="primary-action" type="button" onClick={applyLineup}>{optimized ? 'Keep lineup optimized' : 'Apply to preview'} <ArrowRight aria-hidden="true" /></button>
                {optimized && <button className="plain-action" type="button" onClick={() => { setOptimized(false); setDialog(null); setToast('Lineup preview reset.') }}>Reset preview</button>}
              </>
            )}

            {dialog === 'waivers' && (
              <>
                <span className="dialog__icon dialog__icon--blue"><RefreshCw aria-hidden="true" /></span>
                <p className="dialog__context">League-aware rankings</p>
                <h2 id="dialog-title">Best available upgrades</h2>
                <p className="dialog__intro">Ranked by expected improvement over your current roster, not by projection alone.</p>
                <div className="waiver-detail-list">
                  {waiverTargets.map((target) => (
                    <div className="waiver-detail" key={target.id}>
                      <strong className="rank">{target.rank}</strong>
                      <span className="position-tag">{target.position}</span>
                      <p><strong>{target.player}</strong><small>{target.reason}</small></p>
                      <strong className="gain">+{target.gain.toFixed(1)}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}

            {dialog === 'draft' && (
              <>
                <span className="dialog__icon dialog__icon--blue"><Trophy aria-hidden="true" /></span>
                <p className="dialog__context">Draft room</p>
                <h2 id="dialog-title">Build your draft board</h2>
                <p className="dialog__intro">Your scoring rules, roster slots, draft position, and strategy will shape every recommendation.</p>
                <div className="setup-steps">
                  <span><strong>1</strong> Confirm league rules</span>
                  <span><strong>2</strong> Choose draft strategy</span>
                  <span><strong>3</strong> Start the live assistant</span>
                </div>
                <button className="secondary-action dialog__full-action" type="button" onClick={() => { setDialog(null); setToast('Draft setup will open in the Draft Assistant phase.') }}>Start draft assistant <ArrowRight aria-hidden="true" /></button>
              </>
            )}

            {dialog === 'more' && (
              <>
                <span className="dialog__icon dialog__icon--blue"><UserRound aria-hidden="true" /></span>
                <p className="dialog__context">Fantasy Assistant</p>
                <h2 id="dialog-title">Hollywood Veal</h2>
                <p className="dialog__intro">ESPN-compatible demo league · PPR · 12 teams</p>
                <div className="settings-list">
                  <button type="button">League settings <ChevronRight aria-hidden="true" /></button>
                  <button type="button">Recommendation preferences <ChevronRight aria-hidden="true" /></button>
                  <button type="button">Import ESPN roster <ChevronRight aria-hidden="true" /></button>
                </div>
              </>
            )}

            {dialog === 'help' && (
              <>
                <span className="dialog__icon dialog__icon--blue"><Target aria-hidden="true" /></span>
                <p className="dialog__context">Keyboard shortcuts</p>
                <h2 id="dialog-title">Navigate faster</h2>
                <p className="dialog__intro">Use these shortcuts to quickly navigate the app.</p>
                <div className="keyboard-help">
                  <div className="help-row"><kbd>Alt + 1</kbd><span>Home</span></div>
                  <div className="help-row"><kbd>Alt + 2</kbd><span>Lineup</span></div>
                  <div className="help-row"><kbd>Alt + 3</kbd><span>Draft</span></div>
                  <div className="help-row"><kbd>Alt + 4</kbd><span>Waivers</span></div>
                  <div className="help-row"><kbd>Alt + 5</kbd><span>Settings</span></div>
                  <div className="help-row"><kbd>Ctrl + L</kbd><span>Open lineup</span></div>
                  <div className="help-row"><kbd>Esc</kbd><span>Close dialog</span></div>
                  <div className="help-row"><kbd>Shift + ?</kbd><span>Show this help</span></div>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><Check aria-hidden="true" />{toast}</div>}
    </div>
  )
}

export default App
