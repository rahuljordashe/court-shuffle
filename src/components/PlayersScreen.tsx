import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import type { ConstraintMode, Player } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button, Panel, SectionLabel, Select, TextInput } from './ui'

export function PlayersScreen() {
  const players = useStore((s) => s.players)
  const rounds = useStore((s) => s.rounds)
  const courtCount = useStore((s) => s.courtCount)
  const addPlayer = useStore((s) => s.addPlayer)
  const addPlayerError = useStore((s) => s.addPlayerError)
  const clearAddPlayerError = useStore((s) => s.clearAddPlayerError)
  const setCourtCount = useStore((s) => s.setCourtCount)
  const resetSession = useStore((s) => s.resetSession)
  const roundCount = rounds.length
  const [name, setName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    addPlayer(name)
    // Keep the typed text if the name was rejected; clear it on success.
    if (!useStore.getState().addPlayerError) setName('')
    // Return focus to the field so the next name needs no extra tap.
    nameInputRef.current?.focus()
  }

  // Rotation math runs on `playing` players. Resting players stay in the
  // session but sit the next round out; checked-out players are gone for good.
  const playing = players.filter((p) => p.status === 'playing')
  const restingCount = players.filter((p) => p.status === 'resting').length
  const leftCount = players.filter((p) => p.status === 'left').length
  const rosterCount = players.length - leftCount
  const total = playing.length
  const playingCount = Math.min(courtCount * 4, Math.floor(total / 4) * 4)
  const sitoutCount = total - playingCount
  const courtsUsed = playingCount / 4
  const restTail = restingCount > 0 ? ` · ${restingCount} resting` : ''

  let courtSummary: string
  if (total < 4) {
    courtSummary = `Add at least 4 players in rotation to start a round${restTail}`
  } else if (courtsUsed < courtCount) {
    const tail = sitoutCount === 0 ? 'everyone plays' : `${sitoutCount} rotate out`
    courtSummary = `${total} in rotation fill ${courtsUsed} of ${courtCount} courts · ${tail}${restTail}`
  } else if (sitoutCount === 0) {
    courtSummary = `${total} in rotation · everyone plays every round${restTail}`
  } else {
    courtSummary = `${total} in rotation · ${playingCount} play, ${sitoutCount} rotate out each round${restTail}`
  }

  // A player who has appeared in any round can only be checked out, never
  // deleted — that keeps their leaderboard record and history intact.
  const playedIds = new Set<string>()
  for (const r of rounds) {
    for (const c of r.courts) {
      for (const t of c.teams) {
        playedIds.add(t.players[0])
        playedIds.add(t.players[1])
      }
    }
    for (const id of r.sitoutIds) playedIds.add(id)
    for (const id of r.restingIds) playedIds.add(id)
  }

  // Checked-out players sink to the foot of the roster: kept for the record,
  // out of the way of the players still in the session.
  const ordered = [
    ...players.filter((p) => p.status !== 'left'),
    ...players.filter((p) => p.status === 'left'),
  ]

  return (
    <div className="space-y-9 pt-6">
      <section className="space-y-3">
        <SectionLabel>Courts</SectionLabel>
        <div className="flex items-stretch gap-2">
          <button
            data-testid="court-count-dec"
            aria-label="Remove a court"
            onClick={() => setCourtCount(courtCount - 1)}
            disabled={courtCount <= 1}
            className={cn(
              'spring-press flex h-16 w-16 shrink-0 items-center justify-center rounded-md border text-3xl font-extrabold',
              courtCount <= 1
                ? 'border-rule bg-raised text-ink-faint/40'
                : 'border-rule bg-raised text-ink active:bg-ink active:text-paper',
            )}
          >
            &minus;
          </button>
          <div
            data-testid="court-count-value"
            data-count={courtCount}
            className="flex h-16 flex-1 items-center justify-center rounded-md border border-ink bg-ink text-4xl font-extrabold tabular-nums text-paper"
          >
            <RollingNumber value={courtCount} />
          </div>
          <button
            data-testid="court-count-inc"
            aria-label="Add a court"
            onClick={() => setCourtCount(courtCount + 1)}
            className="spring-press flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-rule bg-raised text-3xl font-extrabold text-ink active:bg-ink active:text-paper"
          >
            +
          </button>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
          {courtSummary}
        </p>
      </section>

      <section className="space-y-3">
        <SectionLabel>
          Roster &middot; {rosterCount}
          {restingCount > 0 && (
            <span className="text-ink-faint"> &middot; {restingCount} resting</span>
          )}
          {leftCount > 0 && (
            <span className="text-ink-faint"> &middot; {leftCount} checked out</span>
          )}
        </SectionLabel>
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <TextInput
              ref={nameInputRef}
              data-testid="player-name-input"
              className="flex-1"
              aria-label="New player name"
              aria-invalid={addPlayerError ? true : undefined}
              aria-describedby={addPlayerError ? 'add-player-error' : undefined}
              placeholder="Player name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (addPlayerError) clearAddPlayerError()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />
            <Button data-testid="add-player" onClick={submit} className="px-5">
              Add
            </Button>
          </div>
          <div role="alert">
            {addPlayerError && (
              <p
                id="add-player-error"
                data-testid="add-player-error"
                className="text-[11px] font-bold uppercase tracking-[0.1em] text-signal-deep"
              >
                {addPlayerError}
              </p>
            )}
          </div>
        </div>

        {players.length === 0 ? (
          <Panel className="px-4 py-8 text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-faint">
              No players yet
            </p>
            <p className="mt-1.5 text-xs text-ink-soft">
              Add at least 4 players to generate a round.
            </p>
          </Panel>
        ) : (
          <ul className="divide-y divide-rule overflow-hidden rounded-md border border-rule bg-raised">
            {ordered.map((p) => (
              <PlayerRow
                key={p.id}
                player={p}
                all={players}
                canRemove={!playedIds.has(p.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-1.5 pb-2">
        <Button
          data-testid="reset-session"
          variant="outline"
          onClick={resetSession}
          disabled={roundCount === 0}
          className="w-full"
        >
          Clear session
        </Button>
        <p className="text-center text-xs text-ink-soft">
          Clears all rounds and standings. Roster stays.
        </p>
      </section>
    </div>
  )
}

function PlayerRow({
  player,
  all,
  canRemove,
}: {
  player: Player
  all: Player[]
  canRemove: boolean
}) {
  const renamePlayer = useStore((s) => s.renamePlayer)
  const removePlayer = useStore((s) => s.removePlayer)
  const setMode = useStore((s) => s.setMode)
  const setLockedPartner = useStore((s) => s.setLockedPartner)
  const togglePoolMember = useStore((s) => s.togglePoolMember)
  const setPlayerResting = useStore((s) => s.setPlayerResting)
  const checkOutPlayer = useStore((s) => s.checkOutPlayer)
  const reinstatePlayer = useStore((s) => s.reinstatePlayer)
  // The name to fall back to if an inline rename is committed blank.
  const committedName = useRef(player.name)

  // A locked partner or pool member must still be in the session.
  const others = all.filter((o) => o.id !== player.id && o.status !== 'left')
  const partnerName = player.partnerId
    ? (all.find((o) => o.id === player.partnerId)?.name ?? '')
    : ''
  const poolNames = player.poolIds
    .map((id) => all.find((o) => o.id === id)?.name)
    .filter((x): x is string => Boolean(x))
    .join(',')

  // A checked-out player is shown as a quiet record row: name kept for the
  // standings, with a single control to bring them back into the session.
  if (player.status === 'left') {
    return (
      <li
        data-testid="player-row"
        data-name={player.name}
        data-mode={player.mode}
        data-partner={partnerName}
        data-pool={poolNames}
        data-status="left"
        className="flex items-center gap-2 px-3 py-3"
      >
        <span className="min-w-0 flex-1 truncate text-base font-bold text-ink-faint line-through">
          {player.name}
        </span>
        <span className="shrink-0 rounded border border-rule px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-faint">
          Checked out
        </span>
        <button
          data-testid="player-reinstate"
          aria-label={`Bring ${player.name} back into the session`}
          onClick={() => reinstatePlayer(player.id)}
          className="spring-press flex min-h-11 shrink-0 items-center rounded-md border border-rule px-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-soft transition-colors duration-150 hover:border-ink"
        >
          Bring back
        </button>
      </li>
    )
  }

  const resting = player.status === 'resting'

  return (
    <li
      data-testid="player-row"
      data-name={player.name}
      data-mode={player.mode}
      data-partner={partnerName}
      data-pool={poolNames}
      data-status={player.status}
      className="space-y-2.5 px-3 py-3"
    >
      <div className="flex items-center gap-2">
        <input
          data-testid="player-name"
          aria-label="Player name"
          value={player.name}
          onFocus={() => {
            committedName.current = player.name
          }}
          onChange={(e) => renamePlayer(player.id, e.target.value)}
          onBlur={(e) => {
            // Normalise on commit; a blank rename reverts to the last good
            // name so a player can never be left nameless.
            const next = e.target.value.trim().replace(/\s+/g, ' ')
            renamePlayer(player.id, next || committedName.current)
          }}
          className={cn(
            'min-h-11 min-w-0 flex-1 border-b-2 border-transparent bg-transparent pb-0.5 text-base font-bold focus:border-ink focus:outline-none',
            resting ? 'text-ink-faint' : 'text-ink',
          )}
        />
        <Select
          data-testid="player-mode"
          aria-label="Partner constraint"
          value={player.mode}
          onChange={(e) => setMode(player.id, e.target.value as ConstraintMode)}
          className="uppercase tracking-[0.05em]"
        >
          <option value="open">Open</option>
          <option value="locked">Locked</option>
          <option value="pool">Pool</option>
        </Select>
        {canRemove && (
          <button
            data-testid="player-remove"
            aria-label={`Remove ${player.name}`}
            onClick={() => removePlayer(player.id)}
            className="flex h-12 w-11 shrink-0 items-center justify-center rounded-md border border-rule text-ink-faint transition-colors duration-150 hover:border-signal hover:text-signal"
          >
            &#10005;
          </button>
        )}
      </div>

      {player.mode === 'locked' && (
        <div className="border-t border-rule pt-2.5">
          <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
            Fixed partner
          </p>
          <Select
            data-testid="player-partner"
            aria-label="Locked partner"
            value={player.partnerId ?? ''}
            onChange={(e) => {
              if (e.target.value) setLockedPartner(player.id, e.target.value)
            }}
            className="w-full"
          >
            <option value="">Select a partner&hellip;</option>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          {!player.partnerId && (
            <p
              data-testid="player-warning"
              className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-signal-deep"
            >
              Locked players need a partner
            </p>
          )}
        </div>
      )}

      {player.mode === 'pool' && (
        <div className="border-t border-rule pt-2.5">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
            Pool partners
          </p>
          <div className="flex flex-wrap gap-1.5">
            {others.map((o) => (
              <PoolChip
                key={o.id}
                name={o.name}
                selected={player.poolIds.includes(o.id)}
                onClick={() => togglePoolMember(player.id, o.id)}
              />
            ))}
          </div>
          {player.poolIds.length < 2 && (
            <p
              data-testid="player-warning"
              className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-signal-deep"
            >
              Pick at least 2 pool partners
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          data-testid="player-rest-toggle"
          aria-pressed={resting}
          aria-label={
            resting
              ? `${player.name} is resting — tap to bring back into rotation`
              : `${player.name} is in rotation — tap to rest the next round`
          }
          onClick={() => setPlayerResting(player.id, !resting)}
          className={cn(
            'spring-press flex min-h-11 flex-1 items-center justify-between gap-2 rounded-md border px-3',
            'text-[11px] font-extrabold uppercase tracking-[0.12em]',
            resting
              ? 'border-rule bg-sunk text-ink-soft'
              : 'border-ink bg-ink text-paper',
          )}
        >
          <span>{resting ? 'Resting' : 'In rotation'}</span>
          <span
            aria-hidden="true"
            className={cn(
              'rounded px-2 py-0.5 text-[10px] tracking-[0.1em]',
              resting ? 'bg-ink text-paper' : 'border border-paper/40 text-paper',
            )}
          >
            {resting ? 'Bring in' : 'Rest'}
          </span>
        </button>
        <button
          data-testid="player-checkout"
          aria-label={`Check ${player.name} out for the rest of the session`}
          onClick={() => checkOutPlayer(player.id)}
          className="spring-press flex min-h-11 shrink-0 items-center rounded-md border border-rule px-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-soft transition-colors duration-150 hover:border-signal hover:text-signal"
        >
          Check out
        </button>
      </div>
    </li>
  )
}

/**
 * A pool-partner toggle chip. On toggle it ticks with a soft spring — but not
 * on first render, so opening the pool list never animates unprompted.
 */
function PoolChip({
  name,
  selected,
  onClick,
}: {
  name: string
  selected: boolean
  onClick: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const el = ref.current
    if (!el) return
    // Restart the tick: drop the class, force a reflow, re-add it.
    el.classList.remove('chip-tick')
    void el.offsetWidth
    el.classList.add('chip-tick')
  }, [selected])

  return (
    <button
      ref={ref}
      data-testid="pool-option"
      data-name={name}
      data-selected={selected}
      onClick={onClick}
      className={cn(
        // Fixed 44px height; long names truncate rather than balloon the chip.
        'h-11 max-w-[7.5rem] truncate rounded border px-2.5 text-xs font-bold uppercase tracking-[0.04em] transition-colors duration-150',
        selected ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper text-ink-soft',
      )}
    >
      {name}
    </button>
  )
}

/**
 * A digit that rolls when it changes: the old value slides out as the new one
 * rolls in behind it. Rolls up on an increment, down on a decrement.
 */
function RollingNumber({ value }: { value: number }) {
  const [current, setCurrent] = useState(value)
  const [previous, setPrevious] = useState<number | null>(null)
  const [dir, setDir] = useState<'up' | 'down'>('up')

  useEffect(() => {
    if (value === current) return
    setDir(value > current ? 'up' : 'down')
    setPrevious(current)
    setCurrent(value)
    const t = setTimeout(() => setPrevious(null), 280)
    return () => clearTimeout(t)
  }, [value, current])

  const rolling = previous !== null
  return (
    <span className="relative inline-flex h-[1em] items-center overflow-hidden leading-none">
      {/* Invisible holder keeps the box sized to the widest value on screen. */}
      <span className="invisible" aria-hidden="true">
        {Math.max(value, previous ?? value)}
      </span>
      <span
        key={current}
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          rolling && (dir === 'up' ? 'roll-up-in' : 'roll-down-in'),
        )}
      >
        {current}
      </span>
      {rolling && (
        <span
          key={`prev-${previous}`}
          aria-hidden="true"
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            dir === 'up' ? 'roll-up-out' : 'roll-down-out',
          )}
        >
          {previous}
        </span>
      )}
    </span>
  )
}
