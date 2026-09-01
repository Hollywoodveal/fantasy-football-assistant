import {
  ClipboardList,
  Home,
  MoreHorizontal,
  RefreshCw,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { Brand } from './Brand'

export type NavKey = 'home' | 'lineup' | 'draft' | 'waivers' | 'more'

const items: { key: NavKey; label: string; Icon: LucideIcon }[] = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'lineup', label: 'Lineup', Icon: ClipboardList },
  { key: 'draft', label: 'Draft', Icon: Trophy },
  { key: 'waivers', label: 'Waivers', Icon: RefreshCw },
  { key: 'more', label: 'More', Icon: MoreHorizontal },
]

type NavigationProps = {
  active: NavKey
  onNavigate: (key: NavKey) => void
}

function NavItems({ active, onNavigate }: NavigationProps) {
  return items.map(({ key, label, Icon }) => (
    <button
      className={`nav-item${active === key ? ' nav-item--active' : ''}`}
      key={key}
      onClick={() => onNavigate(key)}
      aria-current={active === key ? 'page' : undefined}
      type="button"
    >
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </button>
  ))
}

export function SideNavigation(props: NavigationProps) {
  return (
    <aside className="side-nav">
      <Brand />
      <nav aria-label="Primary navigation">
        <NavItems {...props} />
      </nav>
      <div className="side-nav__field" aria-hidden="true">
        <span>40</span>
        <span>50</span>
        <span>40</span>
      </div>
    </aside>
  )
}

export function BottomNavigation(props: NavigationProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <NavItems {...props} />
    </nav>
  )
}
