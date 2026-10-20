/* Derived from itsent-lab/hwatu, Copyright (c) 2026 NSJ. MIT: licenses/Hwatu-MIT.txt */
import { randomInteger } from '../random.js';
import { calculateCapturedScore } from '../rules/scoring.js';
import { evaluateMoves, estimatePlayerThreat } from './evaluator.js';
import { AI_DIFFICULTIES } from './settings.js';
const playerState = (state, player)=>player === 'human' ? {
        hand: state.humanHand,
        captured: state.humanCaptured,
        goCount: state.humanGoCount,
        gookjin: state.humanGookjinAsDoubleJunk,
        bombSkips: state.humanBombSkips ?? 0
    } : {
        hand: state.computerHand,
        captured: state.computerCaptured,
        goCount: state.computerGoCount,
        gookjin: state.computerGookjinAsDoubleJunk,
        bombSkips: state.computerBombSkips ?? 0
    };
function takeRandom(state, maxExclusive) {
    const random = randomInteger(state.randomSeed, maxExclusive);
    state.randomSeed = random.seed;
    return random.value;
}
function rankExpertMoves(evaluations) {
    return [
        ...evaluations
    ].sort((left, right)=>{
        const strategicScore = (evaluation)=>evaluation.total + evaluation.combinationValue * 0.35 - Math.max(0, evaluation.opponentRisk) * 0.65 + Math.max(0, -evaluation.opponentRisk) * 0.25;
        return strategicScore(right) - strategicScore(left);
    });
}
export function chooseAiMove(state, player, difficulty) {
    const evaluated = evaluateMoves(state, player);
    const evaluations = difficulty === 'expert' ? rankExpertMoves(evaluated) : evaluated;
    if (!evaluations.length) return {
        player,
        difficulty,
        move: null,
        evaluations,
        selectedOptimal: false
    };
    if (evaluations.length === 1) return {
        player,
        difficulty,
        move: evaluations[0].move,
        evaluations,
        selectedOptimal: true
    };
    const config = AI_DIFFICULTIES[difficulty];
    const probabilityRoll = takeRandom(state, 10_000) / 10_000;
    const selectedOptimal = probabilityRoll < config.optimalMoveProbability;
    const selected = selectedOptimal ? evaluations[0] : evaluations[1 + takeRandom(state, evaluations.length - 1)];
    return {
        player,
        difficulty,
        move: selected.move,
        evaluations,
        selectedOptimal
    };
}
export function chooseAiCard(state, player, difficulty) {
    const evaluated = evaluateMoves(state, player).filter((evaluation)=>evaluation.move.kind === 'card');
    const cardEvaluations = difficulty === 'expert' ? rankExpertMoves(evaluated) : evaluated;
    if (!cardEvaluations.length) return null;
    const config = AI_DIFFICULTIES[difficulty];
    const selectedOptimal = takeRandom(state, 10_000) / 10_000 < config.optimalMoveProbability;
    const selected = selectedOptimal || cardEvaluations.length === 1 ? cardEvaluations[0] : cardEvaluations[1 + takeRandom(state, cardEvaluations.length - 1)];
    return selected.move.kind === 'card' ? selected.move.cardId : null;
}
export function chooseAiGoStop(state, player, difficulty) {
    const config = AI_DIFFICULTIES[difficulty];
    const current = playerState(state, player);
    const opponent = playerState(state, player === 'human' ? 'computer' : 'human');
    const actionsRemaining = current.hand.length + current.bombSkips;
    if (actionsRemaining <= 0) return 'stop';
    if (difficulty === 'easy') return takeRandom(state, 10_000) / 10_000 < config.easyStopProbability ? 'stop' : 'go';
    const currentScore = calculateCapturedScore(current.captured, {
        gookjinAsDoubleJunk: current.gookjin
    }).total;
    const opponentScore = calculateCapturedScore(opponent.captured, {
        gookjinAsDoubleJunk: opponent.gookjin
    }).total;
    const bestFutureMove = evaluateMoves(state, player)[0]?.total ?? 0;
    const opponentThreat = estimatePlayerThreat(state, player === 'human' ? 'computer' : 'human');
    const reward = Math.min(8, bestFutureMove / 6) + actionsRemaining * 0.7 + (currentScore <= 9 ? 2.2 : 0);
    const risk = opponentThreat * (1 - config.goRiskTolerance) + opponentScore * 0.55 + current.goCount * 3.4 + (actionsRemaining <= 2 ? 4 : 0);
    return reward > risk ? 'go' : 'stop';
}
export function chooseAiChongtong(state, difficulty) {
    if (difficulty !== 'easy') return 'stop';
    return takeRandom(state, 10_000) / 10_000 < AI_DIFFICULTIES.easy.easyStopProbability ? 'stop' : 'continue';
}
export function chooseAiGookjinAsDoubleJunk(captured) {
    const asAnimal = calculateCapturedScore(captured, {
        gookjinAsDoubleJunk: false
    });
    const asDoubleJunk = calculateCapturedScore(captured, {
        gookjinAsDoubleJunk: true
    });
    return asDoubleJunk.total >= asAnimal.total;
}
