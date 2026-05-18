export type ConstraintMode = 'open' | 'locked' | 'pool'

export interface Player {
  id: string
  name: string
  mode: ConstraintMode
  /** For `locked` mode: the single fixed partner's id. */
  partnerId: string | null
  /** For `pool` mode: the set of player ids this player may partner with. */
  poolIds: string[]
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
  /** Player ids sitting out this round. */
  sitoutIds: string[]
  /** True once "End Round" is pressed; scores become read-only. */
  locked: boolean
}

export type TabKey = 'players' | 'round' | 'leaderboard'
