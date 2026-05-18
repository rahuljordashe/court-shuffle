import type { Court, Player, Round } from './types'

/**
 * Round generation.
 *
 * Uses a scored randomised search (not brute-force enumeration). Each iteration
 * builds one full candidate round, all candidates are scored, and the best is
 * kept. Hard constraints (Locked / Pool) are enforced structurally: candidates
 * that cannot satisfy them are discarded rather than penalised.
 *
 * Scoring priority, highest first:
 *   1. Maximise never-before-paired partner combinations.
 *   2. Maximise never-before-faced opponent matchups.
 *   3. Minimise the spread of sit-out counts across the session.
 */

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

interface Stats {
  partner: Record<string, number>
  opponent: Record<string, number>
  sitout: Record<string, number>
}

function buildStats(players: Player[], rounds: Round[]): Stats {
  const partner: Record<string, number> = {}
  const opponent: Record<string, number> = {}
  const sitout: Record<string, number> = {}
  for (const p of players) sitout[p.id] = 0
  for (const round of rounds) {
    for (const id of round.sitoutIds) {
      if (id in sitout) sitout[id] += 1
    }
    for (const court of round.courts) {
      const [t0, t1] = court.teams
      const k0 = pairKey(t0.players[0], t0.players[1])
      const k1 = pairKey(t1.players[0], t1.players[1])
      partner[k0] = (partner[k0] ?? 0) + 1
      partner[k1] = (partner[k1] ?? 0) + 1
      for (const a of t0.players) {
        for (const b of t1.players) {
          const k = pairKey(a, b)
          opponent[k] = (opponent[k] ?? 0) + 1
        }
      }
    }
  }
  return { partner, opponent, sitout }
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

function weightedPick(items: string[], weight: (x: string) => number): string {
  let total = 0
  const weights = items.map((x) => {
    const v = Math.max(weight(x), 0.0001)
    total += v
    return v
  })
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

interface Unit {
  ids: string[]
  locked: boolean
}

export interface GenerationResult {
  ok: boolean
  reason?: string
  courts?: Court[]
  sitoutIds?: string[]
}

const ITERATIONS = 2500

export function generateRound(
  players: Player[],
  courtCount: number,
  rounds: Round[],
): GenerationResult {
  const total = players.length
  if (total < 4) {
    return { ok: false, reason: 'Add at least 4 players to generate a round.' }
  }
  const byId = new Map(players.map((p) => [p.id, p]))
  const stats = buildStats(players, rounds)

  // Locked pairs travel as one unit (always play together or sit together).
  const seen = new Set<string>()
  const units: Unit[] = []
  for (const p of players) {
    if (seen.has(p.id)) continue
    if (p.mode === 'locked' && p.partnerId && byId.has(p.partnerId)) {
      const partner = byId.get(p.partnerId)!
      if (partner.mode === 'locked' && partner.partnerId === p.id) {
        seen.add(p.id)
        seen.add(partner.id)
        units.push({ ids: [p.id, partner.id], locked: true })
        continue
      }
    }
    seen.add(p.id)
    units.push({ ids: [p.id], locked: false })
  }

  const capacity = courtCount * 4
  const playingCount = Math.min(capacity, Math.floor(total / 4) * 4)
  if (playingCount < 4) {
    return { ok: false, reason: 'Not enough players to fill a court.' }
  }
  const sitoutCount = total - playingCount
  const courtsForRound = playingCount / 4

  let best: { courts: Court[]; sitoutIds: string[] } | null = null
  let bestScore = -Infinity

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const attempt = buildAttempt(units, byId, courtsForRound, sitoutCount, stats)
    if (!attempt) continue
    if (attempt.score > bestScore) {
      bestScore = attempt.score
      best = { courts: attempt.courts, sitoutIds: attempt.sitoutIds }
    }
  }

  if (!best) {
    return {
      ok: false,
      reason:
        'No valid round: the partner constraints cannot be satisfied with the current players and court count.',
    }
  }
  return { ok: true, courts: best.courts, sitoutIds: best.sitoutIds }
}

interface Attempt {
  courts: Court[]
  sitoutIds: string[]
  score: number
}

function buildAttempt(
  units: Unit[],
  byId: Map<string, Player>,
  courtsForRound: number,
  sitoutCount: number,
  stats: Stats,
): Attempt | null {
  // Choose sit-out units. Players with the fewest prior sit-outs sit first,
  // which keeps sit-outs distributed as evenly as possible.
  const ordered = units
    .map((u) => {
      const avg = u.ids.reduce((s, id) => s + (stats.sitout[id] ?? 0), 0) / u.ids.length
      return { u, key: avg + Math.random() * 0.5 }
    })
    .sort((a, b) => a.key - b.key)

  const sitUnits: Unit[] = []
  const playUnits: Unit[] = []
  let remaining = sitoutCount
  for (const { u } of ordered) {
    if (remaining > 0 && u.ids.length <= remaining) {
      sitUnits.push(u)
      remaining -= u.ids.length
    } else {
      playUnits.push(u)
    }
  }
  if (remaining !== 0) return null

  // Keep the round solvable: a playing Pool player must retain a playing
  // pool partner. If sit-out fairness stranded one, sit them instead.
  repairPoolFeasibility(playUnits, sitUnits, byId)

  const sitoutIds = sitUnits.flatMap((u) => u.ids)

  const teams = formTeams(playUnits, byId, stats)
  if (!teams || teams.length !== courtsForRound * 2) return null

  const shuffledTeams = shuffle(teams)
  const courts: Court[] = []
  for (let i = 0; i < courtsForRound; i++) {
    courts.push({
      teams: [
        { players: shuffledTeams[i * 2], score: null },
        { players: shuffledTeams[i * 2 + 1], score: null },
      ],
    })
  }

  const score = scoreRound(courts, sitoutIds, stats)
  return { courts, sitoutIds, score }
}

/**
 * Sit-out selection optimises fairness without looking at partner rules, so it
 * can strand a Pool player by benching every one of their allowed partners.
 * This swaps the stranded player out for a benched single, keeping the round
 * solvable. No-op when there are no Pool players (the common case).
 */
function repairPoolFeasibility(
  playUnits: Unit[],
  sitUnits: Unit[],
  byId: Map<string, Player>,
): void {
  for (let guard = 0; guard <= playUnits.length; guard++) {
    const playing = new Set<string>()
    for (const u of playUnits) {
      for (const id of u.ids) playing.add(id)
    }

    let strandedIndex = -1
    for (let i = 0; i < playUnits.length; i++) {
      const unit = playUnits[i]
      if (unit.locked) continue
      const player = byId.get(unit.ids[0])
      if (!player || player.mode !== 'pool') continue
      const hasPartner = player.poolIds.some(
        (pid) => pid !== player.id && playing.has(pid),
      )
      if (!hasPartner) {
        strandedIndex = i
        break
      }
    }
    if (strandedIndex === -1) return

    const benchIndex = sitUnits.findIndex((u) => !u.locked)
    if (benchIndex === -1) return

    const stranded = playUnits[strandedIndex]
    playUnits[strandedIndex] = sitUnits[benchIndex]
    sitUnits[benchIndex] = stranded
  }
}

function formTeams(
  playUnits: Unit[],
  byId: Map<string, Player>,
  stats: Stats,
): Array<[string, string]> | null {
  const teams: Array<[string, string]> = []
  const singles: string[] = []
  for (const u of playUnits) {
    if (u.locked) teams.push([u.ids[0], u.ids[1]])
    else singles.push(u.ids[0])
  }
  const available = new Set(singles)

  // Pool-constrained players are the most restricted: place them first.
  const poolPlayers = shuffle(singles.filter((id) => byId.get(id)?.mode === 'pool'))
  for (const pid of poolPlayers) {
    if (!available.has(pid)) continue
    const player = byId.get(pid)!
    const candidates = player.poolIds.filter((c) => c !== pid && available.has(c))
    if (candidates.length === 0) return null
    const partner = weightedPick(candidates, (c) => partnerWeight(pid, c, stats))
    teams.push([pid, partner])
    available.delete(pid)
    available.delete(partner)
  }

  // Remaining open players: pair up, biased toward never-before partners.
  let rest = shuffle([...available])
  while (rest.length > 0) {
    const a = rest.pop()!
    if (rest.length === 0) return null
    const b = weightedPick(rest, (c) => partnerWeight(a, c, stats))
    teams.push([a, b])
    rest = rest.filter((x) => x !== b)
  }
  return teams
}

function partnerWeight(a: string, b: string, stats: Stats): number {
  const prev = stats.partner[pairKey(a, b)] ?? 0
  return prev === 0 ? 100 : 1 / (prev * prev)
}

function scoreRound(courts: Court[], sitoutIds: string[], stats: Stats): number {
  let partnerTerm = 0
  let opponentTerm = 0
  for (const court of courts) {
    for (const team of court.teams) {
      const prev = stats.partner[pairKey(team.players[0], team.players[1])] ?? 0
      partnerTerm += prev === 0 ? 2 : -3 * prev
    }
    const [t0, t1] = court.teams
    for (const a of t0.players) {
      for (const b of t1.players) {
        const prev = stats.opponent[pairKey(a, b)] ?? 0
        opponentTerm += prev === 0 ? 1 : -2 * prev
      }
    }
  }
  const sitset = new Set(sitoutIds)
  const counts = Object.entries(stats.sitout).map(([id, c]) => (sitset.has(id) ? c + 1 : c))
  const spread = counts.length > 0 ? Math.max(...counts) - Math.min(...counts) : 0
  return partnerTerm * 100000 + opponentTerm * 100 - spread
}
