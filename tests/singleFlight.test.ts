import { describe, expect, it, vi } from 'vitest'
import { createSingleFlight } from '../lib/singleFlight'

function deferred() {
  let resolve!: () => void
  let reject!: (e: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('createSingleFlight', () => {
  it('ignores a second start while the first is running', async () => {
    const changes: boolean[] = []
    const run = createSingleFlight((r) => changes.push(r))
    const d = deferred()
    const action = vi.fn(() => d.promise)
    run(action)
    run(action)
    expect(action).toHaveBeenCalledTimes(1)
    d.resolve()
    await d.promise
    await Promise.resolve()
    expect(changes).toEqual([true, false])
  })

  it('accepts a new start once the first has settled', async () => {
    const run = createSingleFlight(() => {})
    const action = vi.fn(() => Promise.resolve())
    run(action)
    await new Promise((r) => setTimeout(r, 0))
    run(action)
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('releases after a failure too', async () => {
    const changes: boolean[] = []
    const run = createSingleFlight((r) => changes.push(r))
    const d = deferred()
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    run(() => d.promise)
    d.reject(new Error('network'))
    await new Promise((r) => setTimeout(r, 0))
    process.off('unhandledRejection', unhandled)
    expect(changes).toEqual([true, false])
    // Not swallowed: the failure still reaches the global handler.
    expect(unhandled).toHaveBeenCalledTimes(1)
    const action = vi.fn()
    run(action)
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('lets a synchronous action through without marking anything busy', () => {
    const onChange = vi.fn()
    const run = createSingleFlight(onChange)
    const action = vi.fn()
    run(action)
    run(action)
    expect(action).toHaveBeenCalledTimes(2)
    expect(onChange).not.toHaveBeenCalled()
  })
})
