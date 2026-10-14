export const WEEKLY_WAIT_EXTENSION_LIMIT = 2;

/** Minutos concedidos para el uso semanal indicado (1-based). */
export function waitExtensionMinutesForUse(useNumber: number): number | null {
  if (useNumber === 1) return 10;
  if (useNumber === 2) return 5;
  return null;
}

export function weeklyWaitExtensionState(used: number): {
  used: number;
  remaining: number;
  nextMinutes: number | null;
} {
  const normalized = Math.min(
    WEEKLY_WAIT_EXTENSION_LIMIT,
    Math.max(0, Number(used) || 0),
  );
  return {
    used: normalized,
    remaining: WEEKLY_WAIT_EXTENSION_LIMIT - normalized,
    nextMinutes: waitExtensionMinutesForUse(normalized + 1),
  };
}
