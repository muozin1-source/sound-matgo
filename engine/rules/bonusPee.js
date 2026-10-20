/* Derived from itsent-lab/hwatu, Copyright (c) 2026 NSJ. MIT: licenses/Hwatu-MIT.txt */
import { getCard } from '../cards.js';
import { applyBonusPeeCapture } from './specialRules.js';
const captureKeys = (player)=>player === 'human' ? {
        actor: 'humanCaptured',
        opponent: 'computerCaptured'
    } : {
        actor: 'computerCaptured',
        opponent: 'humanCaptured'
    };
export const isBonusPee = (cardId)=>Boolean(cardId && getCard(cardId)?.tags.includes('bonus-pee'));
export function captureBonusPee(state, player, cardId) {
    const keys = captureKeys(player);
    const captured = applyBonusPeeCapture(state[keys.actor], state[keys.opponent], cardId);
    state[keys.actor] = captured.actorCaptured;
    state[keys.opponent] = captured.opponentCaptured;
    return {
        cardId,
        stolenCardId: captured.stolenCardId
    };
}
export function drawThroughBonusPee(state, player) {
    const bonusCards = [];
    const stolenPee = [];
    while(state.drawPile.length){
        const cardId = state.drawPile.shift();
        if (!isBonusPee(cardId)) return {
            drawnCardId: cardId,
            bonusCards,
            stolenPee
        };
        const captured = captureBonusPee(state, player, cardId);
        bonusCards.push(cardId);
        if (captured.stolenCardId) stolenPee.push(captured.stolenCardId);
    }
    return {
        drawnCardId: null,
        bonusCards,
        stolenPee
    };
}
export function playBonusPeeFromHand(state, player, cardId) {
    const handKey = player === 'human' ? 'humanHand' : 'computerHand';
    const handIndex = state[handKey].indexOf(cardId);
    if (handIndex < 0 || !isBonusPee(cardId)) throw new Error('손에 있는 보너스패가 아닙니다.');
    state[handKey].splice(handIndex, 1);
    const captured = captureBonusPee(state, player, cardId);
    const replacementCardId = state.drawPile.shift() ?? null;
    if (replacementCardId) state[handKey].push(replacementCardId);
    return {
        bonusCards: [
            cardId
        ],
        stolenPee: captured.stolenCardId ? [
            captured.stolenCardId
        ] : [],
        replacementCardId
    };
}
