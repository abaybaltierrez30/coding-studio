const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width = innerWidth; let H = canvas.height = innerHeight;
addEventListener('resize', ()=>{W=canvas.width=innerWidth;H=canvas.height=innerHeight});

// input
const keys = {}; let mouseDown=false;
addEventListener('keydown', e=>keys[e.key.toLowerCase()]=true);
addEventListener('keyup', e=>keys[e.key.toLowerCase()]=false);
addEventListener('mousedown', e=>{ if(e.button===0) mouseDown=true });
addEventListener('mouseup', e=>{ if(e.button===0) mouseDown=false });

const STATE = {TITLE:0,PLAYING:1,PAUSED:2,OVER:3}; let state=STATE.TITLE;

// game objects
const GRID = {cols:3,rows:3,cell:160};
const platforms = [];
const stickmen = [];
let safeIdx = 4; // center default
let sinkOrder = [];
let sinkInterval = 3000; let lastSink=0; let roundStart=0;
let elimination = [];

function resetGame(){
  platforms.length=0; stickmen.length=0; sinkOrder.length=0; elimination.length=0;
  const gridW = GRID.cols*GRID.cell; const gridH = GRID.rows*GRID.cell;
  const startX = (W - gridW)/2; const startY = (H - 240) / 2;
  for(let r=0;r<GRID.rows;r++){
    for(let c=0;c<GRID.cols;c++){
      const x = startX + c*GRID.cell + 20; const y = startY + r*GRID.cell;
      platforms.push({x,y,w:GRID.cell-40,h:20,row:r,col:c,alive:true,idx: r*GRID.cols+c});
    }
  }
  // choose safe platform randomly
  safeIdx = Math.floor(Math.random()*platforms.length);
  // create sink order excluding safe
  sinkOrder = platforms.map(p=>p.idx).filter(i=>i!==safeIdx);
  // shuffle sinkOrder
  for(let i=sinkOrder.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[sinkOrder[i],sinkOrder[j]]=[sinkOrder[j],sinkOrder[i]]}

  // spawn 5 stickmen on random distinct platforms
  const startPositions = [...platforms.keys()].slice(0,platforms.length);
  for(let i=0;i<5;i++){
    const p = platforms[(i)%platforms.length];
    stickmen.push({id:i,x:p.x + p.w/2 + (i-2)*8,y:p.y-30,vx:0,vy:0,onPlat:p.idx,alive:true,isPlayer:i===0,color:i===0? '#0ff':'#ffd',punchCooldown:0});
  }
  // timers
  sinkInterval = 3500; lastSink = performance.now(); roundStart = performance.now();
}

function startGame(){ resetGame(); state=STATE.PLAYING }

// simple physics
function update(dt){
  if(state!==STATE.PLAYING) return;
  const now = performance.now();
  // sinking logic
  if(now - lastSink > sinkInterval && sinkOrder.length>0){
    const idx = sinkOrder.shift();
    const p = platforms.find(pp=>pp.idx===idx); if(p) p.alive=false;
    lastSink = now; sinkInterval = Math.max(800, sinkInterval * 0.9);
  }

  // update stickmen
  for(const s of stickmen){
    if(!s.alive) continue;
    // gravity
    s.vy += 0.8; s.y += s.vy; s.x += s.vx; s.vx *= 0.9; s.punchCooldown = Math.max(0, s.punchCooldown - dt);

    // determine current platform below
    const below = platforms.find(p=> s.x >= p.x && s.x <= p.x + p.w && Math.abs((p.y - 30) - s.y) < 60);
    if(below && below.alive){ s.onPlat = below.idx; s.vy = 0; s.y = below.y - 30; }

    // check fallen into water
    if(s.y > H - 20 && s.alive){ s.alive=false; elimination.push(s.id); }
  }

  // controls for player (stickmen[0])
  const me = stickmen[0];
  if(me && me.alive){
    if(keys['a']||keys['arrowleft']) me.vx -= 0.6;
    if(keys['d']||keys['arrowright']) me.vx += 0.6;
    if((keys['w']||keys['arrowup']||keys[' ']) && me.onPlat!=null){ me.vy = -12; me.onPlat = null }
    // punch
    if(mouseDown && me.punchCooldown<=0){ me.punchCooldown=400; punch(me) }
  }

  // AI for CPUs
  for(let i=1;i<stickmen.length;i++){
    const ai = stickmen[i]; if(!ai.alive) continue;
    const targetPlat = platforms.find(p=>p.idx===safeIdx);
    const tx = targetPlat.x + targetPlat.w/2;
    if(Math.abs(ai.x - tx) > 14){ ai.vx += (ai.x < tx ? 0.3 : -0.3); }
    if(ai.onPlat!=null && Math.random()<0.004) { ai.vy = -10; ai.onPlat=null }
    if(ai.punchCooldown<=0 && Math.abs(ai.x - tx) < 40){ ai.punchCooldown=600; punch(ai) }
  }

  // resolve collisions (simple shove)
  for(let i=0;i<stickmen.length;i++){
    for(let j=i+1;j<stickmen.length;j++){
      const a=stickmen[i], b=stickmen[j]; if(!a.alive || !b.alive) continue;
      if(Math.abs(a.x - b.x) < 18 && Math.abs(a.y - b.y) < 24){
        const dir = a.x < b.x ? -1 : 1; a.vx -= 0.5*dir; b.vx += 0.5*dir;
      }
    }
  }

  // check platform removals causing falls
  for(const p of platforms){ if(!p.alive){
    for(const s of stickmen){ if(s.alive && s.onPlat===p.idx){ s.onPlat=null; s.vy=4 }
    }
  }}

  // check end condition
  const alive = stickmen.filter(s=>s.alive);
  if(alive.length <= 1){
    // push remaining alive to elimination order last
    for(const s of alive) if(!elimination.includes(s.id)) elimination.push(s.id);
    state=STATE.OVER;
  }
}

