/* Derived from itsent-lab/hwatu, Copyright (c) 2026 NSJ. MIT: licenses/Hwatu-MIT.txt */
import { DEFAULT_MATGO_RULES } from './settings.js';
export function canChooseGoStop(score, scoreAtLastGo, settings = DEFAULT_MATGO_RULES) {
    return score >= settings.targetScore && score > scoreAtLastGo;
}
export function chooseComputerGoStop(score, goCount, cardsRemaining) {
    if (goCount === 0 && score < 10 && cardsRemaining >= 3) return 'go';
    return 'stop';
}
