import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import type { Round } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button, Panel, SectionLabel } from './ui'

export function RoundScreen() {
  const players = useStore((s) => s.players)
  const rounds = useStore((s) => s.rounds)

  const current = rounds[rounds.length - 1]
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id

  return (
    <div className="space-y-9 pt-6">
      {current ? (
        <RoundView round={current} nameOf={nameOf} />
      ) : (
        <>
          <section className="space-y-3">
            <SectionLabel>Match generator</SectionLabel>
            <GenerateAction first />
          </section>
          <Panel className="px-4 py-10 text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-faint">
              No rounds yet
            </p>
            <p className="mt-1.5 text-xs text-ink-soft">
              Generate the first round to see court assignments.
            </p>
          </Panel>
        </>
      )}

      <PastRounds />
    </div>
  )
}

/**
 * The single forward action. Lives in the empty state (first round) and at the
 * foot of a completed round (next round), so the next step is always one button
 * in the same place.
 */
function GenerateAction({ first }: { first: boolean }) {
  const players = useStore((s) => s.players)
  const rounds = useStore((s) => s.rounds)
  const generationError = useStore((s) => s.generationError)
  const generateNextRound = useStore((s) => s.generateNextRound)

  const current = rounds[rounds.length - 1]
  const hasOpenRound = current != null && !current.locked
  // Checked-out players are gone for good and never count toward a round.
  const enoughPlayers = players.filter((p) => p.status !== 'left').length >= 4
  const canGenerate = enoughPlayers && !hasOpenRound

  return (
    <div className="space-y-3">
      <Button
        data-testid="generate-round"
        variant={canGenerate ? 'signal' : 'outline'}
        disabled={!canGenerate}
        onClick={generateNextRound}
        className="min-h-14 w-full text-base"
      >
        <span>{first ? 'Generate first round' : 'Generate next round'}</span>
        <span aria-hidden="true">&rarr;</span>
      </Button>
      {!enoughPlayers && (
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
          Add at least 4 players to generate a round
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
    </div>
  )
}

/** Normalises a raw score-input value the same way for current and history. */
function parseScore(v: string): number | null {
  return v === '' ? null : Math.max(0, Math.floor(Number(v)))
}

function RoundView({ round, nameOf }: { round: Round; nameOf: (id: string) => string }) {
  const setScore = useStore((s) => s.setScore)
  const endRound = useStore((s) => s.endRound)
  const rerollRound = useStore((s) => s.rerollRound)
  const swapPlayers = useStore((s) => s.swapPlayers)
  const roundJustGenerated = useStore((s) => s.roundJustGenerated)
  const consumeRoundReveal = useStore((s) => s.consumeRoundReveal)
  const sitoutNames = round.sitoutIds.map(nameOf)
  const restingNames = round.restingIds.map(nameOf)

  // Swap mode is a local, additive interaction layer over the round. It only
  // exists while the round is open; a locked round can never enter it.
  const [swapMode, setSwapMode] = useState(false)
  const [swapFirst, setSwapFirst] = useState<string | null>(null)

  // A locked round cannot be edited — drop any swap state if the round locks.
  useEffect(() => {
    if (round.locked && (swapMode || swapFirst)) {
      setSwapMode(false)
      setSwapFirst(null)
    }
  }, [round.locked, swapMode, swapFirst])

  // Clear the reveal flag once the staggered animation has run, so switching
  // back to this tab later does not replay it. Covers the longest deal: a
  // capped index of 8 at a 120ms stagger plus the 460ms card animation.
  useEffect(() => {
    if (!roundJustGenerated) return
    const t = setTimeout(consumeRoundReveal, 1500)
    return () => clearTimeout(t)
  }, [roundJustGenerated, consumeRoundReveal])

  // The round assembles on a 120ms stagger: the title first, then each court,
  // then the sit-outs row — so the whole round deals in, not just the cards.
  const dealDelay = (i: number) =>
    roundJustGenerated ? { animationDelay: `${Math.min(i, 8) * 120}ms` } : undefined

  const onPlayerTap = (id: string) => {
    if (!swapMode) return
    if (swapFirst === null) {
      setSwapFirst(id)
      return
    }
    if (swapFirst === id) {
      setSwapFirst(null)
      return
    }
    swapPlayers(swapFirst, id)
    setSwapFirst(null)
  }

  /** A player name rendered as a tap target while swap mode is on. */
  const playerName = (id: string) => {
    const name = nameOf(id)
    if (!swapMode) return <>{name}</>
    const selected = swapFirst === id
    return (
      <button
        type="button"
        data-testid="swap-player"
        data-player-id={id}
        data-selected={selected}
        onClick={() => onPlayerTap(id)}
        className={cn(
          'inline-flex min-h-11 items-center rounded border px-2 py-1 text-[15px] font-bold leading-none transition-colors duration-150',
          selected
            ? 'border-signal bg-signal text-on-signal'
            : 'border-rule bg-paper text-ink active:bg-sunk',
        )}
      >
        {name}
      </button>
    )
  }

  return (
    <section className="space-y-3">
      <SectionLabel>Current round</SectionLabel>

      <div
        style={dealDelay(0)}
        className={cn(
          'flex items-baseline justify-between border-b-2 border-ink pb-2',
          roundJustGenerated && 'deal-in',
        )}
      >
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
          {!round.locked && <span className="live-dot h-2 w-2 rounded-full bg-signal" />}
          {round.locked ? 'Completed' : 'In progress'}
        </span>
      </div>

      {!round.locked && (
        <div className="flex items-center justify-between gap-3">
          <Button
            data-testid="swap-toggle"
            variant={swapMode ? 'ink' : 'outline'}
            data-active={swapMode}
            onClick={() => {
              setSwapFirst(null)
              setSwapMode((on) => !on)
            }}
            className="h-10 px-3 text-[11px]"
          >
            {swapMode ? 'Done swapping' : 'Swap'}
          </Button>
          {swapMode && (
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Tap two players to swap
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {round.courts.map((court, ci) => (
          <div
            key={`${round.index}-${ci}`}
            data-testid="court"
            data-court={ci}
            style={dealDelay(ci + 1)}
            className={cn(
              'overflow-hidden rounded-md border border-rule bg-raised',
              roundJustGenerated && 'deal-in',
            )}
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
                    'relative flex items-center gap-2.5 overflow-hidden px-3 py-3',
                    ti === 1 && 'border-t border-rule',
                  )}
                >
                  <span aria-hidden="true" className="win-wash" />
                  <span className="relative w-9 shrink-0 text-[9px] font-extrabold uppercase leading-[1.1] tracking-[0.06em] text-signal-deep">
                    {isWinner && <span data-testid="winner-badge">Won</span>}
                  </span>
                  <span
                    className={cn(
                      'relative flex min-w-0 shrink items-center text-[15px] font-bold text-ink',
                      swapMode ? 'flex-wrap gap-1.5' : 'truncate',
                    )}
                  >
                    {swapMode ? (
                      <>
                        {playerName(team.players[0])}
                        {playerName(team.players[1])}
                      </>
                    ) : (
                      names.join('  &  ')
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className="relative h-0 min-w-[10px] flex-1 self-center border-b border-dotted border-ink-faint"
                  />
                  <input
                    data-testid="score-input"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    aria-label={`Score for ${names.join(' and ')}`}
                    disabled={round.locked}
                    value={team.score ?? ''}
                    onChange={(e) => setScore(round.index, ci, ti, parseScore(e.target.value))}
                    className={cn(
                      'relative h-11 w-14 shrink-0 rounded border text-center text-lg font-extrabold tabular-nums transition-colors duration-150 focus:outline-none',
                      isWinner
                        ? 'border-signal bg-signal text-on-signal delay-150'
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
        style={dealDelay(round.courts.length + 1)}
        className={cn(
          'flex items-baseline gap-2 border-t border-rule pt-3',
          roundJustGenerated && 'deal-in',
        )}
      >
        <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
          {sitoutNames.length > 0 ? 'Sitting out' : 'Full house'}
        </span>
        {swapMode && round.sitoutIds.length > 0 ? (
          <span className="flex flex-wrap gap-1.5">
            {round.sitoutIds.map((id) => (
              <span key={id}>{playerName(id)}</span>
            ))}
          </span>
        ) : (
          <span className="text-sm font-bold text-ink">
            {sitoutNames.length > 0 ? sitoutNames.join(', ') : 'Everyone is playing'}
          </span>
        )}
      </div>

      {round.restingIds.length > 0 && (
        <div
          data-testid="resting"
          data-players={restingNames.join(',')}
          style={dealDelay(round.courts.length + 2)}
          className={cn(
            'flex items-baseline gap-2 border-t border-rule pt-3',
            roundJustGenerated && 'deal-in',
          )}
        >
          <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
            Resting
          </span>
          <span className="text-sm font-bold text-ink">{restingNames.join(', ')}</span>
        </div>
      )}

      {round.locked ? (
        <GenerateAction first={false} />
      ) : (
        <div className="space-y-3">
          <Button
            data-testid="reroll-round"
            variant="outline"
            onClick={rerollRound}
            className="min-h-12 w-full"
          >
            <span aria-hidden="true">&#8635;</span>
            <span>Re-roll round</span>
          </Button>
          <Button
            data-testid="end-round"
            variant="signal"
            onClick={endRound}
            className="min-h-14 w-full text-base"
          >
            <span>End round</span>
            <span aria-hidden="true">&rarr;</span>
          </Button>
        </div>
      )}
    </section>
  )
}

/**
 * Past rounds — collapsed by default, and renders NO court/team/score DOM until
 * expanded. Every testid here is `history-` prefixed so the acceptance suite,
 * which counts `court` / `team` / `score-input` globally, stays untouched.
 */
function PastRounds() {
  const players = useStore((s) => s.players)
  const rounds = useStore((s) => s.rounds)
  const [open, setOpen] = useState(false)

  // The currently-displayed round is the last one; past rounds are everything
  // before it. They are locked by construction (a new round only generates
  // once the prior one is ended).
  const past = rounds.slice(0, -1)
  if (past.length === 0) return null

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id

  return (
    <section className="space-y-3">
      <Button
        data-testid="history-toggle"
        variant="ghost"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full justify-between px-1 text-ink-soft"
      >
        <span>
          Past rounds{' '}
          <span className="tabular-nums">({past.length})</span>
        </span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </Button>

      {open && (
        <div className="space-y-5">
          {[...past].reverse().map((round) => (
            <HistoryRound key={round.index} round={round} nameOf={nameOf} />
          ))}
        </div>
      )}
    </section>
  )
}

function HistoryRound({
  round,
  nameOf,
}: {
  round: Round
  nameOf: (id: string) => string
}) {
  const setScore = useStore((s) => s.setScore)
  const sitoutNames = round.sitoutIds.map(nameOf)
  const restingNames = round.restingIds.map(nameOf)

  return (
    <div data-testid="history-round" data-round={round.index} className="space-y-3">
      <div className="flex items-baseline justify-between border-b border-rule pb-1.5">
        <h3 className="text-base font-extrabold uppercase tracking-[0.08em] text-ink">
          Round <span className="tabular-nums">{round.index}</span>
        </h3>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-ink-faint">
          Completed
        </span>
      </div>

      <div className="space-y-3">
        {round.courts.map((court, ci) => (
          <div
            key={`${round.index}-${ci}`}
            data-testid="history-court"
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
                  data-testid="history-team"
                  data-team={ti}
                  data-players={names.join(',')}
                  data-winner={isWinner}
                  className={cn(
                    'relative flex items-center gap-2.5 overflow-hidden px-3 py-3',
                    ti === 1 && 'border-t border-rule',
                    isWinner && 'bg-signal-wash',
                  )}
                >
                  <span className="w-9 shrink-0 text-[9px] font-extrabold uppercase leading-[1.1] tracking-[0.06em] text-signal-deep">
                    {isWinner && <span data-testid="history-winner-badge">Won</span>}
                  </span>
                  <span className="min-w-0 shrink truncate text-[15px] font-bold text-ink">
                    {names.join('  &  ')}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-0 min-w-[10px] flex-1 self-center border-b border-dotted border-ink-faint"
                  />
                  <input
                    data-testid="history-score-input"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    aria-label={`Correct score for ${names.join(' and ')}, round ${round.index}`}
                    value={team.score ?? ''}
                    onChange={(e) => setScore(round.index, ci, ti, parseScore(e.target.value))}
                    className={cn(
                      'h-11 w-14 shrink-0 rounded border text-center text-lg font-extrabold tabular-nums transition-colors duration-150 focus:outline-none',
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
        data-testid="history-sitouts"
        data-players={sitoutNames.join(',')}
        className="flex items-baseline gap-2 border-t border-rule pt-2.5"
      >
        <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
          {sitoutNames.length > 0 ? 'Sitting out' : 'Full house'}
        </span>
        <span className="text-sm font-bold text-ink">
          {sitoutNames.length > 0 ? sitoutNames.join(', ') : 'Everyone is playing'}
        </span>
      </div>

      {round.restingIds.length > 0 && (
        <div
          data-testid="history-resting"
          data-players={restingNames.join(',')}
          className="flex items-baseline gap-2 border-t border-rule pt-2.5"
        >
          <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
            Resting
          </span>
          <span className="text-sm font-bold text-ink">{restingNames.join(', ')}</span>
        </div>
      )}
    </div>
  )
}
