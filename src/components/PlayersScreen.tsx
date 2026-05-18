import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import type { ConstraintMode, Player } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button, Panel, SectionLabel, Select, TextInput } from './ui'

export function PlayersScreen() {
  const players = useStore((s) => s.players)
  const courtCount = useStore((s) => s.courtCount)
  const addPlayer = useStore((s) => s.addPlayer)
  const setCourtCount = useStore((s) => s.setCourtCount)
  const resetSession = useStore((s) => s.resetSession)
  const roundCount = useStore((s) => s.rounds.length)
  const [name, setName] = useState('')

  const submit = () => {
    addPlayer(name)
    setName('')
  }

  // Rotation math is driven by who is actually in the rotation; Away players
  // stay on the roster but never count toward courts or sit-outs.
  const inRotation = players.filter((p) => !p.away)
  const total = inRotation.length
  const awayCount = players.length - total
  const playingCount = Math.min(courtCount * 4, Math.floor(total / 4) * 4)
  const sitoutCount = total - playingCount
  const courtsUsed = playingCount / 4
  const awayTail = awayCount > 0 ? ` · ${awayCount} away` : ''

  let courtSummary: string
  if (total < 4) {
    courtSummary = `Add at least 4 players in rotation to start a round${awayTail}`
  } else if (courtsUsed < courtCount) {
    const tail = sitoutCount === 0 ? 'everyone plays' : `${sitoutCount} rotate out`
    courtSummary = `${total} in rotation fill ${courtsUsed} of ${courtCount} courts · ${tail}${awayTail}`
  } else if (sitoutCount === 0) {
    courtSummary = `${total} in rotation · everyone plays every round${awayTail}`
  } else {
    courtSummary = `${total} in rotation · ${playingCount} play, ${sitoutCount} rotate out each round${awayTail}`
  }

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
          Roster &middot; {players.length}
          {awayCount > 0 && (
            <span className="text-ink-faint"> &middot; {awayCount} away</span>
          )}
        </SectionLabel>
        <div className="flex gap-2">
          <TextInput
            data-testid="player-name-input"
            className="flex-1"
            placeholder="Player name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
          <Button data-testid="add-player" onClick={submit} className="px-5">
            Add
          </Button>
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
            {players.map((p) => (
              <PlayerRow key={p.id} player={p} all={players} />
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

function PlayerRow({ player, all }: { player: Player; all: Player[] }) {
  const renamePlayer = useStore((s) => s.renamePlayer)
  const removePlayer = useStore((s) => s.removePlayer)
  const setMode = useStore((s) => s.setMode)
  const setLockedPartner = useStore((s) => s.setLockedPartner)
  const togglePoolMember = useStore((s) => s.togglePoolMember)
  const setPlayerAway = useStore((s) => s.setPlayerAway)

  const others = all.filter((o) => o.id !== player.id)
  const partnerName = player.partnerId
    ? (all.find((o) => o.id === player.partnerId)?.name ?? '')
    : ''
  const poolNames = player.poolIds
    .map((id) => all.find((o) => o.id === id)?.name)
    .filter((x): x is string => Boolean(x))
    .join(',')

  return (
    <li
      data-testid="player-row"
      data-name={player.name}
      data-mode={player.mode}
      data-partner={partnerName}
      data-pool={poolNames}
      data-away={player.away}
      className="space-y-2.5 px-3 py-3"
    >
      <div className="flex items-center gap-2">
        <input
          data-testid="player-name"
          aria-label="Player name"
          value={player.name}
          onChange={(e) => renamePlayer(player.id, e.target.value)}
          className={cn(
            'min-w-0 flex-1 border-b border-transparent bg-transparent pb-0.5 text-base font-bold focus:border-ink focus:outline-none',
            player.away ? 'text-ink-faint' : 'text-ink',
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
        <button
          data-testid="player-remove"
          aria-label={`Remove ${player.name}`}
          onClick={() => removePlayer(player.id)}
          className="flex h-12 w-10 shrink-0 items-center justify-center rounded-md border border-rule text-ink-faint transition-colors duration-150 hover:border-signal hover:text-signal"
        >
          &#10005;
        </button>
      </div>

      <button
        data-testid="player-away-toggle"
        aria-pressed={player.away}
        aria-label={
          player.away
            ? `${player.name} is away — tap to bring back in`
            : `${player.name} is in rotation — tap to set away`
        }
        onClick={() => setPlayerAway(player.id, !player.away)}
        className={cn(
          'spring-press flex min-h-11 w-full items-center justify-between gap-2 rounded-md border px-3',
          'text-[11px] font-extrabold uppercase tracking-[0.12em]',
          player.away
            ? 'border-rule bg-sunk text-ink-soft'
            : 'border-ink bg-ink text-paper',
        )}
      >
        <span>{player.away ? 'Away — resting' : 'In rotation'}</span>
        <span
          aria-hidden="true"
          className={cn(
            'rounded px-2 py-0.5 text-[10px] tracking-[0.1em]',
            player.away
              ? 'bg-ink text-paper'
              : 'border border-paper/40 text-paper',
          )}
        >
          {player.away ? 'Bring in' : 'Set away'}
        </span>
      </button>

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
        'min-h-11 rounded border px-2.5 text-xs font-bold uppercase tracking-[0.04em] transition-colors duration-150',
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
