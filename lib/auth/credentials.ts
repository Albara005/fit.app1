/**
 * Shape checks for what the user types. Deliberately free of any Supabase or
 * React Native import so the rules can be tested on their own — they are domain
 * rules about input, not a property of the backend that happens to consume them.
 */

/** Six digits, which is what Supabase sends. Anything else is a paste accident. */
export function isCodeShaped(token: string): boolean {
  // Eastern Arabic digits are rejected on purpose: an Arabic keyboard would
  // otherwise produce a code that looks right and fails silently at the server.
  return /^\d{6}$/.test(token.trim())
}

export function isEmailShaped(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}
