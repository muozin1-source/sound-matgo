import {engine,getCard,shortName,sortCards,slotsFor,syncSlots,score,createRound,validSession,humanChoice,execute,computerStep,turnSummary,findBombOptions,findShakeOptions} from './game.js';
import {createSound} from './audio.js';

const $=id=>document.getElementById(id),SAVE='sound-matgo-round-v1',PREF='sound-matgo-settings-v1';
const defaults={difficulty:'normal',muted:false,voices:true,effectVolume:.30,voiceVolume:.42};
let settings={...defaults};
try{const raw=JSON.parse(localStorage.getItem(PREF));if(raw){for(const key of ['muted','voices'])if(typeof raw[key]==='boolean')settings[key]=raw[key];if(['easy','normal','hard','expert'].includes(raw.difficulty))settings.difficulty=raw.difficulty;for(const key of ['effectVolume','voiceVolume'])if(Number.isFinite(raw[key]))settings[key]=Math.max(0,Math.min(1,raw[key]));}}catch{}
const sound=createSound(settings),handButtons=[],floorButtons=[];
let state=null,slots=Array(10).fill(null),pending=null,gookjinNeeded=false,busy=false,started=false,aiTimer,liveTimer;
let message='아래 손패에서 낼 패를 두 번 탭하세요.',summaries=[],lastSlot=0,required=false,returnFocus='menu',panelKind='',endShown=false,storageWarning=false;
const node=(tag,text='',className='')=>{const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;};
function button(text,action,primary=false){const b=node('button',text,primary?'primary':'');b.type='button';b.addEventListener('click',action);return b;}
function ownTurn(){return started&&state?.phase==='playing'&&state.currentPlayer==='human'&&!pending&&!busy;}
function focusHand(){
  if($('panel').open)return;
  const indices=Array.from({length:10},(_,i)=>(lastSlot+i)%10);
  const i=indices.find(i=>!handButtons[i].disabled&&slots[i]);
  (i===undefined?$('special'):handButtons[i]).focus({preventScroll:true});
}
function announce(text){
  message=text;$('message').textContent=text;clearTimeout(liveTimer);
  const el=$('panel').open?$('panel-live'):$('live');el.textContent='';
  liveTimer=setTimeout(()=>{el.textContent=text;},70);
}
function save(){
  try{if(state)localStorage.setItem(SAVE,JSON.stringify({version:1,state,slots,pending,gookjinNeeded,message}));localStorage.setItem(PREF,JSON.stringify(settings));}
  catch{if(!storageWarning){storageWarning=true;setTimeout(()=>announce('저장할 수 없는 환경입니다. 이 창을 닫으면 진행이 사라질 수 있습니다.'),600);}}
}
function restore(){
  try{const s=JSON.parse(localStorage.getItem(SAVE));if(!validSession(s))return false;state=s.state;slots=s.slots;pending=s.pending??null;gookjinNeeded=s.gookjinNeeded===true;message=typeof s.message==='string'?s.message.slice(0,400):'진행을 이어갑니다.';return true;}catch{return false;}
}
function show(title,kind,isRequired=false,back='menu'){
  required=isRequired;panelKind=kind;returnFocus=back;
  $('panel-title').textContent=title;$('panel-body').replaceChildren();$('panel-live').textContent='';$('panel-close').hidden=isRequired;
  clearTimeout(liveTimer);$('live').textContent='';
  if(!$('panel').open)$('panel').showModal();
  return $('panel-body');
}
function panelFocus(el=$('panel-title')){el.focus({preventScroll:true});}
function close(){required=false;$('panel').close();}
function cardList(ids,parent){const list=node('div','','card-list');sortCards(ids).forEach(id=>list.append(node('span',shortName(id,true))));parent.append(list);}
function render(){
  $('message').textContent=message;
  if(!state)return;
  const human=score(state,'human'),computer=score(state,'computer');
  $('human-score').textContent=`나 ${human.total}점${state.humanGoCount?` · ${state.humanGoCount}고`:''}`;
  $('computer-score').textContent=`상대 ${computer.total}점${state.computerGoCount?` · ${state.computerGoCount}고`:''}`;
  $('turn').textContent=state.phase==='round-ended'?'판 종료':state.phase!=='playing'?'선택 중':state.currentPlayer==='human'?'내 차례':'상대 차례';
  $('draw-count').textContent=`더미 ${state.drawPile.length}장`;
  floorButtons.forEach((b,i)=>{
    const ids=state.floorCards.filter(id=>getCard(id).month===i+1);
    b.dataset.empty=String(!ids.length);b.replaceChildren(node('strong',`${i+1}월`),node('span',ids.length?`${ids.length}장`:'없음','floor-kind'));
    b.setAttribute('aria-label',ids.length?`${i+1}월, ${ids.map(id=>shortName(id).replace(/^\d+월 /,'')).join(', ')}, ${ids.length}장`:`${i+1}월 없음`);
  });
  const shakeMonth=state.humanPendingShakeMonth;
  slots.forEach((id,i)=>{
    const b=handButtons[i];b.classList.toggle('empty',!id);b.disabled=!id||!ownTurn()||Boolean(shakeMonth&&getCard(id)?.month!==shakeMonth);
    b.dataset.legal=String(!shakeMonth||getCard(id)?.month===shakeMonth);
    if(b.dataset.card!==String(id)){
      b.dataset.card=String(id);b.replaceChildren();
      if(id){
        const card=getCard(id);
        if(card.month){const img=document.createElement('img');img.src=`cards/hwatu/${id}.svg`;img.alt='';img.draggable=false;b.append(img);}
        else b.append(node('span',card.tags.includes('triple-junk')?'三':'雙','bonus-art'));
        const label=node('span','','card-label');const name=shortName(id).split(' ');label.append(node('span',card.month?`${card.month}월`:'보너스'),node('small',card.month?name.slice(1).join(' '):card.typeLabel));b.append(label);
        if(state.mission?.cardIds.includes(id)){const badge=node('span','미션','mission-mark');badge.setAttribute('aria-hidden','true');b.append(badge);}
      }
    }
    if(id)b.setAttribute('aria-label',`${shortName(id,true)}${state.mission?.cardIds.includes(id)?', 미션':''}${shakeMonth&&getCard(id).month!==shakeMonth?', 흔들기 패를 먼저 내세요':''}`);
  });
  $('hand-count').textContent=`${state.humanHand.length}장${state.humanBombSkips?` · 뒤집기 ${state.humanBombSkips}회`:''}`;
  const available=ownTurn()&&(state.humanBombSkips>0||findBombOptions(state.humanHand,state.floorCards).length||findShakeOptions(state.humanHand,state.floorCards,state.humanShakenMonths).length);
  $('special').dataset.available=String(Boolean(available));
  $('special').textContent=state.phase==='round-ended'?'판 결과':ownTurn()&&!state.humanHand.length&&state.humanBombSkips?'패 뒤집기':'특수';
}
function fresh(){
  clearTimeout(aiTimer);pending=null;gookjinNeeded=false;busy=false;endShown=false;summaries=[];
  const seed=crypto.getRandomValues(new Uint32Array(1))[0]>>>1;
  state=createRound(seed,state?.phase==='round-ended'?state:null,settings.difficulty);
  slots=slotsFor(state);lastSlot=0;message=`${state.currentPlayer==='human'?'내':'상대'} 선. ${state.roundMultiplier>1?`이월 ${state.roundMultiplier}배.`:''}`;
  render();save();sound.effect('start');drive();
}
function start(){started=true;sound.unlock();close();if(!state)fresh();else{render();drive();}}
function resultPanel(){
  endShown=true;busy=false;render();save();
  const winner=state.winner,title=state.roundResult==='nagari'?'나가리':winner==='human'?'내가 이겼습니다':'상대가 이겼습니다';
  const body=show(title,'result',false,'special');
  if(state.settlement){
    body.append(node('p',`최종 ${state.settlement.finalScore.toLocaleString('ko-KR')}점`));
    for(const step of state.settlement.steps)body.append(node('p',`${step.label}: ${step.formula} = ${step.value}점`,'quiet'));
    if(state.settlement.baks.length)body.append(node('p',state.settlement.baks.map(b=>b.label).join(' · ')));
  }else body.append(node('p',`이번 판은 승부 없음. 다음 판 ${engine.nextRoundMultiplier(state.roundResult,state.roundMultiplier??1)}배.`));
  const next=button('다음 판 시작',()=>{close();fresh();},true);body.append(next);panelFocus(next);
}
function choicePanel(){
  const choice=humanChoice(state,pending);
  if(!choice){resolvePending();return;}
  const body=show(choice.title,'capture',true,'hand');
  body.append(node('p','낼 패는 정해졌습니다. 가져올 패를 선택하세요.','quiet'));
  const stack=node('div','','dialog-stack');let first;
  for(const id of choice.candidateIds){
    const b=button(shortName(id,true),()=>{
      if(!pending)return;
      pending[choice.stage==='played'?'playedMatchId':'drawnMatchId']=id;save();
      // Keep the committed choice open until both captures are resolved.
      choicePanel();
    });stack.append(b);first??=b;
  }
  body.append(stack);panelFocus(first);
}
function resolvePending(){
  try{const before=state,move=pending;const result=execute(state,'human',move);pending=null;commit(before,result,'human');close();drive();}
  catch(error){pending=null;busy=false;save();errorPanel(error);}
}
function beginAction(move,index=lastSlot){
  if(!ownTurn())return;
  lastSlot=index;busy=true;pending={...move};save();render();
  try{choicePanel();}catch(error){pending=null;busy=false;save();errorPanel(error);}
}
function commit(before,result,player){
  if(!engine.isValidGameState(result.state))throw Error('패 상태 확인에 실패했습니다.');
  state=result.state;slots=syncSlots(slots,state,lastSlot);
  if(player==='human'&&!before.humanCaptured.includes('m09-01')&&state.humanCaptured.includes('m09-01'))gookjinNeeded=true;
  summaries.push(turnSummary(before,result,player));sound.action(result,player);render();save();
}
function goStopPanel(){
  const total=score(state,'human').total;
  const body=show(`${total}점, 고 또는 스톱`,'go-stop',true,'hand');
  body.append(node('p',`${state.humanGoCount}고. 고는 계속, 스톱은 이번 판을 끝냅니다.`,'quiet'));
  const actions=node('div','','dialog-actions');
  actions.append(button('고!',()=>{
    const before=state;state=engine.chooseGo(state,'human');summaries.push('나 고.');sound.action({decision:'go'},'human');close();save();drive();
  },true));
  const stop=button('스톱!',()=>{state=engine.chooseStop(state,'human');sound.action({decision:'stop'},'human');close();save();drive();});actions.append(stop);body.append(actions);panelFocus(stop);
}
function chongtongPanel(){
  const body=show(`${state.chongtongMonth}월 총통`,'chongtong',true,'hand');
  body.append(node('p','스톱하면 기본 7점으로 승리합니다. 계속하면 네 장을 공개하고 진행합니다.'));
  const actions=node('div','','dialog-actions');
  actions.append(button('계속',()=>{state=engine.chooseChongtong(state,'human','continue');close();save();drive();}));
  const stop=button('총통 스톱',()=>{state=engine.chooseChongtong(state,'human','stop');sound.voice('player-chongtong');close();save();drive();},true);actions.append(stop);body.append(actions);panelFocus(stop);
}
function gookjinPanel(){
  const body=show('9월 국진, 계산 방식','gookjin',true,'hand');
  body.append(node('p','열끗 또는 쌍피 중 하나로 계산합니다. 내 현황에서도 바꿀 수 있습니다.','quiet'));
  const actions=node('div','','dialog-actions');
  for(const [text,mode] of [['열끗',false],['쌍피',true]])actions.append(button(text,()=>{state=engine.setGookjinChoice(state,'human',mode);gookjinNeeded=false;close();save();drive();}));
  body.append(actions);panelFocus(actions.firstChild);
}
function drive(){
  clearTimeout(aiTimer);render();save();if(!started)return;
  if(pending){busy=true;choicePanel();return;}
  if(gookjinNeeded){busy=true;gookjinPanel();return;}
  if(state.phase==='round-ended'){
    busy=false;render();
    if(!endShown){sound.effect(state.roundResult==='nagari'?'nagari':state.winner==='human'?'win':'lose');resultPanel();}
    return;
  }
  if(state.pendingDecision==='human'){
    busy=true;render();if(state.phase==='awaiting-chongtong')chongtongPanel();else goStopPanel();return;
  }
  if(state.currentPlayer==='computer'||state.pendingDecision==='computer'){
    busy=true;render();
    aiTimer=setTimeout(()=>{
      try{const before=structuredClone(state);const result=computerStep(state);commit(before,result,'computer');drive();}
      catch(error){busy=false;errorPanel(error);}
    },350);return;
  }
  busy=false;render();
  const previous=(summaries.length?summaries.slice(-2).join(' '):message).replace(/(?:\s*(?:내 차례\.|특수에서 패 뒤집기\.))+$/,'');
  const text=previous+' '+(state.humanHand.length?'내 차례.':'특수에서 패 뒤집기.');
  summaries=[];announce(text);save();focusHand();
}
function errorPanel(error){
  const body=show('진행 확인','error',false,'menu');body.append(node('p',String(error.message??error)));
  body.append(button('현재 판 다시 확인',()=>{close();drive();}));body.append(button('새 판 시작',()=>{close();fresh();}));panelFocus();
}
function capturedPanel(player){
  if(!state)return;
  const human=player==='human',s=score(state,player),ids=human?state.humanCaptured:state.computerCaptured;
  const body=show(`${human?'내':'상대'} 현황 · ${s.total}점`,'info',false,human?'mine':'theirs');
  body.append(node('p',`광 ${s.brightCount}장 · 열끗 ${s.animalCount}장 · 띠 ${s.ribbonCount}장 · 피 ${s.junkCount}장`));
  body.append(node('p',`${human?state.humanGoCount:state.computerGoCount}고 · 손패 ${human?state.humanHand.length:state.computerHand.length}장`,'quiet'));
  if(s.lines.length)body.append(node('p',s.lines.map(line=>`${line.label} ${line.points}점`).join(' · ')));
  for(const [label,filter] of [['광',c=>c.type==='bright'],['열끗',c=>c.type==='animal'&&!(c.id==='m09-01'&&s.gookjinAsDoubleJunk)],['띠',c=>c.type==='ribbon'],['피',c=>['junk','doubleJunk'].includes(c.type)||(c.id==='m09-01'&&s.gookjinAsDoubleJunk)]]){
    const group=ids.filter(id=>filter(getCard(id)));if(group.length){body.append(node('h3',label));cardList(group,body);}
  }
  const canChange=human&&ids.includes('m09-01')&&ownTurn();
  if(canChange)body.append(button(`국진을 ${state.humanGookjinAsDoubleJunk?'열끗':'쌍피'}로 변경`,()=>{
    state=engine.setGookjinChoice(state,'human',!state.humanGookjinAsDoubleJunk);close();save();drive();
  }));
  if(state.mission){body.append(node('h3','이번 판 미션'));cardList(state.mission.cardIds,body);body.append(node('p',`획득 ${state.mission.cardIds.filter(id=>ids.includes(id)).length}장 · 미션 배수 ${2**state.mission.cardIds.filter(id=>ids.includes(id)).length}배`,'quiet'));}
  panelFocus();
}
function specialPanel(){
  if(!state)return;if(state.phase==='round-ended'){resultPanel();return;}
  const body=show('특수 행동','special',false,'special');
  const stack=node('div','','dialog-stack');
  if(ownTurn()){
    if(state.humanBombSkips>0)stack.append(button(`손패 없이 뒤집기 · ${state.humanBombSkips}회 남음`,()=>{close();beginAction({kind:'flip-only'});},true));
    for(const b of findBombOptions(state.humanHand,state.floorCards))stack.append(button(`${b.month}월 ${b.kind==='two-card-bomb'?'두장폭탄':b.kind==='four-card-bomb'?'4장 폭탄':'폭탄'}`,()=>{close();beginAction({kind:'bomb',month:b.month});}));
    if(!state.humanPendingShakeMonth)for(const b of findShakeOptions(state.humanHand,state.floorCards,state.humanShakenMonths))stack.append(button(`${b.month}월 흔들기`,()=>{
      state=engine.declareShake(state,'human',b.month);sound.voice('shake');message=`${b.month}월 흔들기. 같은 월 패를 내세요.`;close();save();drive();
    }));
  }
  if(!stack.childNodes.length)body.append(node('p','지금 사용할 특수 행동이 없습니다.'));
  body.append(stack);panelFocus();
}
function rulesPanel(){
  const body=show('게임 방법','rules',false,'menu');
  for(const text of [
    '내 손패에서 패를 찾아 두 번 탭하면 바로 냅니다. 확인창은 없습니다. 같은 월의 바닥패가 두 장이면 가져올 패를 고릅니다.',
    '첫 판은 무작위 선, 다음 판은 승자가 선입니다. 손패 각 10장, 바닥 일반 패 8장, 보너스 포함 50장을 사용합니다.',
    '7점 이상이면 고 또는 스톱. 고 이후에는 점수가 올라야 다시 선택합니다. 모든 차례가 끝나면 자동 스톱 또는 나가리입니다.',
    '손패는 월순으로 처음 배치하고 낸 자리를 비워 둡니다. 보너스패를 내면 그 자리에 새 패를 받습니다. 손패를 훑는 것만으로는 내지 않습니다.',
    '바닥은 1~12월의 고정 위치입니다. 해당 월을 실행하면 패 종류를 확인할 수 있습니다. 상대 손패와 더미의 미공개 패는 읽지 않습니다.',
    '광: 비삼광 2점, 삼광 3점, 사광 4점, 오광 15점. 열끗·띠는 5장부터 1점, 피는 10장부터 1점. 고도리 5점, 홍단·청단·초단 각 3점.',
    '쪽·따닥·싹쓸이·뻑·폭탄·흔들기·총통·박·미션·나가리 이월을 적용합니다. 자세한 조건과 변경점은 RULES.md에 있습니다.',
    '한국어 선언은 Supertonic 3으로 생성된 AI 합성음성입니다. 효과음과 음성을 줄이거나 끄려면 메뉴를 이용하세요. VoiceOver의 실제 발화 상태를 자동 감지하지 않습니다.'
  ])body.append(node('p',text));
  const link=node('a','자세한 규칙 문서');link.href='RULES.md';link.target='_blank';link.rel='noopener';body.append(link);panelFocus();
}
function menuPanel(){
  const body=show('메뉴','menu',false,'menu');
  const stack=node('div','','dialog-stack');
  stack.append(button('새 판 시작',()=>{
    const b=show('현재 판을 끝내고 새로 시작할까요?','confirm',false,'menu');b.append(node('p','진행 중인 판은 사라집니다.'));
    const actions=node('div','','dialog-actions');actions.append(button('계속하기',menuPanel),button('새 판',()=>{close();fresh();},true));b.append(actions);panelFocus(actions.firstChild);
  }));
  stack.append(button('게임 방법',rulesPanel));body.append(stack);
  const difficulty=node('label','','setting');difficulty.append(node('span','새 판의 상대 난이도'));
  const select=node('select');for(const [value,label] of [['easy','쉬움'],['normal','보통'],['hard','어려움'],['expert','매우 어려움']]){const option=node('option',label);option.value=value;select.append(option);}select.value=settings.difficulty;
  select.onchange=()=>{settings.difficulty=select.value;save();};difficulty.append(select);body.append(difficulty);
  for(const [key,label] of [['muted','모든 게임 소리 끄기'],['voices','고·스톱 및 특수 선언 음성']]){
    const wrap=node('label','','check'),input=node('input');input.type='checkbox';input.checked=settings[key];input.onchange=()=>{settings[key]=input.checked;sound.update();save();};wrap.append(input,node('span',label));body.append(wrap);
  }
  for(const [key,label] of [['effectVolume','효과음 음량'],['voiceVolume','선언 음성 음량']]){
    const wrap=node('label','','setting'),text=node('span',`${label} ${Math.round(settings[key]*100)}%`),input=node('input');input.type='range';input.min=0;input.max=100;input.step=1;input.value=Math.round(settings[key]*100);
    input.oninput=()=>{settings[key]=Number(input.value)/100;text.textContent=`${label} ${input.value}%`;sound.update();save();};wrap.append(text,input);body.append(wrap);
  }
  body.append(node('h3','음원·카드 출처'));
  body.append(node('p','규칙 엔진: itsent-lab/hwatu (NSJ, MIT). 화투 SVG: Spenĉjo / Marcus Richert / Louie Mantia, CC BY-SA 4.0. 효과음: Freesound·Kenney CC0. 음성: Supertonic 3 AI 생성.','quiet'));
  for(const [name,url] of [['자세한 출처','CREDITS.md'],['음원 출처','audio/ATTRIBUTION.txt'],['카드 출처','cards/hwatu/ATTRIBUTION.txt']]){const p=node('p'),a=node('a',name);a.href=url;a.target='_blank';a.rel='noopener';p.append(a);body.append(p);}
  panelFocus();
}

