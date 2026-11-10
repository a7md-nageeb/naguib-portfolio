(()=>{
const game=document.querySelector('.rps');if(!game)return;
let haptics;
if(navigator.maxTouchPoints>0){
  import('./vendor/web-haptics/index.mjs')
    .then(({WebHaptics})=>{haptics=new WebHaptics()})
    .catch(()=>{});
}
const choices=['rock','paper','scissors'];
// Generate a fresh sequence for each match.
let pattern=[];
function newPattern(){let next;do{next=Array.from({length:3},()=>choices[Math.floor(Math.random()*choices.length)])}while(next.join(',')===pattern.join(','));pattern=next}
const buttons=[...game.querySelectorAll('[data-move]')],status=document.getElementById('rps-status'),score=document.getElementById('rps-score'),actions=game.querySelector('.rps-choices'),play=game.querySelector('.rps-reset');
const subtitle=game.querySelector('.rps-subtitle');
let celebrate;
if(window.confetti)celebrate=window.confetti.create(game.querySelector('.rps-confetti'),{resize:true,useWorker:false,disableForReducedMotion:true});
function winConfetti(){if(!celebrate)return;const defaults={origin:{y:.7},disableForReducedMotion:true};function fire(ratio,options){celebrate({...defaults,...options,particleCount:Math.floor(120*ratio)})}fire(.25,{spread:26,startVelocity:55});fire(.2,{spread:60});fire(.35,{spread:100,decay:.91,scalar:.8});fire(.1,{spread:120,startVelocity:25,decay:.92,scalar:1.2});fire(.1,{spread:120,startVelocity:45})}
// Emoji Rain approach adapted from Universal-Coding-Experiments/emoji_rain.
const emojiRain=document.createElement('div');
emojiRain.className='rps-emoji-rain';
emojiRain.setAttribute('aria-hidden','true');
game.appendChild(emojiRain);
function clearEmojiRain(){emojiRain.replaceChildren()}
function loseConfetti(){
clearEmojiRain();
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const distance=game.getBoundingClientRect().height+100;
for(let i=0;i<10;i++){
const emoji=document.createElement('span');
emoji.textContent='😂';
emoji.style.left=(5+Math.random()*82)+'%';
emoji.style.fontSize=(42+Math.random()*16)+'px';
const tilt=i%3===0?(Math.random()-.5)*30:0;
emojiRain.appendChild(emoji);
const fall=emoji.animate([
{transform:`translateY(-80px) rotate(${tilt}deg)`,opacity:1},
{transform:`translateY(${distance*.8}px) rotate(${-tilt}deg)`,opacity:1,offset:.85},
{transform:`translateY(${distance}px) rotate(${-tilt}deg)`,opacity:0}
],{duration:3000+Math.random()*1200,delay:i*170,easing:'linear',fill:'both'});
fall.finished.then(()=>emoji.remove()).catch(()=>{});
}
}

let you=0,me=0,round=0,busy=false,started=false,timer;
const handSources={
  rock:'images/rps-rock-choice.svg',
  paper:'images/rps-paper-v3.svg',
  scissors:'images/rps-scissors.svg'
};
const loadingSource='images/rps-loading.svg';
const handPreviews=Object.values(handSources).map(src=>{
  const image=new Image();
  image.src=src;
  return image;
});
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function resetHand(id,label){
  const image=document.getElementById(id);
  if(image.getAttribute('src')!==loadingSource)image.src=loadingSource;
  image.alt=label;
  delete image.dataset.gesture;
  image.classList.remove('is-revealing');
}
function prepareHand(id,move,label){
  const current=document.getElementById(id);
  const image=current.cloneNode(false);
  image.src=handSources[move];
  image.alt=label+': '+move;
  image.dataset.gesture=move;
  return {current,image,ready:image.decode().catch(()=>{})};
}
async function showRoundResult(result){const overlay=game.querySelector('.rps-round-overlay');overlay.querySelector('span').textContent=result==='win'?'You Win':result==='lose'?'You Lose':"It’s a Tie";overlay.classList.remove('is-leaving');overlay.classList.add('is-visible');await delay(1100);overlay.classList.remove('is-visible');overlay.classList.add('is-leaving');await delay(reducedMotion.matches?0:200);overlay.classList.remove('is-leaving')}
function clearSelection(){buttons.forEach(b=>{b.classList.remove('is-selected');b.setAttribute('aria-pressed','false')})}
async function setScoreDigits(group,value,animate){
  const next=String(value);
  if(group.textContent===next&&group.querySelector('.t-digit'))return;
  const digit=document.createElement('span');
  digit.className='t-digit';
  digit.textContent=next;
  digit.dataset.score=next;
  digit.setAttribute('aria-hidden','true');
  group.classList.add('t-digit-group');
  group.setAttribute('aria-label',next);
  group.replaceChildren(digit);
  if(!animate||matchMedia('(prefers-reduced-motion: reduce)').matches)return;

  group.classList.add('is-animating','score-changing');
  try {
    await Promise.all(group.getAnimations().map(animation=>animation.finished));
  } finally {
    group.classList.remove('is-animating','score-changing');
  }
}
function tally(animate=false){
  score.textContent=`You ${you} · Me ${me}`;
  return Promise.all([
    setScoreDigits(document.getElementById('rps-your-score'),you,animate),
    setScoreDigits(document.getElementById('rps-my-score'),me,animate)
  ]);
}
function captureLayout(){return ['.rps-panel','.rps-score-group'].map(selector=>{const el=game.querySelector(selector);return {el,rect:el.getBoundingClientRect()}})}
function settleLayout(items){
  if(reducedMotion.matches)return;
  const positions=items.map(({el,rect})=>({el,rect,next:el.getBoundingClientRect()}));
  positions.forEach(({el,rect,next})=>{
    if(!rect.width||!rect.height||!next.width||!next.height)return;
    const x=rect.x-next.x,y=rect.y-next.y;
    if(!x&&!y)return;
    el.animate([{transform:`translate(${x}px,${y}px)`},{transform:'none'}],{
      duration:450,easing:'cubic-bezier(.22,1,.36,1)'
    });
  });
}
function enterGame(){clearEmojiRain();celebrate?.reset();game.querySelector('.rps-replay-group').hidden=true;const previousLayout=captureLayout();game.classList.remove('is-complete','hands-revealed');game.appendChild(play);delete game.dataset.result;clearSelection();game.classList.remove('is-idle','is-activating');newPattern();clearTimeout(timer);you=me=round=0;busy=false;started=true;tally();game.classList.remove('is-playing','user-revealed');actions.getAnimations().forEach(a=>a.cancel());actions.hidden=false;play.hidden=true;buttons.forEach(b=>b.disabled=false);resetHand('rps-you','Your hand');resetHand('rps-me','My hand');status.textContent='Round 1 of 3 · Pick your move.';subtitle.textContent='Pick your move';game.querySelector('.rps-round').textContent='Round 1 of 3';if(!matchMedia('(prefers-reduced-motion: reduce)').matches){game.classList.add('is-activating')}settleLayout(previousLayout);buttons[0].focus({preventScroll:true})}
let entering=false;
async function start(){if(entering)return;entering=true;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;if(!reduce){const leaving=[play];if(game.classList.contains('is-idle'))leaving.push(game.querySelector('.rps-title'));await Promise.all(leaving.map((el,i)=>el.animate([{opacity:1,transform:'translateY(0)',filter:'blur(0)'},{opacity:0,transform:'translateY(-10px)',filter:'blur(3px)'}],{duration:240,delay:i*30,easing:'cubic-bezier(.4,0,.2,1)'}).finished.catch(()=>{})))}enterGame();entering=false}
// Sound cues adapted from Hewar and Raphael Salaja’s userinterface.wiki.

function playClick(ctx) {
    const t = ctx.currentTime;

    const duration = 0.008;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (50));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4000;
    filter.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.value = 0.5 * 0.22;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    noise.start(t);
}

function playDrop(ctx) {
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(
        300,
        t + 0.1
    );

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35 * 0.22, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start(t);
    osc.stop(t + 0.12);
}

function playSuccess(ctx) {
    const t = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99];
    const spacing = 0.08;

    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        const start = t + i * spacing;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.25 * 0.22, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            start + 0.15
        );

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        osc.start(start);
        osc.stop(start + 0.15);
    });
}

