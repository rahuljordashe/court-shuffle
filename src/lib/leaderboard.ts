import type { Player, Round } from './types'

export interface PlayerStats {
  id: string
  name: string
  games: number
  wins: number
  losses: number
  pointDiff: number
  /** Win percentage 0-100. 0 when no games played. */
  winPct: number
}

export type SortKey = 'winPct' | 'pointDiff'

/**
 * Aggregate per-player stats across every locked round that has scores.
 * A court only counts once both teams have a score entered.
 */
export function computeLeaderboard(players: Player[], rounds: Round[]): PlayerStats[] {
  const map = new Map<string, PlayerStats>()
  for (const p of players) {
    map.set(p.id, {
      id: p.id,
      name: p.name,
      games: 0,
      wins: 0,
      losses: 0,
      pointDiff: 0,
      winPct: 0,
    })
  }

  for (const round of rounds) {
    if (!round.locked) continue
    for (const court of round.courts) {
      const [t0, t1] = court.teams
      if (t0.score === null || t1.score === null) continue
      applyTeam(map, t0.players, t0.score, t1.score)
      applyTeam(map, t1.players, t1.score, t0.score)
    }
  }

  for (const st of map.values()) {
    st.winPct = st.games > 0 ? (st.wins / st.games) * 100 : 0
  }
  return [...map.values()]
}

function applyTeam(
  map: Map<string, PlayerStats>,
  ids: [string, string],
  own: number,
  opp: number,
): void {
  for (const id of ids) {
    const st = map.get(id)
    if (!st) continue
    st.games += 1
    st.pointDiff += own - opp
    if (own > opp) st.wins += 1
    else if (own < opp) st.losses += 1
  }
}

export function sortLeaderboard(stats: PlayerStats[], key: SortKey): PlayerStats[] {
  return [...stats].sort((a, b) => {
    if (b[key] !== a[key]) return b[key] - a[key]
    if (b.games !== a.games) return b.games - a.games
    return a.name.localeCompare(b.name)
  })
}
