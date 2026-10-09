/** Visible start of the last message — truncated text is not kept in the returned string. */
export function peekLastMessage(
  text: string,
  maxChars = 110,
): { text: string; truncated: boolean } {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return { text: normalized, truncated: false };
  let slice = normalized.slice(0, maxChars);
  const breakAt = slice.lastIndexOf(" ");
  if (breakAt > maxChars * 0.55) slice = slice.slice(0, breakAt);
  return { text: slice, truncated: true };
}
