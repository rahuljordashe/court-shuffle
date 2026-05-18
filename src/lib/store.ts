import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConstraintMode, Player, Round, TabKey } from './types'
import { generateRound as runGenerator } from './generator'
import { uid } from './utils'

interface SessionState {
  players: Player[]
  courtCount: number
  rounds: Round[]
  generationError: string | null
  activeTab: TabKey

  addPlayer: (name: string) => void
  renamePlayer: (id: string, name: string) => void
  removePlayer: (id: string) => void
  setMode: (id: string, mode: ConstraintMode) => void
  setLockedPartner: (id: string, partnerId: string) => void
  togglePoolMember: (id: string, otherId: string) => void
  setCourtCount: (count: number) => void
  generateNextRound: () => void
  setScore: (roundIndex: number, courtIndex: number, teamIndex: number, score: number | null) => void
  endRound: () => void
  resetSession: () => void
  setActiveTab: (tab: TabKey) => void
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

      addPlayer: (name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        const player: Player = {
          id: uid(),
          name: trimmed,
          mode: 'open',
          partnerId: null,
          poolIds: [],
        }
        set((s) => ({ players: [...s.players, player] }))
      },

      renamePlayer: (id, name) => {
        set((s) => ({
          players: s.players.map((p) => (p.id === id ? { ...p, name } : p)),
        }))
      },

      removePlayer: (id) => {
        set((s) => ({
          players: s.players
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
            }),
        }))
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

      generateNextRound: () => {
        const { players, courtCount, rounds } = get()
        const last = rounds[rounds.length - 1]
        if (last && !last.locked) {
          set({ generationError: 'Finish the current round before generating the next one.' })
          return
        }
        const result = runGenerator(players, courtCount, rounds)
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
        set({ rounds: [...rounds, round], generationError: null, activeTab: 'round' })
      },

      setScore: (roundIndex, courtIndex, teamIndex, score) => {
        set((s) => ({
          rounds: s.rounds.map((r) => {
            if (r.index !== roundIndex || r.locked) return r
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
        set({ rounds: [], generationError: null })
      },

      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'court-shuffle-v1',
      version: 1,
      partialize: (s) => ({
        players: s.players,
        courtCount: s.courtCount,
        rounds: s.rounds,
        activeTab: s.activeTab,
      }),
    },
  ),
)
