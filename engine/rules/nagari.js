/* Derived from itsent-lab/hwatu, Copyright (c) 2026 NSJ. MIT: licenses/Hwatu-MIT.txt */
export const MAX_NAGARI_MULTIPLIER = 8;
export function nextRoundMultiplier(roundResult, currentMultiplier = 1) {
    return roundResult === 'nagari' ? Math.min(MAX_NAGARI_MULTIPLIER, Math.max(1, currentMultiplier) * 2) : 1;
}
