// Own implementation. Original file assets and attribution are in audio/.
export function createSound(settings){
  let context=null,effects=null,voices=null,voiceSource=null,voiceToken=0;
  const buffers=new Map();
  function unlock(){
    try{if(!context){context=new (window.AudioContext||window.webkitAudioContext)();effects=context.createGain();voices=context.createGain();effects.connect(context.destination);voices.connect(context.destination);update();}if(context.state==='suspended')context.resume().catch(()=>{});}catch{}
  }
  function update(){if(!context)return;effects.gain.value=settings.muted?0:settings.effectVolume;voices.gain.value=settings.muted||!settings.voices?0:settings.voiceVolume;}
  async function buffer(path){
    if(!context)return null;
    if(!buffers.has(path))buffers.set(path,fetch(path).then(r=>{if(!r.ok)throw Error(path);return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).catch(()=>null));
    return buffers.get(path);
  }
  async function play(path,bus,delay=0){
    if(!context||settings.muted)return;
    const b=await buffer(path);if(!b)return;
    const source=context.createBufferSource();source.buffer=b;source.connect(bus);source.start(context.currentTime+delay);return source;
  }
  function effect(name,delay=0){
    const path=name.includes('/')?name:`audio/effects/${name}.wav`;
    return play(path,effects,delay).catch(()=>{});
  }
  async function voice(name){
    if(!context||settings.muted||!settings.voices)return;
    const token=++voiceToken;
    const b=await buffer(`audio/voices/${name}.wav`);if(!b||token!==voiceToken)return;
    try{voiceSource?.stop();}catch{}
    const source=context.createBufferSource();voiceSource=source;source.buffer=b;source.connect(voices);
    effects.gain.cancelScheduledValues(context.currentTime);effects.gain.setTargetAtTime(settings.effectVolume*.35,context.currentTime,.015);
    source.onended=()=>{if(token===voiceToken)update();};source.start();
  }
  function action(result,player){
    if(result.decision){
      const d=result.decision;
      if(d==='go'||d==='stop')voice(`${player==='human'?'matgo-female':'opponent'}-${d}`).catch(()=>{});
      else if(d==='shake')voice('shake').catch(()=>{});
      return;
    }
    if(result.playedCardId)effect('audio/card-deal.mp3');
    if(result.drawnCardId)effect('audio/card-slide.mp3',.09);
    if(result.captured?.length&&!result.ppeok)effect('audio/card-contact.mp3',.16);
    const event=result.specialEvents?.[0];
    if(event){
      effect(event.kind,.12);
      const prefix=player==='human'?'player':'opponent';
      const female=player==='human'&&['ppeok','ppeok-capture','self-ppeok','sweep'].includes(event.kind);
      voice(`${female?'matgo-female':prefix}-${event.kind}`).catch(()=>{});
    }
  }
  return {unlock,update,effect,voice,action};
}
