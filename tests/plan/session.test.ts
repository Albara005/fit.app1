import { describe, expect, it } from 'vitest'
import { positionOf } from '../../lib/plan/session'
import { makeDay, makeExercise } from '../factories'

// Three exercises of 3, 2 and 4 sets: nine in all.
const day = makeDay({
  exercises: [makeExercise({ id: 'a', sets: 3 }), makeExercise({ id: 'b', sets: 2 }), makeExercise({ id: 'c', sets: 4 })],
})

describe('positionOf', () => {
  it('starts on the first set of the first exercise', () => {
    expect(positionOf(day, 0)).toEqual({ index: 0, doneInExercise: 0 })
  })

  it('stays on an exercise until its last set is logged', () => {
    expect(positionOf(day, 2)).toEqual({ index: 0, doneInExercise: 2 })
  })

  it('moves on exactly when an exercise is complete', () => {
    expect(positionOf(day, 3)).toEqual({ index: 1, doneInExercise: 0 })
    expect(positionOf(day, 5)).toEqual({ index: 2, doneInExercise: 0 })
  })

  it('reports the end once every set is done', () => {
    expect(positionOf(day, 9)).toEqual({ index: 3, doneInExercise: 0 })
  })

  it('makes undo exact: one set back from a boundary returns to the last set before it', () => {
    // The case a separately stored index got wrong: undo across an exercise boundary.
    expect(positionOf(day, 3 - 1)).toEqual({ index: 0, doneInExercise: 2 })
  })

  it('handles a day with no exercises', () => {
    expect(positionOf(makeDay({ exercises: [] }), 0)).toEqual({ index: 0, doneInExercise: 0 })
  })
})
