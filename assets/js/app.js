
(()=>{
const $=(s)=>document.querySelector(s);
const $$=(s)=>Array.from(document.querySelectorAll(s));
const QUESTIONS=(window.ROY_CHASE_QUESTIONS||[]).slice();

function randInt(max){if(max<=0) return 0; const c=window.crypto; if(c&&c.getRandomValues){const u=new Uint32Array(1); const limit=Math.floor(0x100000000/max)*max; let x; do{c.getRandomValues(u); x=u[0];}while(x>=limit); return x%max;} return Math.floor(Math.random()*max);} 
function shuffleInPlace(a){for(let i=a.length-1;i>0;i--){const j=randInt(i+1); [a[i],a[j]]=[a[j],a[i]];} return a;}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// WebAudio
let audioCtx=null, masterGain=null;
async function ensureAudio(){const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false; if(!audioCtx){audioCtx=new AC(); masterGain=audioCtx.createGain(); masterGain.gain.value=0.22; masterGain.connect(audioCtx.destination);} if(audioCtx.state==='suspended'){try{await audioCtx.resume();}catch(e){return false;}} return true;}
function playToneSequence(tones){if(!state.sound) return false; if(!audioCtx||!masterGain) return false; try{const now=audioCtx.currentTime; tones.forEach((t,idx)=>{const start=now+(t.at??idx*0.1); const dur=t.dur??0.1; const osc=audioCtx.createOscillator(); const g=audioCtx.createGain(); osc.type=t.type||'sine'; osc.frequency.setValueAtTime(t.freq,start); g.gain.setValueAtTime(0.0001,start); g.gain.exponentialRampToValueAtTime(t.vol??0.18,start+0.02); g.gain.exponentialRampToValueAtTime(0.0001,start+dur); osc.connect(g); g.connect(masterGain); osc.start(start); osc.stop(start+dur+0.05);}); return true;}catch(e){return false;}}
const sfxCorrect=()=>playToneSequence([{freq:660,dur:0.10,vol:0.18},{freq:880,at:0.11,dur:0.12,vol:0.20}]);
const sfxFanfare=()=>playToneSequence([{freq:523,dur:0.12,vol:0.20},{freq:659,at:0.12,dur:0.12,vol:0.20},{freq:784,at:0.24,dur:0.15,vol:0.22},{freq:1046,at:0.42,dur:0.26,vol:0.24}]);

// Speech synthesis
let voicesCache=[];
function refreshVoices(){try{voicesCache=window.speechSynthesis?window.speechSynthesis.getVoices():[];}catch(e){voicesCache=[];}}
function pickVoice(){refreshVoices(); const gb=voicesCache.find(v=>(v.lang||'').toLowerCase().startsWith('en-gb')); if(gb) return gb; const en=voicesCache.find(v=>(v.lang||'').toLowerCase().startsWith('en')); return en||null;}
function speak(text){if(!state.sound) return false; if(!window.speechSynthesis||!window.SpeechSynthesisUtterance) return false; try{window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); const v=pickVoice(); if(v) u.voice=v; u.lang=(v&&v.lang)?v.lang:'en-GB'; u.rate=1.0; u.pitch=1.0; u.volume=1.0; window.speechSynthesis.speak(u); return true;}catch(e){return false;}}

// Host
const HOST_NAMES=['Bradley Squash','Bradley Wallets','Bradley Waffle','Bramley Wash','Badly Walsh'];
const HOST_LINES={
  bad:["{name}, that score was so low it needs a ladder to reach the offers!","{name}, I've seen a sleepy goldfish answer faster than that…","{name}, don't panic — the questions were clearly 'expert mode'.","{name}, that was… brave. Not fast, but brave!"],
  average:["{name}, not bad! That's enough to give the Chaser a wobble.","{name}, solid effort — like a cuppa: not fancy, but it does the job!","{name}, decent score! The Chaser will be watching you.","{name}, you've got something to play with — keep it tidy!"],
  good:["{name}! Lovely stuff — you're flying.","{name}, that's a proper score. The Chaser's pacing already.","{name}, now we're cooking!","{name}, great work — the Chaser won't like that."],
  great:["{name}! WOW — that score needs its own postcode!","{name}, absolutely sensational — you've put the fear in the Chaser!","{name}, are you secretly a quiz machine?","{name}, incredible!"],
};
function pickHostName(){return HOST_NAMES[randInt(HOST_NAMES.length)];}
function hostLineFor(score,name){let pool; if(score<=2) pool=HOST_LINES.bad; else if(score<=6) pool=HOST_LINES.average; else if(score<=10) pool=HOST_LINES.good; else pool=HOST_LINES.great; const base=pool[randInt(pool.length)].replaceAll('{name}',name);
  if(name.toLowerCase().includes('roy')) return base+" And remember, Roy… this is The Chase, not The Stroll!";
  return base;
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
  hostName:'Bradley Squash',
  lastHostSpoken:'',
  used:new Set(),
  builderDeck:null,
  chaseDeck:null,
  builder:{seconds:60, remaining:60, correct:0, current:null, locked:false, timer:null},
  chase:{offer:0, stepsToHome:7, lead:3, playerPos:3, chaserPos:0, current:null, locked:false, chaser:null}
};

function savePrefs(){localStorage.setItem('royChasePrefs', JSON.stringify({playerName:state.playerName, sound:state.sound}));}
function loadPrefs(){try{const p=JSON.parse(localStorage.getItem('royChasePrefs')||'{}'); if(p.playerName) state.playerName=String(p.playerName); if(typeof p.sound==='boolean') state.sound=p.sound;}catch(e){}}

function updateStatus(){const voiceAvail=!!(window.speechSynthesis&&window.SpeechSynthesisUtterance); refreshVoices(); const voicesCount=voicesCache.length; const audioAvail=!!(window.AudioContext||window.webkitAudioContext);
  const el=$('#voiceStatus');
  if(!el) return;
  el.innerHTML=`<span class="status-pill">Voice: <b>${voiceAvail?'Yes':'No'}</b> (voices: <b>${voicesCount}</b>)</span><span class="status-pill">Audio: <b>${audioAvail?'Yes':'No'}</b></span>`;
}

function setScreen(name){$$('[data-screen]').forEach(el=>el.classList.add('d-none')); const t=document.querySelector(`[data-screen="${name}"]`); if(t) t.classList.remove('d-none');}
function setPlayerName(n){state.playerName=(n||'Roy').trim()||'Roy'; $('#playerName').value=state.playerName; $('#welcomeName').textContent=state.playerName; savePrefs();}

function renderMoney(){const c=state.builder.correct; $('#builderTimer').textContent=`${state.builder.remaining}s`; $('#builderCorrect').textContent=String(c); $('#builderCash').textContent=`£${(c*1000).toLocaleString('en-GB')}`; $('#builderMoneyLabel').textContent=`£${(c*1000).toLocaleString('en-GB')}`;
  const container=$('#moneyLadder');
  if(!container) return;
  const w=20; const offset=Math.max(0, c-w);
  container.innerHTML='';
  for(let i=1;i<=w;i++){const rungNumber=offset+i; const rung=document.createElement('div'); rung.className='rung'+(i%5===0?' big':''); if(rungNumber<c) rung.classList.add('filled'); if(rungNumber===c&&c>0) rung.classList.add('current'); container.appendChild(rung);} }

function nextBuilder(){const q=state.builderDeck.next(state.used); state.builder.current=q; if(q) state.used.add(q.id); state.builder.locked=false;}
function renderBuilder(){if(!state.builder.current) nextBuilder(); const q=state.builder.current; if(!q) return; renderMoney(); $('#questionText').textContent=q.q; const opts=shuffleInPlace(q.options.slice()); $$('#answers button').forEach((b,i)=>{b.disabled=false; b.classList.remove('btn-success','btn-danger'); b.dataset.value=opts[i]; b.querySelector('.optText').textContent=opts[i];});}

function startTimer(){clearInterval(state.builder.timer); state.builder.timer=setInterval(()=>{state.builder.remaining-=1; $('#builderTimer').textContent=`${state.builder.remaining}s`; if(state.builder.remaining<=0){clearInterval(state.builder.timer); finishBuilder();}},1000);} 

function answerBuilder(value,btn){if(state.builder.locked) return; state.builder.locked=true; const q=state.builder.current; const correct=value===q.a; if(correct){state.builder.correct+=1; btn.classList.add('btn-success'); sfxCorrect();} else btn.classList.add('btn-danger'); renderMoney(); setTimeout(()=>{nextBuilder(); renderBuilder();},450);} 

function finishBuilder(){const cash=state.builder.correct*1000; const low=Math.max(1000, Math.round(cash*0.5/500)*500); const high=Math.max(2000, Math.round(cash*2/500)*500);
  const line=hostLineFor(state.builder.correct, state.playerName);
  state.lastHostSpoken=`${state.hostName} says: ${line}`;

  $('#builderSummary').innerHTML=`<div class="text-white-50">${state.playerName}, you scored <strong>${state.builder.correct}</strong> in the Cash Builder.</div><div class="host-quote"><span class="name">${state.hostName}:</span> <span class="line">“${line}”</span></div><div class="host-tools"><button id="hearHostBtn" class="btn btn-outline-light roy-btn px-3 py-2" type="button">🔊 Hear ${state.hostName}</button><button id="testAudioBtn" class="btn btn-outline-light roy-btn px-3 py-2" type="button">🎺 Test fanfare</button></div><div id="voiceNote" class="host-note mt-2"></div>`;
  $('#offerLow').textContent=`£${low.toLocaleString('en-GB')}`; $('#offerMid').textContent=`£${cash.toLocaleString('en-GB')}`; $('#offerHigh').textContent=`£${high.toLocaleString('en-GB')}`;
  $('#offerLow').dataset.offer=String(low); $('#offerMid').dataset.offer=String(cash); $('#offerHigh').dataset.offer=String(high);

  setScreen('offers');
  const audioOk=sfxFanfare(); const voiceOk=speak(state.lastHostSpoken);
  const note=$('#voiceNote'); if(note) note.textContent=(!audioOk||!voiceOk)?'Autoplay may be blocked. Press “Hear” / “Test fanfare”.':'Nice! If you didn\'t hear it, press “Hear”.';
  const hearBtn=document.getElementById('hearHostBtn'); if(hearBtn) hearBtn.onclick=async()=>{await ensureAudio(); const ok=speak(state.lastHostSpoken); if(note) note.textContent=ok?'':'Voice not available.';};
  const testBtn=document.getElementById('testAudioBtn'); if(testBtn) testBtn.onclick=async()=>{await ensureAudio(); const ok=sfxFanfare(); if(note) note.textContent=ok?'':'Audio not available.';};
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

async function startNewGame(){await ensureAudio(); refreshVoices(); state.hostName=pickHostName(); updateStatus();
  // prove voice immediately
  speak(`${state.hostName} here. Good luck, ${state.playerName}!`);
  state.used=new Set();
  state.builderDeck=makeDeck(q=>q.difficulty<=3);
  state.chaseDeck=makeDeck(q=>q.difficulty<=3);
  state.builder.remaining=state.builder.seconds; state.builder.correct=0; state.builder.current=null; state.builder.locked=false;
  state.chase.chaser=shuffleInPlace(CHASERS.slice())[0];
  state.chase.offer=0; state.chase.stepsToHome=7; state.chase.lead=3; state.chase.playerPos=3; state.chase.chaserPos=0; state.chase.current=null; state.chase.locked=false;
  $('#chaserName').textContent = `${state.chase.chaser.name} (aka “${state.chase.chaser.joke}”)`;
  setScreen('builder'); renderBuilder(); startTimer();
}

async function voiceTest(){await ensureAudio(); refreshVoices(); const ok=speak(`Voice test. This is ${state.hostName}. If you can hear this, voice is working.`); $('#voiceTestNote').textContent=ok?'Voice test played.':'Voice not available.';}

function wire(){if(window.speechSynthesis) window.speechSynthesis.onvoiceschanged=()=>{refreshVoices(); updateStatus();};
  $('#startBtn').addEventListener('click', startNewGame);
  $('#voiceTestBtn').addEventListener('click', voiceTest);
  $('#playerName').addEventListener('change', e=>setPlayerName(e.target.value));
  $('#toggleSound').addEventListener('change', async e=>{state.sound=e.target.checked; savePrefs(); if(state.sound) await ensureAudio(); updateStatus();});
  $$('#answers button').forEach(btn=>btn.addEventListener('click', ()=>answerBuilder(btn.dataset.value, btn)));
  $('#offerLowBtn').addEventListener('click', ()=>chooseOffer('low'));
  $('#offerMidBtn').addEventListener('click', ()=>chooseOffer('mid'));
  $('#offerHighBtn').addEventListener('click', ()=>chooseOffer('high'));
  $$('#chaseAnswers button').forEach(btn=>btn.addEventListener('click', ()=>answerChase(btn.dataset.value, btn)));
  $('#playAgain2').addEventListener('click', ()=>setScreen('home'));
  $('#playAgain').addEventListener('click', ()=>setScreen('home'));
  updateStatus();
}

function init(){loadPrefs(); setPlayerName(state.playerName); setScreen('home'); wire();}

document.addEventListener('DOMContentLoaded', init);
})();
