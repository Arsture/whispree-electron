export function wordEditDistance(left: string, right: string): number {
  const a = tokenizeWords(left);
  const b = tokenizeWords(right);
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0]![j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + substitutionCost,
      );
    }
  }

  return dp[a.length]![b.length]!;
}

export function tokenizeWords(value: string): readonly string[] {
  const trimmed = value.trim().toLocaleLowerCase();
  if (!trimmed) return [];
  return trimmed.split(/\s+/u);
}
