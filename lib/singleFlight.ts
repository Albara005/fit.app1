import { useRef, useState } from 'react'

/**
 * Runs an action at most once at a time. Two taps — or two Enter presses —
 * land before React re-renders, so a busy flag in state cannot stop the second
 * one: the guard is a plain variable, and state only follows it for the spinner.
 *
 * A synchronous action passes straight through and never marks anything busy.
 */
export function createSingleFlight(onChange: (running: boolean) => void) {
  let running = false
  return function run(action: () => unknown): void {
    if (running) return
    const out = action()
    if (!(out instanceof Promise)) return
    running = true
    onChange(true)
    // Released whether the action succeeds or fails. A failure is not
    // swallowed here: it still reaches whoever reports unhandled errors.
    void out.finally(() => {
      running = false
      onChange(false)
    })
  }
}

/** The guard for one component: whether an action is running, and how to start one. */
export function useSingleFlight(): [running: boolean, run: (action: () => unknown) => void] {
  const [running, setRunning] = useState(false)
  const flight = useRef<ReturnType<typeof createSingleFlight> | null>(null)
  flight.current ??= createSingleFlight(setRunning)
  return [running, flight.current]
}
