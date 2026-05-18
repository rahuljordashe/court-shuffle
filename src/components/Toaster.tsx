import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Transient confirmations, courtside-sized. Today it carries one message: a
 * removed player can be restored for a few seconds. Removing a player also
 * frees their locked/pool links, so an accidental tap is worth catching.
 *
 * The toast slides in like a card laid on the table, then clears itself after
 * five seconds (or the moment Undo is pressed).
 */
export function Toaster() {
  const removalUndo = useStore((s) => s.removalUndo)
  const undoRemovePlayer = useStore((s) => s.undoRemovePlayer)
  const clearRemovalUndo = useStore((s) => s.clearRemovalUndo)

  // Local mirror so the card can finish its exit after the store state clears.
  const [shown, setShown] = useState<{ name: string } | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (removalUndo) {
      setShown({ name: removalUndo.removedName })
      setLeaving(false)
      const t = setTimeout(clearRemovalUndo, 5000)
      return () => clearTimeout(t)
    }
    // Store cleared (undo or timeout): play the exit, then unmount.
    setLeaving(true)
    const t = setTimeout(() => setShown(null), 200)
    return () => clearTimeout(t)
  }, [removalUndo, clearRemovalUndo])

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
          Removed
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-paper">
          {shown.name}
        </span>
        <button
          data-testid="toast-undo"
          onClick={() => undoRemovePlayer()}
          className="min-h-11 shrink-0 rounded-sm border border-paper/30 px-3.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-paper transition-colors duration-150 hover:bg-paper/10 active:bg-paper/15"
        >
          Undo
        </button>
      </div>
    </div>
  )
}
