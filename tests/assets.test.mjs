import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createMatgoDeck} from '../engine/deck.js';
import {getCard} from '../engine/cards.js';

test('every card image and every audio path used by the app is packaged',async()=>{
  const paths=['audio/card-deal.mp3','audio/card-slide.mp3','audio/card-contact.mp3'];
  const events=['ppeok','ppeok-capture','self-ppeok','jjok','ttadak','sweep','bomb'];
  for(const name of ['start','win','lose','nagari',...events])paths.push(`audio/effects/${name}.wav`);
  for(const name of ['matgo-female-go','matgo-female-stop','opponent-go','opponent-stop','shake','player-chongtong'])paths.push(`audio/voices/${name}.wav`);
  for(const player of ['human','computer'])for(const event of events){
    const prefix=player==='human'&&['ppeok','ppeok-capture','self-ppeok','sweep'].includes(event)?'matgo-female':player==='human'?'player':'opponent';
    paths.push(`audio/voices/${prefix}-${event}.wav`);
  }
  for(const id of createMatgoDeck())if(getCard(id).month)paths.push(`cards/hwatu/${id}.svg`);
  for(const path of paths){
    const bytes=await readFile(new URL('../'+path,import.meta.url));assert(bytes.length>100,path);
    if(path.endsWith('.wav')){assert.equal(bytes.toString('ascii',0,4),'RIFF',path);assert.equal(bytes.toString('ascii',8,12),'WAVE',path);}
    if(path.endsWith('.svg'))assert.match(bytes.toString(),/<svg\b/,path);
  }
});
