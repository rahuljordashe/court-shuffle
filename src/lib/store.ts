import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConstraintMode, Court, Player, Round, TabKey, Team } from './types'
import { generateRound as runGenerator } from './generator'
import { uid } from './utils'

interface SessionState {
  players: Player[]
  courtCount: number
  rounds: Round[]
  generationError: string | null
  activeTab: TabKey
  /** Transient: true for one beat after a round is generated, drives the reveal. */
  roundJustGenerated: boolean
  /** Transient: snapshot for undoing the most recent player removal. */
  removalUndo: { players: Player[]; removedName: string } | null
  /** Transient: snapshot of rounds for undoing a session reset. */
  sessionUndo: { rounds: Round[] } | null

  addPlayer: (name: string) => void
  renamePlayer: (id: string, name: string) => void
  removePlayer: (id: string) => void
  setMode: (id: string, mode: ConstraintMode) => void
  setLockedPartner: (id: string, partnerId: string) => void
  togglePoolMember: (id: string, otherId: string) => void
  setCourtCount: (count: number) => void
  setPlayerAway: (id: string, away: boolean) => void
  generateNextRound: () => void
  rerollRound: () => void
  swapPlayers: (idA: string, idB: string) => void
  setScore: (roundIndex: number, courtIndex: number, teamIndex: number, score: number | null) => void
  endRound: () => void
  resetSession: () => void
  undoResetSession: () => void
  clearSessionUndo: () => void
  setActiveTab: (tab: TabKey) => void
  consumeRoundReveal: () => void
  undoRemovePlayer: () => void
  clearRemovalUndo: () => void
}

function clearConstraint(p: Player): Player {
  return { ...p, mode: 'open', partnerId: null, poolIds: [] }
}

