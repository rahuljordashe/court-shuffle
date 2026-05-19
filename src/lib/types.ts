export type ConstraintMode = 'open' | 'locked' | 'pool'

/**
 * A player's lifecycle within a session:
 *  - `playing`: in the rotation for the next generated round.
 *  - `resting`: temporarily out by choice; rejoins when toggled back. A
 *    rested round still counts as a sit-out for fairness — a break is one
 *    bench turn, not an extra one.
 *  - `left`: checked out. Excluded from every future round, but the
 *    leaderboard record and past rounds are preserved. Reversible — a
 *    checked-out player can be brought back, returning as `resting`.
 */
export type PlayerStatus = 'playing' | 'resting' | 'left'

export interface Player {
  id: string
  name: string
  mode: ConstraintMode
  /** For `locked` mode: the single fixed partner's id. */
  partnerId: string | null
  /** For `pool` mode: the set of player ids this player may partner with. */
  poolIds: string[]
  /** Session lifecycle state. See {@link PlayerStatus}. */
  status: PlayerStatus
}

export interface Team {
  /** Exactly two player ids. */
  players: [string, string]
  /** Points scored by this team this round; null until entered. */
  score: number | null
}

export interface Court {
  teams: [Team, Team]
}

export interface Round {
  /** 1-based round number. */
  index: number
  courts: Court[]
  /** Player ids the generator benched this round for lack of court space. */
  sitoutIds: string[]
  /**
   * Player ids who were `resting` this round — off-court by their own choice.
   * Disjoint from `sitoutIds`; both count equally as a sit-out for fairness.
   */
  restingIds: string[]
  /** True once "End Round" is pressed; scores become read-only. */
  locked: boolean
}

export type TabKey = 'players' | 'round' | 'leaderboard'