async function playGameSound(cue){
  if(!soundEnabled||document.hidden)return;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    audioContext??=new Audio();
    if(audioContext.state==='suspended')await audioContext.resume();
    if(soundEnabled&&!document.hidden)cue(audioContext);
  }catch{}
}

const touchReleaseTimes=new WeakMap();
[play,...buttons].forEach(button=>button.addEventListener('pointerup',event=>{
  if(event.pointerType==='touch')touchReleaseTimes.set(button,event.timeStamp);
  else touchReleaseTimes.delete(button);
}));
function isTouchClick(button,event){
  const releasedAt=touchReleaseTimes.get(button);
  touchReleaseTimes.delete(button);
  return event.pointerType==='touch'||(!event.pointerType&&event.detail>0&&(
    event.sourceCapabilities?.firesTouchEvents||
    (releasedAt!==undefined&&event.timeStamp>=releasedAt&&event.timeStamp-releasedAt<500)
  ));
}
function playHaptic(pattern){
  if(haptics)haptics.trigger(pattern,{intensity:1}).catch(()=>{});
  else navigator.vibrate?.(pattern);
}
play.addEventListener('click',event=>{
  const touch=isTouchClick(play,event);
  if(entering)return;
  handPreviews.forEach(image=>image.decode().catch(()=>{}));
  if(touch)playHaptic(35);
  playGameSound(playClick);
  start();
});
buttons.forEach(button=>button.addEventListener('click',event=>{
const touch=isTouchClick(button,event);
if(!started||busy||round>=3)return;
if(touch)playHaptic(35);
playGameSound(playClick);
busy=true;
game.classList.remove('hands-revealed');
delete game.dataset.result;
subtitle.textContent='Rock… paper… scissors…';
game.querySelector('.rps-round').textContent=`Round ${round+1} of 3`;
clearSelection();
button.classList.add('is-selected');
button.setAttribute('aria-pressed','true');
buttons.forEach(b=>b.disabled=true);
const yours=button.dataset.move,theirs=pattern[round];
const player=prepareHand('rps-you',yours,'Your hand');
const rival=prepareHand('rps-me',theirs,'My hand');
status.textContent=`Round ${round+1} of 3 · Rock… paper… scissors…`;
game.classList.add('is-playing');
const loadingTime=reducedMotion.matches?100:1050;
timer=setTimeout(async()=>{
  // Keep the loading hands moving until both replacement images are ready.
  let deadline;
  await Promise.race([
    Promise.all([player.ready,rival.ready]),
    new Promise(resolve=>{deadline=setTimeout(resolve,750)})
  ]);
  clearTimeout(deadline);
  rival.image.classList.add('is-revealing');
  player.current.replaceWith(player.image);
  rival.current.replaceWith(rival.image);
  game.classList.remove('is-playing','user-revealed');
  game.classList.add('hands-revealed');
  const opponent=rival.image;
  timer=setTimeout(async()=>{
const result=yours===theirs?'draw':choices[(choices.indexOf(theirs)+1)%3]===yours?'win':'lose';clearSelection();const playerHand=document.getElementById('rps-you').closest('figure'),opponentHand=document.getElementById('rps-me').closest('figure');[playerHand,opponentHand].forEach(hand=>hand.classList.remove('round-winner','round-tie'));const celebrating=result==='draw'?[playerHand,opponentHand]:[result==='win'?playerHand:opponentHand];celebrating.forEach(hand=>hand.classList.add(result==='draw'?'round-tie':'round-winner'));if(touch&&result!=='draw')playHaptic(result==='win'?[35,60,65]:[110]);if(result!=='draw')playGameSound(result==='win'?playSuccess:playDrop);await showRoundResult(result);celebrating.forEach(hand=>hand.classList.remove('round-winner','round-tie'));game.dataset.result=result;if(result==='win')you++;if(result==='lose')me++;if(result!=='draw')round++;else pattern[round]=choices[Math.floor(Math.random()*choices.length)];await tally(true);clearSelection();game.querySelector('.rps-round').textContent=`Round ${Math.min(round+1,3)} of 3`;const message=result==='draw'?'A tie. Replay this round.':result==='win'?'You win this round.':'This round is mine.';subtitle.textContent=result==='draw'?'It’s a tie!':result==='win'?'You win this round!':'I win this round!';busy=false;if(you===2||me===2||round===3){game.dataset.result=you===me?'draw':you>me?'win':'lose';subtitle.textContent=you===me?'A draw. Another match?':you>me?'You won the match!':'I won this match. Rematch?';started=false;const finalLayout=captureLayout();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)actions.animate([{opacity:1,filter:'blur(0)'},{opacity:0,filter:'blur(4px)'}],{duration:180,fill:'forwards'});timer=setTimeout(()=>{game.classList.remove('is-activating');game.classList.add('is-complete');game.querySelector('.rps-outcome').textContent=you>me?'You Win':you<me?'You Lose':"It's a Tie";if(you>me)winConfetti();else if(you<me)loseConfetti();game.querySelector('.rps-replay-group').hidden=false;game.querySelector('.rps-replay-group').appendChild(play);actions.hidden=true;play.hidden=false;play.textContent='Play Again';status.textContent=(you===me?'Match drawn.':you>me?'You won the match!':'I won this match.')+` Final score: ${you} — ${me}.`;settleLayout(finalLayout);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)play.animate([{opacity:0,filter:'blur(4px)',transform:'translateY(6px)'},{opacity:1,filter:'blur(0)',transform:'none'}],{duration:500,easing:'cubic-bezier(.22,1,.36,1)'});play.focus({preventScroll:true})},matchMedia('(prefers-reduced-motion: reduce)').matches?0:200)}else{game.classList.remove('hands-revealed');opponent.classList.remove('is-revealing');resetHand('rps-you','Your hand');resetHand('rps-me','My hand');delete game.dataset.result;game.querySelector('.rps-round').textContent=`Round ${round+1} of 3`;subtitle.textContent='Pick your move';status.textContent=`${message} Round ${round+1} of 3 · Pick your move.`;busy=false;buttons.forEach(b=>b.disabled=false)}},reducedMotion.matches?0:620);
},loadingTime);
}));
clearSelection();actions.hidden=true;play.hidden=false;play.textContent='Let’s Play';status.textContent='Three rounds. Ready when you are.';tally();
})();
