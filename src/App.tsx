import { useStore } from '@/lib/store'
import type { TabKey } from '@/lib/types'
import { cn } from '@/lib/utils'
import { PlayersScreen } from './components/PlayersScreen'
import { RoundScreen } from './components/RoundScreen'
import { LeaderboardScreen } from './components/LeaderboardScreen'
import { Toaster } from './components/Toaster'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'players', label: 'Players' },
  { key: 'round', label: 'Round' },
  { key: 'leaderboard', label: 'Leaders' },
]

export default function App() {
  const activeTab = useStore((s) => s.activeTab)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const playerCount = useStore((s) => s.players.length)

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-paper">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-paper px-5 py-3.5">
        <h1
          data-testid="app-title"
          className="text-base font-extrabold uppercase tracking-[0.18em] text-ink"
        >
          Court<span className="text-signal">/</span>Shuffle
        </h1>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-ink-soft">
          {playerCount} {playerCount === 1 ? 'Player' : 'Players'}
        </span>
      </header>

      <main className="flex-1 px-5 pb-28">
        {activeTab === 'players' && <PlayersScreen />}
        {activeTab === 'round' && <RoundScreen />}
        {activeTab === 'leaderboard' && <LeaderboardScreen />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const on = activeTab === t.key
          return (
            <button
              key={t.key}
              data-testid={`tab-${t.key}`}
              data-active={on}
              onClick={() => setActiveTab(t.key)}
              className="flex flex-1 flex-col items-center"
            >
              <span className={cn('h-[3px] w-full', on ? 'bg-signal' : 'bg-transparent')} />
              <span
                className={cn(
                  'py-3.5 text-[11px] font-extrabold uppercase tracking-[0.13em] transition-colors duration-150',
                  on ? 'text-ink' : 'text-ink-faint',
                )}
              >
                {t.label}
              </span>
            </button>
          )
        })}
      </nav>

      <Toaster />
    </div>
  )
}
