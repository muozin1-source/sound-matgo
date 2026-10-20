/* Derived from itsent-lab/hwatu, Copyright (c) 2026 NSJ. MIT: licenses/Hwatu-MIT.txt */
const TURN_RANGES = {
    easy: [
        650,
        1050
    ],
    normal: [
        800,
        1350
    ],
    hard: [
        950,
        1600
    ],
    expert: [
        1050,
        1800
    ]
};
const LONG_THOUGHT_THRESHOLD = 0.72;
const MAX_THINKING_MS = 5000;
function thinkingVariation(seed, turnNumber) {
    const mixed = Math.sin(seed * 0.017 + turnNumber * 12.9898 + 17) * 43758.5453;
    return Math.abs(mixed - Math.trunc(mixed));
}
export function createAiThinkingPlan(difficulty, seed, turnNumber, kind, autoPlay, now = Date.now()) {
    const variation = thinkingVariation(seed, turnNumber);
    const [minimum, maximum] = TURN_RANGES[difficulty];
    const needsDeliberation = kind !== 'turn' || variation > LONG_THOUGHT_THRESHOLD;
    const quickDuration = minimum + (maximum - minimum) * variation;
    const thoughtfulDuration = 2200 + variation * 2800;
    const naturalDuration = Math.min(MAX_THINKING_MS, Math.round(needsDeliberation ? thoughtfulDuration : quickDuration));
    const durationMs = autoPlay ? Math.round(900 + variation * 400) : naturalDuration;
    const label = kind === 'go-stop' ? '고·스톱을 고민하는 중…' : kind === 'chongtong' ? '총통 승부를 고민하는 중…' : variation > 0.72 ? '한 수 더 살펴보는 중…' : '낼 패를 고르는 중…';
    return {
        durationMs,
        endsAt: now + durationMs,
        label
    };
}