export const useStore = create<SessionState>()(
  persist(
    (set, get) => ({
      players: [],
      courtCount: 2,
      rounds: [],
      generationError: null,
      activeTab: 'players',
      roundJustGenerated: false,
      removalUndo: null,
      sessionUndo: null,

      addPlayer: (name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        const player: Player = {
          id: uid(),
          name: trimmed,
          mode: 'open',
          partnerId: null,
          poolIds: [],
          away: false,
        }
        set((s) => ({ players: [...s.players, player] }))
      },

      renamePlayer: (id, name) => {
        set((s) => ({
          players: s.players.map((p) => (p.id === id ? { ...p, name } : p)),
        }))
      },

      removePlayer: (id) => {
        set((s) => {
          const removed = s.players.find((p) => p.id === id)
          if (!removed) return {}
          const players = s.players
            .filter((p) => p.id !== id)
            .map((p) => {
              let next = p
              if (next.partnerId === id) {
                next = { ...next, mode: 'open', partnerId: null }
              }
              if (next.poolIds.includes(id)) {
                next = { ...next, poolIds: next.poolIds.filter((x) => x !== id) }
              }
              return next
            })
          // Snapshot the whole roster so undo restores freed locked/pool links
          // along with the player.
          return {
            players,
            removalUndo: { players: s.players, removedName: removed.name },
          }
        })
      },

      setMode: (id, mode) => {
        set((s) => {
          const target = s.players.find((p) => p.id === id)
          if (!target) return {}
          const formerPartnerId = target.mode === 'locked' ? target.partnerId : null
          return {
            players: s.players.map((p) => {
              if (p.id === id) {
                if (mode === 'locked') return { ...p, mode, partnerId: null, poolIds: [] }
                if (mode === 'pool') return { ...p, mode, partnerId: null, poolIds: p.poolIds }
                return { ...p, mode: 'open', partnerId: null, poolIds: [] }
              }
              // If this player was the former locked partner, free them too.
              if (p.id === formerPartnerId && p.partnerId === id) {
                return clearConstraint(p)
              }
              return p
            }),
          }
        })
      },

      setLockedPartner: (id, partnerId) => {
        set((s) => {
          const a = s.players.find((p) => p.id === id)
          const b = s.players.find((p) => p.id === partnerId)
          if (!a || !b || id === partnerId) return {}
          // Anyone previously locked to a or b is released.
          const releasedIds = new Set<string>()
          for (const p of s.players) {
            if ((p.id === a.partnerId && p.id !== b.id) || (p.id === b.partnerId && p.id !== a.id)) {
              releasedIds.add(p.id)
            }
          }
          return {
            players: s.players.map((p) => {
              if (p.id === id) return { ...p, mode: 'locked', partnerId, poolIds: [] }
              if (p.id === partnerId) return { ...p, mode: 'locked', partnerId: id, poolIds: [] }
              if (releasedIds.has(p.id)) return clearConstraint(p)
              return p
            }),
          }
        })
      },

      togglePoolMember: (id, otherId) => {
        if (id === otherId) return
        set((s) => ({
          players: s.players.map((p) => {
            if (p.id !== id) return p
            const has = p.poolIds.includes(otherId)
            return {
              ...p,
              mode: 'pool',
              partnerId: null,
              poolIds: has
                ? p.poolIds.filter((x) => x !== otherId)
                : [...p.poolIds, otherId],
            }
          }),
        }))
      },

      setCourtCount: (count) => {
        // Minimum 1 court, no upper limit; the generator uses fewer courts than
        // requested when the roster cannot fill them all.
        const clamped = Math.max(1, Math.round(count))
        set({ courtCount: clamped })
      },

      setPlayerAway: (id, away) => {
        set((s) => ({
          players: s.players.map((p) => (p.id === id ? { ...p, away } : p)),
        }))
      },

      generateNextRound: () => {
        const { players, courtCount, rounds } = get()
        const last = rounds[rounds.length - 1]
        if (last && !last.locked) {
          set({ generationError: 'Finish the current round before generating the next one.' })
          return
        }
        // Players marked Away stay on the roster but sit out generation.
        const active = players.filter((p) => !p.away)
        if (active.length < 4) {
          set({
            generationError:
              players.length >= 4
                ? 'Not enough players in the rotation. Bring someone back from Away.'
                : 'Add at least 4 players to generate a round.',
          })
          return
        }
        const result = runGenerator(active, courtCount, rounds)
        if (!result.ok || !result.courts || !result.sitoutIds) {
          set({ generationError: result.reason ?? 'Could not generate a valid round.' })
          return
        }
        const round: Round = {
          index: rounds.length + 1,
          courts: result.courts,
          sitoutIds: result.sitoutIds,
          locked: false,
        }
        set({
          rounds: [...rounds, round],
          generationError: null,
          activeTab: 'round',
          roundJustGenerated: true,
        })
      },

      rerollRound: () => {
        const { players, courtCount, rounds } = get()
        const last = rounds[rounds.length - 1]
        if (!last || last.locked) return
        const active = players.filter((p) => !p.away)
        if (active.length < 4) {
          set({
            generationError:
              players.length >= 4
                ? 'Not enough players in the rotation. Bring someone back from Away.'
                : 'Add at least 4 players to generate a round.',
          })
          return
        }
        // Score the re-roll against history WITHOUT the round being replaced,
        // so it genuinely re-shuffles instead of scoring against itself.
        const priorRounds = rounds.slice(0, -1)
        const result = runGenerator(active, courtCount, priorRounds)
        if (!result.ok || !result.courts || !result.sitoutIds) {
          set({ generationError: result.reason ?? 'Could not generate a valid round.' })
          return
        }
        const round: Round = {
          index: last.index,
          courts: result.courts,
          sitoutIds: result.sitoutIds,
          locked: false,
        }
        set({
          rounds: [...priorRounds, round],
          generationError: null,
          roundJustGenerated: true,
        })
      },

      swapPlayers: (idA, idB) => {
        if (idA === idB) return
        set((s) => {
          const last = s.rounds[s.rounds.length - 1]
          if (!last || last.locked) return {}
          const swap = (id: string) => (id === idA ? idB : id === idB ? idA : id)
          const courts: Court[] = last.courts.map((c) => ({
            teams: c.teams.map((t) => ({
              ...t,
              players: t.players.map(swap) as [string, string],
            })) as [Team, Team],
          }))
          const sitoutIds = last.sitoutIds.map(swap)
          return {
            rounds: s.rounds.map((r) =>
              r.index === last.index ? { ...r, courts, sitoutIds } : r,
            ),
          }
        })
      },

      setScore: (roundIndex, courtIndex, teamIndex, score) => {
        set((s) => ({
          rounds: s.rounds.map((r) => {
            // Locked rounds stay editable so a disputed score can be corrected
            // from the round-history view; the leaderboard recomputes live.
            if (r.index !== roundIndex) return r
            return {
              ...r,
              courts: r.courts.map((c, ci) => {
                if (ci !== courtIndex) return c
                const teams = c.teams.map((t, ti) =>
                  ti === teamIndex ? { ...t, score } : t,
                ) as typeof c.teams
                return { ...c, teams }
              }),
            }
          }),
        }))
      },

      endRound: () => {
        set((s) => {
          const last = s.rounds[s.rounds.length - 1]
          if (!last || last.locked) return {}
          return {
            rounds: s.rounds.map((r) =>
              r.index === last.index ? { ...r, locked: true } : r,
            ),
          }
        })
      },

      resetSession: () => {
        set((s) => {
          if (s.rounds.length === 0) return { generationError: null }
          // Snapshot rounds so an accidental reset can be undone from the toast.
          return {
            rounds: [],
            generationError: null,
            activeTab: 'players',
            sessionUndo: { rounds: s.rounds },
          }
        })
      },

      undoResetSession: () =>
        set((s) =>
          s.sessionUndo ? { rounds: s.sessionUndo.rounds, sessionUndo: null } : {},
        ),

      clearSessionUndo: () => set({ sessionUndo: null }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      consumeRoundReveal: () => set({ roundJustGenerated: false }),

      undoRemovePlayer: () =>
        set((s) =>
          s.removalUndo ? { players: s.removalUndo.players, removalUndo: null } : {},
        ),

      clearRemovalUndo: () => set({ removalUndo: null }),
    }),
    {
      name: 'court-shuffle-v1',
      version: 2,
      // v2 added Player.away; backfill it for sessions persisted under v1.
      migrate: (persisted, version) => {
        const state = persisted as Partial<SessionState>
        if (version < 2 && state.players) {
          state.players = state.players.map((p) => ({ away: false, ...p }))
        }
        return state as SessionState
      },
      partialize: (s) => ({
        players: s.players,
        courtCount: s.courtCount,
        rounds: s.rounds,
        activeTab: s.activeTab,
      }),
    },
  ),
)