for(let month=1;month<=12;month++){
  const b=button(`${month}월`,()=>{
    if(!state)return;const ids=state.floorCards.filter(id=>getCard(id).month===month);const body=show(`${month}월 바닥패`,'floor',false,`month-${month}`);
    if(ids.length)cardList(ids,body);else body.append(node('p','이 월의 바닥패가 없습니다.'));panelFocus();
  });b.id=`month-${month}`;b.className='floor-month';floorButtons.push(b);$('floor').append(b);
}
for(let i=0;i<10;i++){
  const b=button('',()=>{if(slots[i])beginAction({kind:'card',cardId:slots[i]},i);});b.className='hand-card empty';b.disabled=true;b.id=`slot-${i}`;handButtons.push(b);$('hand').append(b);
}
$('panel-close').onclick=close;
$('panel').addEventListener('cancel',event=>{if(required){event.preventDefault();$('panel-live').textContent='선택을 완료해 주세요.';}});
$('panel').addEventListener('close',()=>{
  if($('panel').open)return;
  if(returnFocus==='hand')focusHand();else $(returnFocus)?.focus({preventScroll:true});
  if(started&&state&&!busy&&(state.currentPlayer==='computer'||state.pendingDecision==='computer'))drive();
});
$('menu').onclick=menuPanel;$('mine').onclick=()=>capturedPanel('human');$('theirs').onclick=()=>capturedPanel('computer');$('special').onclick=specialPanel;$('repeat').onclick=()=>announce(message);
document.addEventListener('click',()=>sound.unlock(),{capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
window.addEventListener('pagehide',save);
const resumed=restore();render();
const entry=show('소리 맞고','entry',true,'hand');
entry.append(node('p',resumed?'저장된 판을 이어갈 수 있습니다.':'컴퓨터와 1대1. 손패는 아래, 안내는 짧게.'));
entry.append(node('p','VoiceOver: 패를 찾아 두 번 탭하면 바로 냅니다. 손가락으로 훑는 동안에는 입력되지 않습니다.','quiet'));
const startButton=button(resumed?'이어하기':'게임 시작',start,true);entry.append(startButton);entry.append(node('p','선언 음성은 AI 합성음성입니다. 소리는 메뉴에서 조절할 수 있습니다.','quiet'));panelFocus(startButton);
