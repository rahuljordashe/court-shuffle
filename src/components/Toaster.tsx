import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Transient confirmations, courtside-sized. Carries three reversible actions: a
 * removed player can be restored, a checked-out player can be brought back, and
 * a reset session's standings can be returned. All undo in a single tap, for a
 * few seconds.
 *
 * The toast slides in like a card laid on the table, then clears itself after
 * five seconds (or the moment Undo is pressed).
 */
export function Toaster() {
  const removalUndo = useStore((s) => s.removalUndo)
  const checkoutUndo = useStore((s) => s.checkoutUndo)
  const sessionUndo = useStore((s) => s.sessionUndo)
  const undoRemovePlayer = useStore((s) => s.undoRemovePlayer)
  const clearRemovalUndo = useStore((s) => s.clearRemovalUndo)
  const undoCheckOut = useStore((s) => s.undoCheckOut)
  const clearCheckoutUndo = useStore((s) => s.clearCheckoutUndo)
  const undoResetSession = useStore((s) => s.undoResetSession)
  const clearSessionUndo = useStore((s) => s.clearSessionUndo)

  // Local mirror so the card can finish its exit after the store state clears.
  const [shown, setShown] = useState<{
    label: string
    text: string
    onUndo: () => void
  } | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // The most recent roster action takes precedence if several are live.
    const active = removalUndo
      ? {
          label: 'Removed',
          text: removalUndo.removedName,
          onUndo: undoRemovePlayer,
          onClear: clearRemovalUndo,
        }
      : checkoutUndo
        ? {
            label: 'Checked out',
            text: checkoutUndo.name,
            onUndo: undoCheckOut,
            onClear: clearCheckoutUndo,
          }
        : sessionUndo
          ? {
              label: 'Cleared',
              text: 'Session standings reset',
              onUndo: undoResetSession,
              onClear: clearSessionUndo,
            }
          : null

    if (active) {
      setShown({ label: active.label, text: active.text, onUndo: active.onUndo })
      setLeaving(false)
      const t = setTimeout(active.onClear, 5000)
      return () => clearTimeout(t)
    }
    // Store cleared (undo or timeout): play the exit, then unmount.
    setLeaving(true)
    const t = setTimeout(() => setShown(null), 200)
    return () => clearTimeout(t)
  }, [
    removalUndo,
    checkoutUndo,
    sessionUndo,
    undoRemovePlayer,
    clearRemovalUndo,
    undoCheckOut,
    clearCheckoutUndo,
    undoResetSession,
    clearSessionUndo,
  ])

  if (!shown) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-20 mx-auto max-w-md px-5">
      <div
        data-testid="toast"
        className={cn(
          'pointer-events-auto flex items-center gap-3 rounded-md bg-ink px-3 py-2.5',
          leaving ? 'toast-clear' : 'toast-deal',
        )}
      >
        <span className="shrink-0 rounded-sm bg-signal px-1.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-on-signal">
          {shown.label}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-paper">
          {shown.text}
        </span>
        <button
          data-testid="toast-undo"
          onClick={() => shown.onUndo()}
          className="min-h-11 shrink-0 rounded-sm border border-paper/30 px-3.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-paper transition-colors duration-150 hover:bg-paper/10 active:bg-paper/15"
        >
          Undo
        </button>
      </div>
    </div>
  )
}