function punch(actor){
  // apply shove to any nearby other stickmen
  for(const s of stickmen){ if(s===actor || !s.alive) continue;
    if(Math.abs(s.x - actor.x) < 40 && Math.abs(s.y - actor.y) < 30){
      const dir = s.x > actor.x ? 1 : -1; s.vx += 6*dir; s.vy = -4; }
  }
}

// drawing
function draw(){
  // background
  ctx.fillStyle='#66a'; ctx.fillRect(0,0,W,H);
  // water
  ctx.fillStyle='#1a6'; ctx.fillRect(0,H-80,W,80);

  // platforms
  for(const p of platforms){ ctx.fillStyle = p.idx===safeIdx? '#ffd' : (p.alive? '#333':'#222'); ctx.fillRect(p.x,p.y,p.w,p.h); }

  // draw stickmen
  for(const s of stickmen){ if(!s.alive) continue; ctx.save(); ctx.translate(s.x,s.y);
    // body
    ctx.strokeStyle = s.color; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(0,6); ctx.stroke();
    // head
    ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(0,-18,8,0,Math.PI*2); ctx.fill();
    // arms
    ctx.beginPath(); ctx.moveTo(-8,-6); ctx.lineTo(8,-6); ctx.stroke();
    ctx.restore();
  }

  // HUD and sign
  ctx.fillStyle='#fff'; ctx.font='18px Arial'; ctx.fillText('Unsafe Safety', 16, 28);
  ctx.fillText('Safe platform: ' + (safeIdx+1), 16, 52);
}

// UI overlays
function showTitle(){ const ui=document.getElementById('ui'); ui.innerHTML=''; const o=document.createElement('div'); o.className='overlay'; const p=document.createElement('div'); p.className='panel'; const t=document.createElement('div'); t.textContent='Unsafe Safety'; const b=document.createElement('div'); b.className='btn'; b.textContent='Play'; b.onclick=()=>{ ui.innerHTML=''; startGame() }; p.appendChild(t); p.appendChild(b); o.appendChild(p); ui.appendChild(o); }

function showPause(){ const ui=document.getElementById('ui'); if(ui.querySelector('.overlay')) return; const o=document.createElement('div'); o.className='overlay'; const p=document.createElement('div'); p.className='panel'; const t=document.createElement('div'); t.textContent='Paused'; const q=document.createElement('div'); q.className='btn'; q.textContent='Quit'; q.onclick=()=>{ document.getElementById('ui').innerHTML=''; state=STATE.TITLE; showTitle() }; p.appendChild(t); p.appendChild(q); o.appendChild(p); ui.appendChild(o); }

function showOver(){ const ui=document.getElementById('ui'); ui.innerHTML=''; const o=document.createElement('div'); o.className='overlay'; const p=document.createElement('div'); p.className='panel'; const t=document.createElement('div'); t.textContent='Game Over! Rankings'; p.appendChild(t);
  // rankings: elimination order reversed -> winner last
  const ranks = elimination.slice().reverse(); for(let i=0;i<ranks.length;i++){ const li=document.createElement('div'); li.textContent=`#${i+1}: Player ${ranks[i]+1}`; p.appendChild(li) }
  const again=document.createElement('div'); again.className='btn'; again.textContent='Play Again'; again.onclick=()=>{ ui.innerHTML=''; startGame() }; p.appendChild(again); o.appendChild(p); ui.appendChild(o);
}

// main loop
let last=performance.now();
function loop(ts){ const dt = ts-last; last=ts; update(dt); ctx.clearRect(0,0,W,H); draw(); if(state===STATE.TITLE){} if(state===STATE.PAUSED) showPause(); if(state===STATE.OVER) showOver(); requestAnimationFrame(loop); }

// controls
addEventListener('keydown', e=>{ if(e.key.toLowerCase()==='p'){ if(state===STATE.PLAYING){ state=STATE.PAUSED } else if(state===STATE.PAUSED){ state=STATE.PLAYING; document.getElementById('ui').innerHTML=''} } if(e.key.toLowerCase()==='q'){ state=STATE.TITLE; document.getElementById('ui').innerHTML=''; showTitle() } });

showTitle(); requestAnimationFrame(loop);
