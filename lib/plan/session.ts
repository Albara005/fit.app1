import type { WorkoutDay } from '../types'

/**
 * Which exercise the next set belongs to, and how many of its sets are done.
 * Derived from the session's running count rather than stored beside it, so
 * undoing a set can never leave the two disagreeing.
 */
export function positionOf(day: WorkoutDay, setsDone: number): { index: number; doneInExercise: number } {
  let before = 0
  for (let i = 0; i < day.exercises.length; i++) {
    const sets = day.exercises[i]!.sets
    if (setsDone < before + sets) return { index: i, doneInExercise: setsDone - before }
    before += sets
  }
  return { index: day.exercises.length, doneInExercise: 0 }
}
