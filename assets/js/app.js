
(()=>{
const $=(s)=>document.querySelector(s);
const $$=(s)=>Array.from(document.querySelectorAll(s));
const QUESTIONS=(window.ROY_CHASE_QUESTIONS||[]).slice();

function randInt(max){if(max<=0) return 0; const c=window.crypto; if(c&&c.getRandomValues){const u=new Uint32Array(1); const limit=Math.floor(0x100000000/max)*max; let x; do{c.getRandomValues(u); x=u[0];}while(x>=limit); return x%max;} return Math.floor(Math.random()*max);} 
function shuffleInPlace(a){for(let i=a.length-1;i>0;i--){const j=randInt(i+1); [a[i],a[j]]=[a[j],a[i]];} return a;}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// --- WebAudio (beeps + fallback fanfare) ---
let audioCtx=null, masterGain=null;
async function ensureAudio(){const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false; if(!audioCtx){audioCtx=new AC(); masterGain=audioCtx.createGain(); masterGain.gain.value=0.22; masterGain.connect(audioCtx.destination);} if(audioCtx.state==='suspended'){try{await audioCtx.resume();}catch(e){return false;}} return true;}
function playToneSequence(tones){if(!state.sound) return false; if(!audioCtx||!masterGain) return false; try{const now=audioCtx.currentTime; tones.forEach((t,idx)=>{const start=now+(t.at??idx*0.1); const dur=t.dur??0.1; const osc=audioCtx.createOscillator(); const g=audioCtx.createGain(); osc.type=t.type||'sine'; osc.frequency.setValueAtTime(t.freq,start); g.gain.setValueAtTime(0.0001,start); g.gain.exponentialRampToValueAtTime(t.vol??0.18,start+0.02); g.gain.exponentialRampToValueAtTime(0.0001,start+dur); osc.connect(g); g.connect(masterGain); osc.start(start); osc.stop(start+dur+0.05);}); return true;}catch(e){return false;}}
const sfxCorrect=()=>playToneSequence([{freq:660,dur:0.10,vol:0.18},{freq:880,at:0.11,dur:0.12,vol:0.20}]);
const sfxFanfareSynth=()=>playToneSequence([{freq:523,dur:0.12,vol:0.20},{freq:659,at:0.12,dur:0.12,vol:0.20},{freq:784,at:0.24,dur:0.15,vol:0.22},{freq:1046,at:0.42,dur:0.26,vol:0.24}]);

// --- File-based audio (for real host voice lines) ---
function tryPlayFile(src, volume=1.0){
  return new Promise((resolve)=>{
    try{
      const a=new Audio(src);
      a.volume=volume;
      a.onended=()=>resolve(true);
      a.onerror=()=>resolve(false);
      const p=a.play();
      if(p && typeof p.catch==='function') p.catch(()=>resolve(false));
    }catch(e){ resolve(false); }
  });
}

const HOST_NAMES=['Bramley Waffle','Bradley Wallets','Bradley Squash','Badly Walsh','Bramley Wash'];
const HOST_LINES={
  bad:["{name}, that score was so low it needs a ladder to reach the offers!","{name}, I've seen a sleepy goldfish answer faster than that…","{name}, don't panic — the questions were clearly 'expert mode'.","{name}, that was… brave. Not fast, but brave!"],
  average:["{name}, not bad! That's enough to give the Chaser a wobble.","{name}, solid effort — like a cuppa: not fancy, but it does the job!","{name}, decent score! The Chaser will be watching you.","{name}, you've got something to play with — keep it tidy!"],
  good:["{name}! Lovely stuff — you're flying.","{name}, that's a proper score. The Chaser's pacing already.","{name}, now we're cooking!","{name}, great work — the Chaser won't like that."],
  great:["{name}! WOW — that score needs its own postcode!","{name}, absolutely sensational — you've put the fear in the Chaser!","{name}, are you secretly a quiz machine?","{name}, incredible!"],
};

function pickHostName(){return HOST_NAMES[randInt(HOST_NAMES.length)];}
function bandForScore(score){ if(score<=2) return 'bad'; if(score<=6) return 'average'; if(score<=10) return 'good'; return 'great'; }

function hostTextFor(score, playerName){
  const band=bandForScore(score);
  const pool=HOST_LINES[band];
  const base=pool[randInt(pool.length)].replaceAll('{name}', playerName);
  if(playerName.toLowerCase().includes('roy')) return base+" And remember, Roy… this is The Chase, not The Stroll!";
  return base;
}

// Audio file pools (you create these with your chosen TTS voice)
const HOST_AUDIO={
  intro:['assets/audio/host/intro_01.mp3'],
  fanfare:['assets/audio/host/fanfare.mp3'],
  bad:['assets/audio/host/bad_01.mp3','assets/audio/host/bad_02.mp3'],
  average:['assets/audio/host/avg_01.mp3','assets/audio/host/avg_02.mp3'],
  good:['assets/audio/host/good_01.mp3','assets/audio/host/good_02.mp3'],
  great:['assets/audio/host/great_01.mp3','assets/audio/host/great_02.mp3'],
};

async function playHostLine(band){
  const arr=(HOST_AUDIO[band]||[]).slice();
  shuffleInPlace(arr);
  for(const src of arr){
    const ok = await tryPlayFile(src, 1.0);
    if(ok) return true;
  }
  return false;
}

async function playFanfare(){
  const ok = await tryPlayFile('assets/audio/host/fanfare.mp3', 0.9);
  if(ok) return true;
  return sfxFanfareSynth();
}

async function playIntro(){
  await tryPlayFile('assets/audio/host/intro_01.mp3', 1.0);
}

// Chasers
const CHASERS=[
  { name:'The Beast', joke:'The Feast', accuracy:0.72 },
  { name:'The Governess', joke:'The Cleverness', accuracy:0.74 },
  { name:'The Dark Destroyer', joke:'The Quiz-Connector', accuracy:0.73 },
  { name:'The Sinnerman', joke:'The Cinnamon', accuracy:0.70 },
  { name:'The Vixen', joke:'The Fixer', accuracy:0.71 },
  { name:'The Menace', joke:'The Brain Menace', accuracy:0.73 }
];

function makeDeck(filterFn){const pool=QUESTIONS.filter(filterFn); const deck=shuffleInPlace(pool.slice()); let idx=0; return {next(used){if(deck.length===0) return null; let tries=0; while(tries<deck.length){if(idx>=deck.length){shuffleInPlace(deck); idx=0;} const q=deck[idx++]; if(!used||!used.has(q.id)) return q; tries++;} shuffleInPlace(deck); idx=0; return deck[idx++];}};}

const state={
  playerName:'Roy',
  sound:true,
  hostName:'',
  lastHostText:'',
  used:new Set(),
  builderDeck:null,
  chaseDeck:null,
  builder:{seconds:60, remaining:60, correct:0, current:null, locked:false, timer:null},
  chase:{offer:0, stepsToHome:7, lead:3, playerPos:3, chaserPos:0, current:null, locked:false, chaser:null}
};

function savePrefs(){localStorage.setItem('royChasePrefs', JSON.stringify({playerName:state.playerName, sound:state.sound}));}
function loadPrefs(){try{const p=JSON.parse(localStorage.getItem('royChasePrefs')||'{}'); if(p.playerName) state.playerName=String(p.playerName); if(typeof p.sound==='boolean') state.sound=p.sound;}catch(e){}}

function setScreen(name){$$('[data-screen]').forEach(el=>el.classList.add('d-none')); const t=document.querySelector(`[data-screen="${name}"]`); if(t) t.classList.remove('d-none');}
function setPlayerName(n){state.playerName=(n||'Roy').trim()||'Roy'; $('#playerName').value=state.playerName; $('#welcomeName').textContent=state.playerName; savePrefs();}

function renderMoney(){const c=state.builder.correct; $('#builderTimer').textContent=`${state.builder.remaining}s`; $('#builderCorrect').textContent=String(c); $('#builderCash').textContent=`£${(c*1000).toLocaleString('en-GB')}`; $('#builderMoneyLabel').textContent=`£${(c*1000).toLocaleString('en-GB')}`;
  const container=$('#moneyLadder'); if(!container) return; const w=20; const offset=Math.max(0,c-w); container.innerHTML='';
  for(let i=1;i<=w;i++){const rungNumber=offset+i; const rung=document.createElement('div'); rung.className='rung'+(i%5===0?' big':''); if(rungNumber<c) rung.classList.add('filled'); if(rungNumber===c&&c>0) rung.classList.add('current'); container.appendChild(rung);} }

function nextBuilder(){const q=state.builderDeck.next(state.used); state.builder.current=q; if(q) state.used.add(q.id); state.builder.locked=false;}
function renderBuilder(){if(!state.builder.current) nextBuilder(); const q=state.builder.current; if(!q) return; renderMoney(); $('#questionText').textContent=q.q; const opts=shuffleInPlace(q.options.slice()); $$('#answers button').forEach((b,i)=>{b.disabled=false; b.classList.remove('btn-success','btn-danger'); b.dataset.value=opts[i]; b.querySelector('.optText').textContent=opts[i];});}

function startTimer(){clearInterval(state.builder.timer); state.builder.timer=setInterval(()=>{state.builder.remaining-=1; $('#builderTimer').textContent=`${state.builder.remaining}s`; if(state.builder.remaining<=0){clearInterval(state.builder.timer); finishBuilder();}},1000);} 

function answerBuilder(value,btn){if(state.builder.locked) return; state.builder.locked=true; const q=state.builder.current; const correct=value===q.a; if(correct){state.builder.correct+=1; btn.classList.add('btn-success'); sfxCorrect();} else btn.classList.add('btn-danger'); renderMoney(); setTimeout(()=>{nextBuilder(); renderBuilder();},450);} 

async function finishBuilder(){
  const cash=state.builder.correct*1000; const low=Math.max(1000, Math.round(cash*0.5/500)*500); const high=Math.max(2000, Math.round(cash*2/500)*500);
  const band=bandForScore(state.builder.correct);
  const line=hostTextFor(state.builder.correct, state.playerName);
  state.lastHostText=line;

  $('#builderSummary').innerHTML=`
    <div class="text-white-50">${state.playerName}, you scored <strong>${state.builder.correct}</strong> in the Cash Builder.</div>
    <div class="host-quote"><span class="name">${state.hostName}:</span> <span class="line">“${line}”</span></div>
    <div class="host-tools">
      <button id="hearHostBtn" class="btn btn-outline-light roy-btn px-3 py-2" type="button">🔊 Hear ${state.hostName}</button>
      <button id="testFanfareBtn" class="btn btn-outline-light roy-btn px-3 py-2" type="button">🎺 Fanfare</button>
    </div>
    <div id="voiceNote" class="host-note mt-2"></div>
  `;

  $('#offerLow').textContent=`£${low.toLocaleString('en-GB')}`; $('#offerMid').textContent=`£${cash.toLocaleString('en-GB')}`; $('#offerHigh').textContent=`£${high.toLocaleString('en-GB')}`;
  $('#offerLow').dataset.offer=String(low); $('#offerMid').dataset.offer=String(cash); $('#offerHigh').dataset.offer=String(high);

  setScreen('offers');

  // Try autoplay of fanfare + voice line (may be blocked); user buttons always work.
  const note=$('#voiceNote');
  await playFanfare();
  const voiceOk = await playHostLine(band);
  if(note) note.textContent = voiceOk ? '' : 'If you didn\'t hear the host, add MP3s under assets/audio/host and press “Hear”.';

  const hearBtn=document.getElementById('hearHostBtn');
  if(hearBtn){
    hearBtn.onclick=async ()=>{ await ensureAudio(); const ok=await playHostLine(band); if(note) note.textContent = ok ? '' : 'No host MP3 found (check filenames).'; };
  }
  const fanBtn=document.getElementById('testFanfareBtn');
  if(fanBtn){
    fanBtn.onclick=async ()=>{ await ensureAudio(); await playFanfare(); };
  }
}

function chooseOffer(kind){const low=Number($('#offerLow').dataset.offer); const mid=Number($('#offerMid').dataset.offer); const high=Number($('#offerHigh').dataset.offer);
  if(kind==='low'){state.chase.offer=low; state.chase.lead=4;} if(kind==='mid'){state.chase.offer=mid; state.chase.lead=3;} if(kind==='high'){state.chase.offer=high; state.chase.lead=2;}
  state.chase.playerPos=state.chase.lead; state.chase.chaserPos=0; $('#chosenOffer').textContent=`£${state.chase.offer.toLocaleString('en-GB')}`;
  setScreen('chase');
  renderChase();
}

function nextChase(){const q=state.chaseDeck.next(state.used); state.chase.current=q; if(q) state.used.add(q.id); state.chase.locked=false;}

function renderTrack(){const n=state.chase.stepsToHome; const p=clamp(state.chase.playerPos,0,n); const c=clamp(state.chase.chaserPos,0,n); const track=$('#track'); if(!track) return; track.innerHTML='';
  for(let i=0;i<=n;i++){const step=document.createElement('div'); step.className='vstep'; if(i===n) step.classList.add('finish');
    if(i===p && i===c) step.classList.add('both'); else if(i===p) step.classList.add('player'); else if(i===c) step.classList.add('chaser');
    step.textContent=(i===n)?'🏁 HOME':String(i);
    track.appendChild(step);
  }
  $('#posText').textContent=`You: ${p} • Chaser: ${c} • Home: ${n}`;
}

function renderChase(){if(!state.chase.current) nextChase(); const q=state.chase.current; if(!q) return; $('#chaseOfferValue').textContent=`£${state.chase.offer.toLocaleString('en-GB')}`; renderTrack(); $('#chaseQuestionText').textContent=q.q;
  const opts=shuffleInPlace(q.options.slice()); $$('#chaseAnswers button').forEach((b,i)=>{b.disabled=false; b.classList.remove('btn-success','btn-danger'); b.dataset.value=opts[i]; b.querySelector('.optText').textContent=opts[i];}); }

function answerChase(value, btn){if(state.chase.locked) return; state.chase.locked=true; const q=state.chase.current; const correct=value===q.a;
  if(correct){state.chase.playerPos+=1; btn.classList.add('btn-success'); sfxCorrect();} else btn.classList.add('btn-danger');
  const chance=clamp(state.chase.chaser.accuracy - (q.difficulty-1)*0.05, 0.45, 0.90);
  const chaserCorrect=(randInt(1000)/1000) < chance;
  if(chaserCorrect) state.chase.chaserPos+=1;
  renderTrack();
  if(state.chase.playerPos>=state.chase.stepsToHome){ endGame(true); return; }
  if(state.chase.chaserPos>=state.chase.playerPos){ endGame(false); return; }
  setTimeout(()=>{nextChase(); renderChase();}, 650);
}

function endGame(win){
  if(win){ $('#winnerTitle').textContent=`Winner, ${state.playerName}!`; $('#winnerSubtitle').textContent=`You take home £${state.chase.offer.toLocaleString('en-GB')} 🎉`; setScreen('winner'); }
  else { $('#resultTitle').textContent=`Caught! Unlucky, ${state.playerName}.`; $('#resultSubtitle').textContent='The Chaser caught you before home.'; setScreen('result'); }
}

async function startNewGame(){
  await ensureAudio();
  state.hostName=pickHostName();
  state.used=new Set();
  state.builderDeck=makeDeck(q=>q.difficulty<=3);
  state.chaseDeck=makeDeck(q=>q.difficulty<=3);
  state.builder.remaining=state.builder.seconds; state.builder.correct=0; state.builder.current=null; state.builder.locked=false;
  state.chase.chaser=shuffleInPlace(CHASERS.slice())[0];
  state.chase.offer=0; state.chase.stepsToHome=7; state.chase.lead=3; state.chase.playerPos=3; state.chase.chaserPos=0; state.chase.current=null; state.chase.locked=false;
  $('#chaserName').textContent = `${state.chase.chaser.name} (aka “${state.chase.chaser.joke}”)`;
  await playIntro();
  setScreen('builder');
  renderBuilder();
  startTimer();
}

function wire(){
  $('#startBtn').addEventListener('click', startNewGame);
  $('#playerName').addEventListener('change', e=>setPlayerName(e.target.value));
  $('#toggleSound').addEventListener('change', async e=>{state.sound=e.target.checked; savePrefs(); if(state.sound) await ensureAudio();});
  $$('#answers button').forEach(btn=>btn.addEventListener('click', ()=>answerBuilder(btn.dataset.value, btn)));
  $('#offerLowBtn').addEventListener('click', ()=>chooseOffer('low'));
  $('#offerMidBtn').addEventListener('click', ()=>chooseOffer('mid'));
  $('#offerHighBtn').addEventListener('click', ()=>chooseOffer('high'));
  $$('#chaseAnswers button').forEach(btn=>btn.addEventListener('click', ()=>answerChase(btn.dataset.value, btn)));
  $('#playAgain2').addEventListener('click', ()=>setScreen('home'));
  $('#playAgain').addEventListener('click', ()=>setScreen('home'));
}

function init(){loadPrefs(); setPlayerName(state.playerName); setScreen('home'); wire();}

document.addEventListener('DOMContentLoaded', init);
})();
