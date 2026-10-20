import {test} from 'node:test';
import assert from 'node:assert/strict';
import {engine,createRound,score,humanChoice,execute,computerStep,validSession,slotsFor,syncSlots} from '../game.js';
import {createMatgoDeck} from '../engine/deck.js';
import {getCard} from '../engine/cards.js';
import {calculateCapturedScore} from '../engine/rules/scoring.js';
import {calculateSettlement} from '../engine/rules/settlement.js';
import {chooseAiMove,chooseAiGoStop} from '../engine/ai/strategy.js';
import {chooseAiFloorMatch,evaluateMoves} from '../engine/ai/evaluator.js';

function fixture(hand,floor,top){
  const s=createRound(2);const used=new Set([...hand,...floor,...top]);
  const rest=createMatgoDeck().filter(id=>!used.has(id));
  Object.assign(s,{humanHand:hand,computerHand:rest.splice(-4),floorCards:floor,drawPile:[...top,...rest],humanCaptured:[],computerCaptured:[],currentPlayer:'human',phase:'playing',pendingDecision:null,ppeokPiles:[]});
  return s;
}
function conserved(s){const ids=engine.allCardIds(s);assert.equal(ids.length,50);assert.equal(new Set(ids).size,50);assert(engine.isValidGameState(s));}

test('nagari preserves dealer and carries multiplier into next round',()=>{
  const previous=createRound(2);previous.roundResult='nagari';previous.startingPlayer='human';previous.winner=null;previous.roundMultiplier=2;
  const next=createRound(31,previous);assert.equal(next.startingPlayer,'human');assert.equal(next.roundMultiplier,4);
});

test('50 cards, correct scores, and settlement multipliers',()=>{
  assert.equal(createMatgoDeck().length,50);
  assert.equal(calculateCapturedScore(['m01-01','m03-01','m08-01']).total,3);
  assert.equal(calculateCapturedScore(['m01-01','m03-01','m12-01']).total,2);
  assert.equal(calculateCapturedScore(['m02-01','m04-01','m08-02']).total,5);
  const winner=calculateCapturedScore(['m01-02','m02-02','m03-02']);
  const settlement=calculateSettlement({winnerScore:winner,loserScore:calculateCapturedScore([]),winnerGoCount:3,loserCapturedCount:1});
  assert.equal(settlement.finalScore,12);
});
test('human chooses both played and drawn matches without changing state early',()=>{
  const s=fixture(['m03-01'],['m03-02','m03-03','m04-03','m04-04'],['m04-01']);
  const original=structuredClone(s);const pending={kind:'card',cardId:'m03-01'};
  assert.equal(humanChoice(s,pending).stage,'played');
  pending.playedMatchId='m03-03';assert.equal(humanChoice(s,pending).stage,'drawn');
  pending.drawnMatchId='m04-04';assert.equal(humanChoice(s,pending),null);
  assert.deepEqual(s,original);
  const result=execute(s,'human',pending);
  assert(result.state.humanCaptured.includes('m03-03'));assert(!result.state.humanCaptured.includes('m03-02'));
  assert(result.state.humanCaptured.includes('m04-04'));conserved(result.state);
});
test('bomb supports a human-selected draw match and conserves every card',()=>{
  const s=fixture(['m03-01','m03-02','m03-03','m01-03'],['m03-04','m04-03','m04-04'],['m04-01']);
  const move={kind:'bomb',month:3};assert.equal(humanChoice(s,move).stage,'drawn');move.drawnMatchId='m04-04';
  const r=execute(s,'human',move);assert(r.state.humanCaptured.includes('m04-04'));assert(r.state.floorCards.includes('m04-03'));conserved(r.state);
});
test('fixed hand slots and saved committed choices survive reload validation',()=>{
  const s=createRound(2),slots=slotsFor(s);
  assert(validSession({version:1,state:s,slots,pending:null}));
  const bad=structuredClone(s);bad.humanHand[0]=bad.humanHand[1];assert(!validSession({version:1,state:bad,slots}));
  const id=s.humanHand[0];const after=structuredClone(s);after.humanHand=after.humanHand.filter(x=>x!==id);
  const next=syncSlots(slots,after);assert.equal(next[slots.indexOf(id)],null);
  for(let i=0;i<10;i++)if(slots[i]!==id)assert.equal(next[i],slots[i]);
});
test('AI move evaluation is independent of hidden hand identities and deck order',()=>{
  const a=createRound(80),b=structuredClone(a);
  const hidden=[...b.humanHand,...b.drawPile].reverse();b.humanHand=hidden.splice(0,b.humanHand.length);b.drawPile=hidden;
  assert.deepEqual(evaluateMoves(a,'computer'),evaluateMoves(b,'computer'));
});
test('400 complete seeded rounds finish, conserve cards and never get stuck',()=>{
  let finished=0;
  for(const difficulty of ['easy','normal','hard','expert'])for(let seed=1;seed<=100;seed++){
    let s=createRound(seed,null,difficulty),steps=0;
    while(s.phase!=='round-ended'&&steps++<160){
      conserved(s);
      if(s.phase==='awaiting-chongtong'){s=engine.chooseChongtong(s,s.pendingDecision,'stop');continue;}
      if(s.phase==='awaiting-go-stop'){
        const p=s.pendingDecision;const decision=chooseAiGoStop(s,p,difficulty);
        s=decision==='go'?engine.chooseGo(s,p):engine.chooseStop(s,p);continue;
      }
      if(s.currentPlayer==='computer'){s=computerStep(s).state;continue;}
      const move=chooseAiMove(s,'human',difficulty).move;assert(move);
      if(move.kind==='shake'){s=engine.declareShake(s,'human',move.month);continue;}
      for(let guard=0;guard<3;guard++){
        const choice=humanChoice(s,move);if(!choice)break;
        const id=chooseAiFloorMatch(choice.candidateIds,s.computerCaptured);
        move[choice.stage==='played'?'playedMatchId':'drawnMatchId']=id;
      }
      assert.equal(humanChoice(s,move),null);s=execute(s,'human',move).state;
    }
    assert.equal(s.phase,'round-ended',`seed ${seed} ${difficulty}`);conserved(s);finished++;
  }
  assert.equal(finished,400);
});
