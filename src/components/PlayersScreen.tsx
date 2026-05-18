import { useState } from 'react'
import { useStore } from '@/lib/store'
import type { ConstraintMode, Player } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button, Panel, SectionLabel, Select, TextInput } from './ui'

export function PlayersScreen() {
  const players = useStore((s) => s.players)
  const courtCount = useStore((s) => s.courtCount)
  const addPlayer = useStore((s) => s.addPlayer)
  const setCourtCount = useStore((s) => s.setCourtCount)
  const [name, setName] = useState('')

  const submit = () => {
    addPlayer(name)
    setName('')
  }

  return (
    <div className="space-y-9 pt-6">
      <section className="space-y-3">
        <SectionLabel>Courts</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((n) => {
            const on = courtCount === n
            return (
              <button
                key={n}
                data-testid={`court-count-${n}`}
                onClick={() => setCourtCount(n)}
                className={cn(
                  'flex h-14 items-center justify-center rounded-md border text-2xl font-extrabold tabular-nums transition-colors duration-150',
                  on
                    ? 'border-ink bg-ink text-paper'
                    : 'border-rule bg-raised text-ink-faint',
                )}
              >
                {n}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
          {courtCount} {courtCount === 1 ? 'court' : 'courts'} &middot; up to{' '}
          {courtCount * 4} players per round
        </p>
      </section>

      <section className="space-y-3">
        <SectionLabel>Roster &middot; {players.length}</SectionLabel>
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
    </div>
  )
}

function PlayerRow({ player, all }: { player: Player; all: Player[] }) {
  const renamePlayer = useStore((s) => s.renamePlayer)
  const removePlayer = useStore((s) => s.removePlayer)
  const setMode = useStore((s) => s.setMode)
  const setLockedPartner = useStore((s) => s.setLockedPartner)
  const togglePoolMember = useStore((s) => s.togglePoolMember)

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
      className="space-y-2.5 px-3 py-3"
    >
      <div className="flex items-center gap-2">
        <input
          data-testid="player-name"
          aria-label="Player name"
          value={player.name}
          onChange={(e) => renamePlayer(player.id, e.target.value)}
          className="min-w-0 flex-1 border-b border-transparent bg-transparent pb-0.5 text-base font-bold text-ink focus:border-ink focus:outline-none"
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
            {others.map((o) => {
              const selected = player.poolIds.includes(o.id)
              return (
                <button
                  key={o.id}
                  data-testid="pool-option"
                  data-name={o.name}
                  data-selected={selected}
                  onClick={() => togglePoolMember(player.id, o.id)}
                  className={cn(
                    'min-h-11 rounded border px-2.5 text-xs font-bold uppercase tracking-[0.04em] transition-colors duration-150',
                    selected
                      ? 'border-ink bg-ink text-paper'
                      : 'border-rule bg-paper text-ink-soft',
                  )}
                >
                  {o.name}
                </button>
              )
            })}
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
