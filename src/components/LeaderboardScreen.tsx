import { useState } from 'react'
import { useStore } from '@/lib/store'
import { computeLeaderboard, sortLeaderboard, type SortKey } from '@/lib/leaderboard'
import { cn } from '@/lib/utils'
import { Panel, SectionLabel } from './ui'

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function LeaderboardScreen() {
  const players = useStore((s) => s.players)
  const rounds = useStore((s) => s.rounds)
  const [sortKey, setSortKey] = useState<SortKey>('winPct')
  // Bumped on each sort change so the rows re-key and deal back in. Stays 0 on
  // first paint and tab re-entry, so the standings never animate unprompted.
  const [resortNonce, setResortNonce] = useState(0)

  const changeSort = (key: SortKey) => {
    if (key === sortKey) return
    setSortKey(key)
    setResortNonce((n) => n + 1)
  }

  const stats = sortLeaderboard(computeLeaderboard(players, rounds), sortKey)

  if (rounds.length === 0) {
    return (
      <div className="space-y-3 pt-6">
        <SectionLabel>Standings</SectionLabel>
        <Panel className="px-4 py-10 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-faint">
            No standings yet
          </p>
          <p className="mt-1.5 text-xs text-ink-soft">
            The leaderboard appears once the first round is generated.
          </p>
        </Panel>
      </div>
    )
  }

  const noScores = stats.every((s) => s.games === 0)

  return (
    <div className="space-y-3 pt-6">
      <SectionLabel>Standings</SectionLabel>

      <div className="grid grid-cols-2 gap-2">
        <SortButton
          active={sortKey === 'winPct'}
          testid="sort-winpct"
          onClick={() => changeSort('winPct')}
        >
          Win %
        </SortButton>
        <SortButton
          active={sortKey === 'pointDiff'}
          testid="sort-diff"
          onClick={() => changeSort('pointDiff')}
        >
          Point Diff
        </SortButton>
      </div>

      <div
        key={resortNonce}
        className={cn(
          'overflow-hidden rounded-md border border-rule bg-raised',
          resortNonce > 0 && 'deal-in',
        )}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-soft">
              <th className="w-9 py-2 pl-3 text-left font-extrabold">#</th>
              <th className="py-2 text-left font-extrabold">Player</th>
              <th className="py-2 text-right font-extrabold">Win %</th>
              <th className="py-2 text-right font-extrabold">Diff</th>
              <th className="w-14 py-2 pr-3 text-right font-extrabold">W / G</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((st, i) => (
              <tr
                key={st.id}
                data-testid="leaderboard-row"
                data-name={st.name}
                data-winpct={round1(st.winPct)}
                data-diff={st.pointDiff}
                data-wins={st.wins}
                data-games={st.games}
                className={cn(i > 0 && 'border-t border-rule')}
              >
                <td className="py-2.5 pl-3 text-left text-[13px] font-extrabold tabular-nums text-ink-faint">
                  {i + 1}
                </td>
                <td className="py-2.5 pr-2 font-bold text-ink">
                  <span className="block max-w-[8rem] truncate">{st.name}</span>
                </td>
                <td className="py-2.5 text-right font-bold tabular-nums text-ink">
                  {st.games > 0 ? `${round1(st.winPct)}%` : '—'}
                </td>
                <td
                  className={cn(
                    'py-2.5 text-right font-bold tabular-nums',
                    st.pointDiff > 0
                      ? 'text-ink'
                      : st.pointDiff < 0
                        ? 'text-ink-soft'
                        : 'text-ink-faint',
                  )}
                >
                  {st.pointDiff > 0 ? `+${st.pointDiff}` : st.pointDiff}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-ink-faint">
                  {st.wins}/{st.games}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {noScores && (
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
          Enter court scores and end a round to populate stats
        </p>
      )}
    </div>
  )
}

function SortButton({
  active,
  testid,
  onClick,
  children,
}: {
  active: boolean
  testid: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      data-testid={testid}
      data-active={active}
      onClick={onClick}
      className={cn(
        'min-h-12 rounded-md border text-xs font-extrabold uppercase tracking-[0.1em] transition-colors duration-150',
        active ? 'border-ink bg-ink text-paper' : 'border-rule bg-raised text-ink-soft',
      )}
    >
      {children}
    </button>
  )
}
