/* Derived from itsent-lab/hwatu, Copyright (c) 2026 NSJ. MIT: licenses/Hwatu-MIT.txt */
export const MATGO_POINT_VALUES = [
    100,
    1_000,
    2_000,
    5_000,
    10_000
];
export function isMatgoPointValue(value) {
    return typeof value === 'number' && MATGO_POINT_VALUES.includes(value);
}
export function normalizeMatgoPointValue(value) {
    return isMatgoPointValue(value) ? value : 100;
}
export const DEFAULT_MATGO_RULES = Object.freeze({
    targetScore: 7,
    pointValue: 100,
    bright: {
        rainThree: 2,
        three: 3,
        four: 4,
        five: 15
    },
    setScore: 3,
    godoriScore: 5,
    animalStart: 5,
    ribbonStart: 5,
    junkStart: 10,
    bakMultiplier: 2,
    allowTwoCardBomb: true,
    threePpeokBaseScore: 7
});
export function matgoRulesForPointValue(pointValue) {
    return {
        ...DEFAULT_MATGO_RULES,
        pointValue: normalizeMatgoPointValue(pointValue)
    };
}
