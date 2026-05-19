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
 *   1. Avoid back-to-back sit-outs (benching a player two rounds running).
 *   2. Maximise never-before-paired partner combinations.
 *   3. Maximise never-before-faced opponent matchups.
 *   4. Keep the spread of sit-out *deficits* tight.
 *
 * Sit-out fairness is measured per player over only the rounds they were
 * present for, as a deficit: the sit-outs they were due (their fair share)
 * minus the sit-outs they actually took. A player absent from history sits at
 * deficit zero, so a mid-session joiner is treated exactly like everyone else
 * from the moment they arrive — never benched to "catch up" on rounds they
 * missed. A rested round counts as a sit-out, so a voluntary break is one
 * bench turn, not an extra one. Units are benched in order of deficit (most
 * owed a bench first), and players who sat the previous round are pushed to
 * the back of their tier.
 */

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

interface Stats {
  partner: Record<string, number>
  opponent: Record<string, number>
  /**
   * Sit-out deficit per player: the sit-outs they were due (fair share across
   * the rounds they were present) minus the sit-outs they took. Positive means
   * under-benched and due a sit-out; negative means over-benched.
   */
  sitoutDeficit: Record<string, number>
  /** Players off-court the most recent round — benched or resting. */
  lastSitout: Set<string>
}

function buildStats(players: Player[], rounds: Round[]): Stats {
  const partner: Record<string, number> = {}
  const opponent: Record<string, number> = {}
  const expected: Record<string, number> = {}
  const actual: Record<string, number> = {}

  for (const round of rounds) {
    // Off-court this round: benched by the generator, or resting by choice.
    // Both count equally toward sit-out fairness.
    const offcourt = new Set<string>([
      ...round.sitoutIds,
      ...(round.restingIds ?? []),
    ])
    const present = new Set<string>(offcourt)
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
      for (const team of court.teams) {
        present.add(team.players[0])
        present.add(team.players[1])
      }
    }
    // A round's fair share of sitting is the off-court count over everyone
    // present; each present player is "due" that fraction of a sit-out.
    const fairShare = present.size > 0 ? offcourt.size / present.size : 0
    for (const id of present) expected[id] = (expected[id] ?? 0) + fairShare
    for (const id of offcourt) actual[id] = (actual[id] ?? 0) + 1
  }

  const sitoutDeficit: Record<string, number> = {}
  for (const p of players) {
    sitoutDeficit[p.id] = (expected[p.id] ?? 0) - (actual[p.id] ?? 0)
  }

  const lastRound = rounds[rounds.length - 1]
  const lastSitout = new Set<string>(
    lastRound ? [...lastRound.sitoutIds, ...(lastRound.restingIds ?? [])] : [],
  )
  return { partner, opponent, sitoutDeficit, lastSitout }
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
  // Choose sit-out units. The key is layered so sit-out fairness is enforced,
  // not merely scored: a unit's sit-out deficit dominates (most owed a bench
  // sits first, so each player gets their fair share of sitting), then players
  // who sat the previous round are pushed to the back of their tier (no
  // back-to-back unless forced), then a random term breaks remaining ties so
  // partnerships still vary.
  const ordered = units
    .map((u) => {
      const deficit =
        u.ids.reduce((s, id) => s + (stats.sitoutDeficit[id] ?? 0), 0) /
        u.ids.length
      const repeat = u.ids.some((id) => stats.lastSitout.has(id)) ? 1 : 0
      return { u, key: -deficit * 1_000_000 + repeat * 10 + Math.random() }
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
  const present: string[] = []
  for (const court of courts) {
    for (const team of court.teams) {
      present.push(team.players[0], team.players[1])
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
  present.push(...sitoutIds)

  // Sit-out balance: keep the spread of post-round sit-out deficits tight.
  const sitset = new Set(sitoutIds)
  const fairShare = present.length > 0 ? sitoutIds.length / present.length : 0
  let maxD = -Infinity
  let minD = Infinity
  for (const id of present) {
    const d = (stats.sitoutDeficit[id] ?? 0) + fairShare - (sitset.has(id) ? 1 : 0)
    if (d > maxD) maxD = d
    if (d < minD) minD = d
  }
  const spread = present.length > 0 ? maxD - minD : 0

  // Back-to-back sit-outs outrank every other objective: a round that benches
  // anyone two rounds running loses to any round that does not.
  let backToBack = 0
  for (const id of sitoutIds) {
    if (stats.lastSitout.has(id)) backToBack += 1
  }
  return backToBack * -1e9 + partnerTerm * 100000 + opponentTerm * 100 - spread
}
