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
  /** Transient: snapshot for undoing the most recent player check-out. */
  checkoutUndo: { players: Player[]; name: string } | null
  /** Transient: snapshot of rounds and roster for undoing a session reset. */
  sessionUndo: { rounds: Round[]; players: Player[] } | null

  addPlayer: (name: string) => void
  renamePlayer: (id: string, name: string) => void
  removePlayer: (id: string) => void
  setMode: (id: string, mode: ConstraintMode) => void
  setLockedPartner: (id: string, partnerId: string) => void
  togglePoolMember: (id: string, otherId: string) => void
  setCourtCount: (count: number) => void
  setPlayerResting: (id: string, resting: boolean) => void
  checkOutPlayer: (id: string) => void
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
  undoCheckOut: () => void
  clearCheckoutUndo: () => void
}

function clearConstraint(p: Player): Player {
  return { ...p, mode: 'open', partnerId: null, poolIds: [] }
}

/** True when the player has appeared on a court, sit-out, or rest in any round. */
function appearsInRounds(id: string, rounds: Round[]): boolean {
  for (const r of rounds) {
    if (r.sitoutIds.includes(id) || r.restingIds.includes(id)) return true
    for (const c of r.courts) {
      for (const t of c.teams) {
        if (t.players[0] === id || t.players[1] === id) return true
      }
    }
  }
  return false
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
      checkoutUndo: null,
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
          status: 'playing',
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
          // A player who has appeared in a round is checked out, never deleted,
          // so their leaderboard record and round history survive. Hard
          // deletion is reserved for roster entries with no history.
          if (appearsInRounds(id, s.rounds)) return {}
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

      setPlayerResting: (id, resting) => {
        // A resting player stays in the session but sits the next round out.
        // A checked-out player cannot be toggled — they have left for good.
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id && p.status !== 'left'
              ? { ...p, status: resting ? 'resting' : 'playing' }
              : p,
          ),
        }))
      },

      checkOutPlayer: (id) => {
        set((s) => {
          const target = s.players.find((p) => p.id === id)
          if (!target || target.status === 'left') return {}
          // The player stays on the roster as `left` so their leaderboard
          // record survives; their constraints are cleared and anyone linked
          // to them is released.
          const players: Player[] = s.players.map((p) => {
            if (p.id === id) return { ...clearConstraint(p), status: 'left' }
            let next = p
            if (next.partnerId === id) {
              next = { ...next, mode: 'open', partnerId: null }
            }
            if (next.poolIds.includes(id)) {
              next = { ...next, poolIds: next.poolIds.filter((x) => x !== id) }
            }
            return next
          })
          return {
            players,
            checkoutUndo: { players: s.players, name: target.name },
          }
        })
      },

      generateNextRound: () => {
        const { players, courtCount, rounds } = get()
        const last = rounds[rounds.length - 1]
        if (last && !last.locked) {
          set({ generationError: 'Finish the current round before generating the next one.' })
          return
        }
        // `playing` players fill courts; `resting` players sit the round out
        // but stay in the session; `left` players are gone for good.
        const active = players.filter((p) => p.status === 'playing')
        const resting = players.filter((p) => p.status === 'resting')
        if (active.length < 4) {
          const roster = players.filter((p) => p.status !== 'left').length
          set({
            generationError:
              roster >= 4
                ? 'Not enough players in the rotation. Bring someone back from resting.'
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
          restingIds: resting.map((p) => p.id),
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
        const active = players.filter((p) => p.status === 'playing')
        const resting = players.filter((p) => p.status === 'resting')
        if (active.length < 4) {
          const roster = players.filter((p) => p.status !== 'left').length
          set({
            generationError:
              roster >= 4
                ? 'Not enough players in the rotation. Bring someone back from resting.'
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
          restingIds: resting.map((p) => p.id),
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
          // A cleared session is a fresh start: everyone returns to the
          // rotation, including anyone who was resting or had checked out.
          const players: Player[] = s.players.map((p) =>
            p.status === 'playing' ? p : { ...p, status: 'playing' },
          )
          // Snapshot rounds and roster so an accidental reset can be undone.
          return {
            rounds: [],
            players,
            generationError: null,
            activeTab: 'players',
            sessionUndo: { rounds: s.rounds, players: s.players },
          }
        })
      },

      undoResetSession: () =>
        set((s) =>
          s.sessionUndo
            ? {
                rounds: s.sessionUndo.rounds,
                players: s.sessionUndo.players,
                sessionUndo: null,
              }
            : {},
        ),

      clearSessionUndo: () => set({ sessionUndo: null }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      consumeRoundReveal: () => set({ roundJustGenerated: false }),

      undoRemovePlayer: () =>
        set((s) =>
          s.removalUndo ? { players: s.removalUndo.players, removalUndo: null } : {},
        ),

      clearRemovalUndo: () => set({ removalUndo: null }),

      undoCheckOut: () =>
        set((s) =>
          s.checkoutUndo ? { players: s.checkoutUndo.players, checkoutUndo: null } : {},
        ),

      clearCheckoutUndo: () => set({ checkoutUndo: null }),
    }),
    {
      name: 'court-shuffle-v1',
      version: 3,
      // v2 added Player.away; v3 replaced it with Player.status and added
      // Round.restingIds. Backfill both for sessions persisted under v1/v2.
      migrate: (persisted, version) => {
        const state = persisted as {
          players?: Array<Record<string, unknown>>
          rounds?: Array<Record<string, unknown>>
          [k: string]: unknown
        }
        if (version < 2 && state.players) {
          state.players = state.players.map((p) => ({ away: false, ...p }))
        }
        if (version < 3 && state.players) {
          state.players = state.players.map(({ away, ...rest }) => ({
            ...rest,
            status: away ? 'resting' : 'playing',
          }))
        }
        if (version < 3 && state.rounds) {
          state.rounds = state.rounds.map((r) => ({ restingIds: [], ...r }))
        }
        return state as unknown as SessionState
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
