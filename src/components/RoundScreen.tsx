import { useStore } from '@/lib/store'
import type { Round } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button, Panel, SectionLabel } from './ui'

export function RoundScreen() {
  const players = useStore((s) => s.players)
  const rounds = useStore((s) => s.rounds)
  const generationError = useStore((s) => s.generationError)
  const generateNextRound = useStore((s) => s.generateNextRound)

  const current = rounds[rounds.length - 1]
  const hasOpenRound = Boolean(current) && !current.locked
  const enoughPlayers = players.length >= 4
  const canGenerate = enoughPlayers && !hasOpenRound

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id

  return (
    <div className="space-y-9 pt-6">
      <section className="space-y-3">
        <SectionLabel>Match generator</SectionLabel>
        <Button
          data-testid="generate-round"
          variant={canGenerate ? 'signal' : 'outline'}
          disabled={!canGenerate}
          onClick={generateNextRound}
          className="min-h-14 w-full text-base"
        >
          <span>{rounds.length === 0 ? 'Generate first round' : 'Generate next round'}</span>
          <span aria-hidden="true">&rarr;</span>
        </Button>
        {!enoughPlayers && (
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
            Add at least 4 players to generate a round
          </p>
        )}
        {hasOpenRound && enoughPlayers && (
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
            End the current round to generate the next
          </p>
        )}
        {generationError && (
          <div
            data-testid="generation-error"
            className="rounded-md border border-signal-deep bg-signal-wash p-3"
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-signal-deep">
              Cannot generate
            </p>
            <p className="mt-1 text-sm text-ink">{generationError}</p>
          </div>
        )}
      </section>

      {!current ? (
        <Panel className="px-4 py-10 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-faint">
            No rounds yet
          </p>
          <p className="mt-1.5 text-xs text-ink-soft">
            Generate the first round to see court assignments.
          </p>
        </Panel>
      ) : (
        <RoundView round={current} nameOf={nameOf} />
      )}
    </div>
  )
}

function RoundView({ round, nameOf }: { round: Round; nameOf: (id: string) => string }) {
  const setScore = useStore((s) => s.setScore)
  const endRound = useStore((s) => s.endRound)
  const sitoutNames = round.sitoutIds.map(nameOf)

  return (
    <section className="space-y-3">
      <SectionLabel>Current round</SectionLabel>

      <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">
          Round{' '}
          <span data-testid="round-number" className="tabular-nums">
            {round.index}
          </span>
        </h2>
        <span
          className={cn(
            'flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.13em]',
            round.locked ? 'text-ink-faint' : 'text-signal',
          )}
        >
          {!round.locked && <span className="h-2 w-2 rounded-full bg-signal" />}
          {round.locked ? 'Completed' : 'In progress'}
        </span>
      </div>

      <div className="space-y-3">
        {round.courts.map((court, ci) => (
          <div
            key={ci}
            data-testid="court"
            data-court={ci}
            className="overflow-hidden rounded-md border border-rule bg-raised"
          >
            <div className="border-b border-rule px-3 py-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-soft">
                Court {ci + 1}
              </span>
            </div>
            {court.teams.map((team, ti) => {
              const names = team.players.map(nameOf)
              const other = court.teams[ti === 0 ? 1 : 0]
              const isWinner =
                team.score !== null && other.score !== null && team.score > other.score
              return (
                <div
                  key={ti}
                  data-testid="team"
                  data-team={ti}
                  data-players={names.join(',')}
                  data-winner={isWinner}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-3',
                    ti === 1 && 'border-t border-rule',
                    isWinner && 'bg-signal-wash',
                  )}
                >
                  <span className="w-9 shrink-0 text-[9px] font-extrabold uppercase leading-[1.1] tracking-[0.06em] text-signal-deep">
                    {isWinner && <span data-testid="winner-badge">Won</span>}
                  </span>
                  <span className="min-w-0 shrink truncate text-[15px] font-bold text-ink">
                    {names.join('  &  ')}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-0 min-w-[10px] flex-1 self-center border-b border-dotted border-ink-faint"
                  />
                  <input
                    data-testid="score-input"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    aria-label={`Score for ${names.join(' and ')}`}
                    disabled={round.locked}
                    value={team.score ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setScore(
                        round.index,
                        ci,
                        ti,
                        v === '' ? null : Math.max(0, Math.floor(Number(v))),
                      )
                    }}
                    className={cn(
                      'h-11 w-14 shrink-0 rounded border text-center text-lg font-extrabold tabular-nums focus:outline-none',
                      isWinner
                        ? 'border-signal bg-signal text-on-signal'
                        : 'border-rule bg-paper text-ink focus:border-ink',
                    )}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div
        data-testid="sitouts"
        data-players={sitoutNames.join(',')}
        className="flex items-baseline gap-2 border-t border-rule pt-3"
      >
        <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
          {sitoutNames.length > 0 ? 'Sitting out' : 'Full house'}
        </span>
        <span className="text-sm font-bold text-ink">
          {sitoutNames.length > 0 ? sitoutNames.join(', ') : 'Everyone is playing'}
        </span>
      </div>

      {!round.locked && (
        <Button
          data-testid="end-round"
          variant="signal"
          onClick={endRound}
          className="min-h-14 w-full text-base"
        >
          <span>End round</span>
          <span aria-hidden="true">&rarr;</span>
        </Button>
      )}
    </section>
  )
}
