// Accessible front-end adapter; engine is independently licensed under MIT.
import * as engine from './engine/gameState.js';
import {getCard} from './engine/cards.js';
import {calculateCapturedScore} from './engine/rules/scoring.js';
import {findBombOptions,findShakeOptions} from './engine/rules/specialRules.js';
import {chooseAiMove,chooseAiGoStop,chooseAiChongtong,chooseAiGookjinAsDoubleJunk} from './engine/ai/strategy.js';
import {chooseAiFloorMatch} from './engine/ai/evaluator.js';

export {engine,getCard,calculateCapturedScore,findBombOptions,findShakeOptions};
export const revision='c02db44022b456df75c2e131b5e5cdd91d79764f';
export function shortName(id,duplicate=false){
  const c=getCard(id);if(!c)return '알 수 없는 패';
  if(c.month===0)return c.tags.includes('triple-junk')?'보너스 삼피':'보너스 쌍피';
  const kind=c.tags.includes('rain-bright')?'비광':c.type==='bright'?'광':
    c.tags.includes('gookjin')?'국진':c.tags.includes('godori')?'고도리':
    c.tags.includes('hongdan')?'홍단':c.tags.includes('cheongdan')?'청단':
    c.tags.includes('chodan')?'초단':c.typeLabel;
  const duplicateLabel=duplicate&&c.type==='junk'?` ${Number(id.slice(-2))-2}번`:'';
  return `${c.month}월 ${kind}${duplicateLabel}`;
}
export function score(state,player){return calculateCapturedScore(state[player==='human'?'humanCaptured':'computerCaptured'],{gookjinAsDoubleJunk:state[player==='human'?'humanGookjinAsDoubleJunk':'computerGookjinAsDoubleJunk']});}
export function sortCards(ids){return [...ids].sort((a,b)=>getCard(a).month-getCard(b).month||a.localeCompare(b));}
export function slotsFor(state){return [...sortCards(state.humanHand),...Array(10).fill(null)].slice(0,10);}
export function syncSlots(slots,state,preferredIndex=0){
  const hand=new Set(state.humanHand),next=slots.map(id=>hand.has(id)?id:null);
  const added=sortCards(state.humanHand.filter(id=>!next.includes(id)));
  for(const id of added){const i=next[preferredIndex]===null?preferredIndex:next.indexOf(null);if(i>=0)next[i]=id;}
  return next;
}
export function createRound(seed,previous=null,difficulty='normal'){
  const winner=previous?.roundResult==='nagari'?previous.startingPlayer:previous?.winner??undefined;
  const multiplier=engine.nextRoundMultiplier(previous?.roundResult,previous?.roundMultiplier??1);
  const s=engine.createInitialGame(seed,difficulty,100,winner,multiplier);
  // The app picks the first dealer randomly; subsequent rounds keep the winner.
  s.startingPlayerConfirmed=true;return s;
}
export function validSession(value){
  try{
    const s=value?.state;
    if(value.version!==1||!engine.isValidGameState(s)||s.stateVersion!==3)return false;
    if(!['playing','awaiting-go-stop','awaiting-chongtong','round-ended'].includes(s.phase)||!['human','computer'].includes(s.currentPlayer))return false;
    for(const key of ['humanGoCount','computerGoCount','humanBombSkips','computerBombSkips','humanPpeokCount','computerPpeokCount','turnNumber'])if(!Number.isInteger(s[key])||s[key]<0||s[key]>1000)return false;
    if(!Number.isInteger(s.randomSeed)||!Array.isArray(value.slots)||value.slots.length!==10)return false;
    const used=value.slots.filter(Boolean);
    if(new Set(used).size!==used.length||used.length!==s.humanHand.length||used.some(id=>!s.humanHand.includes(id)))return false;
    if(value.pending){
      if(s.phase!=='playing'||s.currentPlayer!=='human')return false;
      const p=value.pending;
      if(!['card','bomb','flip-only'].includes(p.kind))return false;
      if(p.kind==='card'&&!s.humanHand.includes(p.cardId))return false;
      if(p.kind==='bomb'&&!findBombOptions(s.humanHand,s.floorCards).some(b=>b.month===p.month))return false;
      if(p.kind==='flip-only'&&s.humanBombSkips<=0)return false;
      if(p.playedMatchId&&!engine.getMatchingFloorCards(s.floorCards,p.cardId).includes(p.playedMatchId))return false;
    }
    return true;
  }catch{return false;}
}
export function bombDrawChoice(state,month){
  const card=state.drawPile.find(id=>getCard(id).month!==0);if(!card)return null;
  const floor=state.floorCards.filter(id=>getCard(id).month!==month);
  const candidateIds=engine.getMatchingFloorCards(floor,card);
  return candidateIds.length===2?{drawnCardId:card,candidateIds}:null;
}
export function humanChoice(state,pending){
  if(pending.drawnMatchId)return null;
  if(pending.kind==='card'){
    const matches=engine.getMatchingFloorCards(state.floorCards,pending.cardId);
    if(matches.length===2&&!pending.playedMatchId)return {stage:'played',title:`${getCard(pending.cardId).month}월, 가져올 패 선택`,candidateIds:matches};
    const draw=engine.getDrawFloorChoice(state,pending.cardId,pending.playedMatchId);
    return draw?{stage:'drawn',title:`뒤집은 ${shortName(draw.drawnCardId)}, 가져올 패 선택`,...draw}:null;
  }
  const draw=pending.kind==='bomb'?bombDrawChoice(state,pending.month):engine.getFlipOnlyDrawChoice(state);
  return draw?{stage:'drawn',title:`뒤집은 ${shortName(draw.drawnCardId)}, 가져올 패 선택`,...draw}:null;
}
export function execute(state,player,move){
  if(move.kind==='bomb')return engine.playBomb(state,player,move.month,move.drawnMatchId);
  if(move.kind==='flip-only')return engine.playFlipOnlyTurn(state,player,move.drawnMatchId);
  return engine.playTurn(state,player,move.cardId,{playedMatchId:move.playedMatchId,drawnMatchId:move.drawnMatchId});
}
export function computerStep(state){
  const difficulty=state.computerDifficulty??'normal';
  if(state.phase==='awaiting-chongtong'&&state.pendingDecision==='computer')return {state:engine.chooseChongtong(state,'computer',chooseAiChongtong(state,difficulty)),decision:'chongtong'};
  if(state.phase==='awaiting-go-stop'&&state.pendingDecision==='computer'){
    const decision=chooseAiGoStop(state,'computer',difficulty);
    return {state:decision==='go'?engine.chooseGo(state,'computer'):engine.chooseStop(state,'computer'),decision};
  }
  const current=structuredClone(state);
  const choice=chooseAiMove(current,'computer',difficulty).move;
  if(!choice)throw Error('상대가 낼 수 있는 패를 찾지 못했습니다.');
  if(choice.kind==='shake')return {state:engine.declareShake(current,'computer',choice.month),decision:'shake'};
  let draw=null;
  if(choice.kind==='card')draw=engine.getDrawFloorChoice(current,choice.cardId,choice.playedMatchId);
  if(choice.kind==='bomb')draw=bombDrawChoice(current,choice.month);
  if(choice.kind==='flip-only')draw=engine.getFlipOnlyDrawChoice(current);
  if(draw)choice.drawnMatchId=chooseAiFloorMatch(draw.candidateIds,current.humanCaptured);
  let result=execute(current,'computer',choice);
  if(result.state.computerCaptured.includes('m09-01')&&result.state.phase!=='round-ended'){
    const mode=chooseAiGookjinAsDoubleJunk(result.state.computerCaptured);
    if(mode!==result.state.computerGookjinAsDoubleJunk)result.state=engine.setGookjinChoice(result.state,'computer',mode);
  }
  return result;
}
export function turnSummary(before,result,player){
  const actor=player==='human'?'나':'상대';
  if(result.decision==='go')return `${actor} ${result.state[player==='human'?'humanGoCount':'computerGoCount']}고.`;
  if(result.decision==='stop')return `${actor} 스톱.`;
  if(result.decision==='shake')return `${actor} 흔들기.`;
  if(result.decision==='chongtong')return `${actor} 총통.`;
  const specials=result.specialEvents?.map(e=>e.label)??[];
  const captured=result.captured?.length??0;
  let text=`${actor} ${captured?`${captured}장 획득`:'획득 없음'}`;
  if(result.playedCardId&&getCard(result.playedCardId).month)text=`${actor} ${getCard(result.playedCardId).month}월, ${captured?`${captured}장 획득`:'바닥'}`;
  if(specials.length)text+=`, ${specials.join('·')}`;
  const gained=score(result.state,player).total-score(before,player).total;
  if(gained>0)text+=`, ${score(result.state,player).total}점`;
  return text+'.';
}
