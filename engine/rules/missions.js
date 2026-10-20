/* Derived from itsent-lab/hwatu, Copyright (c) 2026 NSJ. MIT: licenses/Hwatu-MIT.txt */
import { createDeck, shuffleDeck } from '../deck.js';
export function createCardMission(seed) {
    const shuffled = shuffleDeck(createDeck(), seed ^ 0x5f3759df);
    return {
        kind: 'gakpae',
        cardIds: shuffled.cards.slice(0, 3)
    };
}
export function evaluateCardMission(mission, humanCaptured, computerCaptured) {
    if (!mission) return {
        humanCardIds: [],
        computerCardIds: [],
        humanMultiplier: 1,
        computerMultiplier: 1
    };
    const humanSet = new Set(humanCaptured);
    const computerSet = new Set(computerCaptured);
    const humanCardIds = mission.cardIds.filter((cardId)=>humanSet.has(cardId));
    const computerCardIds = mission.cardIds.filter((cardId)=>computerSet.has(cardId));
    return {
        humanCardIds,
        computerCardIds,
        humanMultiplier: 2 ** humanCardIds.length,
        computerMultiplier: 2 ** computerCardIds.length
    };
}
export function missionMultiplierFor(mission, humanCaptured, computerCaptured, player) {
    const progress = evaluateCardMission(mission, humanCaptured, computerCaptured);
    return player === 'human' ? progress.humanMultiplier : progress.computerMultiplier;
}
export function capturedMissionCards(mission, capturedCardIds) {
    if (!mission) return [];
    const targets = new Set(mission.cardIds);
    return [
        ...new Set(capturedCardIds.filter((cardId)=>targets.has(cardId)))
    ];
}
