/**
 * Normalize a positive prompt by removing filter words.
 * Used for group-key generation so that variants like "1girl" vs "1boy"
 * from the same prompt series are grouped together.
 *
 * @param {string} prompt - The full positive prompt (comma-separated)
 * @param {string[]} filterWords - Words to ignore during grouping
 * @returns {string} Normalized prompt with filter words removed
 */
export function normalizePrompt(prompt, filterWords) {
  if (!prompt || !filterWords || filterWords.length === 0) return (prompt || "").trim();

  const filterSet = new Set(filterWords.map(w => w.toLowerCase().trim()));
  const parts = prompt.split(/[,£¬]/).map(p => p.trim());

  const kept = parts.filter(p => {
    if (!p) return false;
    const lower = p.toLowerCase();
    return !filterSet.has(lower);
  });

  return kept.join(", ").trim();
}