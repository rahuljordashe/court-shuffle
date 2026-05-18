export type ClassValue = string | false | null | undefined

/** Tiny classnames joiner (clsx-style) for composing Tailwind classes. */
export function cn(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(' ')
}

let counter = 0
/** Stable-ish unique id, falling back when crypto.randomUUID is unavailable. */
export function uid(prefix = 'p'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}
