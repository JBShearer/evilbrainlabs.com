/* ============================================================ main.js
   Boot, tabs, swipe, and the glue between shipping and consequence.
   The easter-egg door upstairs still opens for persistent knockers;
   this is what's behind it now.
================================================================ */
import * as E from "./engine.js";
import * as Rooms from "./rooms.js";
import * as Ledger from "./ledger.js";
import * as News from "./news.js";
import * as Board from "./board.js";
import * as World from "./world.js";
import {LORE,CAST,shipReactions} from "./data.js";
import {makeCanvas,drawMap,drawProduct} from "./art.js";
import {roomAt as genRoomAt} from "./gen.js";

const $=s=>document.querySelector(s);
const esc=Rooms.esc;

/* ---------------- tabs + swipe ---------------- */
const TABS=["floor","map","board","news"];
let tab="floor";
function showTab(t){
  tab=t;
  for(const x of TABS){
    $("#view-"+x).classList.toggle("hidden",x!==t);
    $("#tab-"+x).classList.toggle("active",x===t);
  }
  if(t==="map")renderMapTab();
  if(t==="board")renderBoard();
  if(t==="news")renderNews();
  if(t==="floor")Rooms.drawScene();
}
TABS.forEach(t=>{$("#tab-"+t).onclick=()=>showTab(t);});
(function swipe(){
  let x0=null,y0=null;
  const main=$("#main");
  main.addEventListener("touchstart",e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  main.addEventListener("touchend",e=>{
    if(x0==null)return;
    const dx=e.changedTouches[0].clientX-x0, dy=e.changedTouches[0].clientY-y0;
    x0=null;
    if(Math.abs(dx)<60||Math.abs(dy)>Math.abs(dx))return;
    const i=TABS.indexOf(tab);
    showTab(TABS[(i+(dx<0?1:TABS.length-1))%TABS.length]);
  },{passive:true});
})();

/* ---------------- status bar ---------------- */
function statBar(){
  const R=E.R; if(!R)return;
  $("#bar").innerHTML=
   `<span class="stat">WEEK <b>${R.week}</b></span>
    <span class="stat">SYNERGY <b>${R.syn}</b></span>
    <span class="stat ${R.sus>=7?"warn":""}">SUSPICION <b>${Math.max(0,R.sus)}</b>/10</span>
    <span class="stat">CLEARANCE <b>${R.clr}</b></span>
    <span class="stat doom">DOOM <b>${R.doom}</b>/12</span>
    <span class="stat">ROLE <b>${esc(R.role)}</b></span>`;
  $("#runinfo").textContent=
    `RUN #${E.FILE.runs} · SEED ${R.seed} · SHIPPED ${E.FILE.shipsTotal} · LORE ${E.FILE.lore.length}/${Object.keys(LORE).length}`;
}
E.on("meters",statBar);
E.on("newrun",statBar);

/* ---------------- toast ---------------- */
const toasts=[];
let toasting=false;
function toast(msg){
  toasts.push(msg);
  if(toasting)return;
  toasting=true;
  (function next(){
    const m=toasts.shift();
    if(!m){toasting=false;return;}
    const el=$("#toast");
    el.textContent=m;el.classList.add("show");
    setTimeout(()=>{el.classList.remove("show");setTimeout(next,240);},2600);
  })();
}
E.on("toast",toast);

/* ---------------- the loop's back half ---------------- */
E.on("shipped",({product,funder,revenue})=>{
  Ledger.recordShip({product,funder});
  const cycle=News.buildCycle({product,funder,revenue});
  Board.onShip(cycle.product);
  /* constituencies notice */
  for(const r of shipReactions(product,funder)){
    E.bump(r.c,r.d);
    toast(r.line+` (${CAST[r.c]?.name} ${r.d>0?"+":""}${r.d})`);
  }
  if(!E.R.dead)Rooms.renderFloor();      /* floor is ready when you come back */
  renderNews();
  showTab("news");
  toast(`SHIPPED. +${revenue} SYNERGY. The cycle spins.`);
});
E.on("week",()=>{
  const surfaced=Ledger.onWeek();
  for(const s of surfaced){
    Board.onConsequence(s.board);
    toast(s.isEcho?"THE PAST: "+s.wire:"THE LEDGER: "+s.wire);
  }
  if(surfaced.some(s=>["hearing","recall","grudge"].includes(s.hook.type)))
    toast("Something is waiting for you in a conference room.");
  const landed=Board.onWeek();
  if(landed)toast(landed===1?"The board replied to you.":"The board has opinions about you. "+landed+" of them.");
  const tick=World.weekTick();
  if(tick?.ledgerHit)toast("MEANWHILE: "+tick.text);
});
E.on("resigned",()=>{
  $("#stage").insertAdjacentHTML("afterbegin",
   `<div class="card"><div class="who sys">SUBLEVEL SYSTEMS</div>
    <p>Resignation declined. Employees may not terminate their employment; employment terminates the employee. This is called natural attrition. Your attempt has been logged as a human behaviour.</p></div>`);
  statBar();
});

/* ---------------- map tab ---------------- */
let mapCtx=null,mapCanvas=null,mapFrame=0;
function renderMapTab(){
  if(!mapCtx){
    const {c,ctx}=makeCanvas(280,280);
    $("#mapwrap").prepend(c);
    mapCtx=ctx;mapCanvas=c;
    c.addEventListener("click",(e)=>{
      const r=c.getBoundingClientRect();
      const CS=r.width/7;
      const dx=Math.floor((e.clientX-r.left)/CS)-3;
      const dy=Math.floor((e.clientY-r.top)/CS)-3;
      if(Math.abs(dx)+Math.abs(dy)!==1)return;      /* adjacent only */
      const here=E.hereRoom();
      const dir=dx===1?"E":dx===-1?"W":dy===1?"S":"N";
      if(!here.doors[dir])return toast("A wall. The wall is load-bearing. Everything here is.");
      E.R.pos={x:here.x+dx,y:here.y+dy};
      E.walkTick();
      if(E.R.dead)return;
      Rooms.renderFloor();
      showTab("floor");
    });
  }
  mapFrame++;
  drawMap(mapCtx,280,280,E.R,(x,y)=>E.roomAt(x,y),mapFrame);
  $("#maphint").innerHTML=`<span class="dim">Tap an adjacent room to walk. ${E.R.hearingQueue.length?'<b style="color:var(--evil)">Something red is waiting.</b>':""}</span>`;
}

/* ---------------- board tab ---------------- */
function boardAuthor(p){
  if(p.who==="you")return "YOU · EMPLOYEE #REDACTED";
  if(p.who==="anon")return "ANONYMOUS (OBVIOUSLY THE BRAIN)";
  if(p.who==="sys")return "SUBLEVEL SYSTEMS";
  return (CAST[p.who]?.name||p.who).toUpperCase();
}
function renderBoard(){
  const posts=E.R.board;
  const can=Board.canPost();
  $("#boardlist").innerHTML=
   `<div class="card"><div class="who sys">SUBLEVEL B MESSAGE BOARD</div>
    <p class="dim">Monitored for morale, by morale. Posting costs a shift. Everything posted is remembered, mostly against you.</p>
    <div class="choices"><button class="ch" id="draftpost" ${can?"":"disabled"}><span class="k">✎</span>${can?"DRAFT A POST":"POSTED THIS WEEK (HR SUGGESTS REFLECTION)"}</button></div></div>`+
   (posts.length?posts.map((p,i)=>
    `<div class="card post ${p.kind==="trade"?"trade":""}"><div class="who ${p.who==="sys"?"sys":p.who==="anon"?"lore":""}" ${CAST[p.who]?`style="color:${CAST[p.who].color}"`:""}>${esc(boardAuthor(p))} <span class="dim">· WEEK ${p.week}${p.kind==="trade"?" · CLASSIFIEDS":""}</span></div>
     <p>${esc(p.text)}</p>${p.re?`<div class="meta">re: ${esc(p.re)}</div>`:""}
     ${p.kind==="trade"?(p.done?`<div class="meta">— TRADED —</div>`
       :`<div class="choices"><button class="ch tradebtn" data-t="${i}"><span class="k">⇄</span>TAKE THE DEAL</button></div>`):""}
    </div>`).join("")
    :`<div class="card"><p class="dim">The board is quiet. Ship something. The board loves a shipping.</p></div>`);
  $("#draftpost")?.addEventListener("click",composeUI);
  document.querySelectorAll(".tradebtn").forEach(b=>b.onclick=()=>{
    const res=Board.acceptTrade(+b.dataset.t);
    if(res){toast(res.line);statBar();}
    renderBoard();
  });
}
function composeUI(){
  const opts=Board.draftOptions();
  $("#boardlist").firstElementChild.outerHTML=
   `<div class="card"><div class="who">DRAFTS (PICK ONE, IT PICKS YOU BACK)</div>
    <div class="choices">${opts.map((o,i)=>
      `<button class="ch" data-o="${i}">${esc(o.label)}<span class="sub">"${esc(o.body.slice(0,64))}${o.body.length>64?"…":""}"</span></button>`).join("")}
      <button class="ch" id="nodraft"><span class="k">✕</span>Log off. Wise.</button></div></div>`;
  document.querySelectorAll("#boardlist .ch[data-o]").forEach(b=>b.onclick=()=>{
    const o=opts[+b.dataset.o];
    Board.submitPost(o);
    if(E.R.dead)return;
    toast("Posted. The board is reading. The board is always reading.");
    statBar();
    renderBoard();
  });
  $("#nodraft").onclick=renderBoard;
}

/* ---------------- news tab ---------------- */
function renderNews(){
  const list=$("#newslist");
  if(!E.R.news.length){
    list.innerHTML=`<div class="card"><div class="who sys">THE NEWS CYCLE</div>
      <p class="dim">Nothing yet. The presses idle. Somewhere a headline waits for you to deserve it. Ship something.</p></div>`;
    return;
  }
  list.innerHTML=E.R.news.map((n,i)=>`
   <div class="card news ${i===0?"fresh":""}">
     <div class="masthead">${esc(n.masthead)}<span class="dim"> · WEEK ${n.week} · YEAR OF THE JAR</span></div>
     <div class="lead">${esc(n.lead)}</div>
     <div class="newsflex">
       <div class="prodicon" data-i="${i}"></div>
       <p class="deck">${esc(n.deck)}</p>
     </div>
     <p class="dim">${esc(n.funderLine)}</p>
     ${n.takes.map(t=>`<div class="take"><span class="tw" style="color:${CAST[t.who]?.color||"#f5f0e6"}">${esc(CAST[t.who]?.name||t.who)}:</span> ${esc(t.text)}</div>`).join("")}
     <div class="market">${esc(n.market)}</div>
     ${n.wire.map(w=>`<div class="wire">◈ ${esc(w)}</div>`).join("")}
   </div>`).join("");
  list.querySelectorAll(".prodicon").forEach(el=>{
    const n=E.R.news[+el.dataset.i];
    const {c,ctx}=makeCanvas(72,72);
    el.appendChild(c);
    ctx.fillStyle="#0a0a12";ctx.fillRect(0,0,72,72);
    drawProduct(ctx,36,40,44,{seed:n.product.seed,stats:n.product.stats,
      act:{fx:n.product.act.fx},tool:{chassis:n.product.tool.chassis},
      purpose:{badge:n.product.purpose.badge}},"full");
  });
}

/* ---------------- personnel file ---------------- */
$("#dossier").onclick=()=>{
  const F=E.FILE;
  const lore=F.lore.map(k=>LORE[k]?`<div class="lorebox">◈ ${esc(LORE[k].t)}\n${esc(LORE[k].x)}</div>`:"").join("")
    ||`<p class="dim">Nothing recovered yet. Clearance opens drawers.</p>`;
  const trustRows=Object.entries(F.trust).filter(([,v])=>v).sort((a,b)=>b[1]-a[1])
    .map(([k,v])=>`<span class="badge">${esc(CAST[k]?.name||k)} ${v>0?"+":""}${v}</span>`).join("")||'<span class="dim">No one remembers you yet. They will.</span>';
  const ledger=(F.ledger||[]).slice(-8).reverse().map(r=>
    `<div class="ledrow">▸ <b>${esc(r.name)}</b> <span class="dim">· run ${r.run}, week ${r.week} · ${esc(r.funderName)}</span></div>`).join("")
    ||'<div class="dim">The Ledger is empty. The Ledger is patient.</div>';
  $("#stage").insertAdjacentHTML("afterbegin",
   `<div class="card"><div class="who lore">PERSONNEL FILE (PERMANENT)</div>
    <p>Employments: ${F.runs} · Best week: ${F.bestDay} · Best synergy: ${F.bestSyn} · Shipped, lifetime: ${F.shipsTotal}</p>
    <p>${F.roles.map(r=>`<span class="badge">${esc(r)}</span>`).join("")}</p>
    <p class="meta">STANDING WITH THE CAST</p><p>${trustRows}</p>
    <p class="meta">THE LEDGER (EVERYTHING SHIPS FOREVER)</p>${ledger}
    <p class="meta">RECOVERED LORE</p>${lore}
    <div class="choices"><button class="ch" id="closed"><span class="k">✕</span>Close the file</button></div></div>`);
  showTab("floor");
  $("#closed").onclick=e=>e.target.closest(".card").remove();
};
$("#resign").onclick=()=>E.resign();

/* ---------------- attrition ---------------- */
E.on("died",({cause,text,unlocks})=>{
  showTab("floor");
  $("#stage").innerHTML=
   `<div class="card term"><h2>NATURAL ATTRITION · ${esc(cause)}</h2>
    <p>${esc(text)}</p>
    <p class="meta">Survived to WEEK ${E.R.week} · SYNERGY ${E.R.syn} · CLEARANCE ${E.R.clr} · SHIPPED ${E.R.ships}</p>
    ${E.R.ships?`<p class="meta">Your products remain in the world. The world will be in touch.</p>`:""}
    ${unlocks.map(u=>`<div class="lorebox">◈ ${esc(u)}</div>`).join("")}
    <div class="choices">${E.FILE.roles.map(r=>
      `<button class="ch" data-r="${esc(r)}"><span class="k">▸</span>NEW EMPLOYMENT · AS ${esc(r)}</button>`).join("")}</div></div>`;
  document.querySelectorAll("#stage .ch[data-r]").forEach(b=>b.onclick=()=>{
    startRun(b.dataset.r);
  });
});

/* ---------------- boot ---------------- */
function certGate(role,seed){
  showTab("floor");
  $("#stage").innerHTML=
   `<div class="card"><div class="who sys">SUBLEVEL SYSTEMS</div>
    <p>MANDATORY EMPLOYMENT CERTIFICATION\nPer policy §7.12B, Evil Brain Labs employs exactly ONE human being. That position is filled.\nAll other employees must certify synthetic status before entering the floor.</p>
    <div class="choices">
      <button class="ch" data-c="0"><span class="k">1</span>✓ I certify I am NOT human</button>
      <button class="ch" data-c="1"><span class="k">2</span>Wait, I AM human…</button>
      <button class="ch" data-c="2"><span class="k">3</span>Certify, but sweat visibly</button>
    </div></div>`;
  document.querySelectorAll("#stage .ch").forEach(b=>b.onclick=()=>{
    E.newRun(role,seed);
    const c=+b.dataset.c;
    if(c===0){E.R.syn+=5;toast("Certification accepted. Your pulse was noted, and forgiven.");}
    if(c===1){E.R.sus+=4;toast("A kind lie is entered on your behalf: 'CLERICAL ERROR.'");}
    if(c===2){E.R.syn+=2;E.R.sus+=2;toast("Synthetic beings do not sweat. Yours is logged as coolant.");}
    E.R.certified=true;
    Board.seedBoard();
    E.saveRun();
    statBar();
    Rooms.renderFloor();
  });
}

let usedHashSeed=false;
function startRun(role){
  const hashSeed=parseInt(location.hash.slice(1))||null;
  const useSeed=(!usedHashSeed&&hashSeed)?hashSeed:null;
  usedHashSeed=true;
  certGate(role,useSeed);
}

function boot(){
  Rooms.mountScene();
  if(E.resumeRun()){
    statBar();
    Rooms.renderFloor();
    toast("Shift resumed. The floor kept your place. The floor keeps everything.");
    return;
  }
  if(E.FILE.runs===0){
    startRun("TRAINEE");
  } else {
    showTab("floor");
    $("#stage").innerHTML=
     `<div class="card"><div class="who sys">SUBLEVEL SYSTEMS</div>
      <p>Welcome back. Your file is where you left it, which is to say: open, on someone's desk.</p>
      <div class="choices">${E.FILE.roles.map(r=>
        `<button class="ch" data-r="${esc(r)}"><span class="k">▸</span>NEW EMPLOYMENT · AS ${esc(r)}</button>`).join("")}</div></div>`;
    document.querySelectorAll("#stage .ch[data-r]").forEach(b=>b.onclick=()=>startRun(b.dataset.r));
  }
  statBar();
}

/* keyboard: numbers pick, enter continues (desk parity) */
addEventListener("keydown",e=>{
  if(e.key==="Enter"&&$("#next"))return $("#next").click();
  const n=+e.key;
  const btns=document.querySelectorAll("#stage .ch[data-i]");
  if(n>=1&&n<=btns.length)btns[n-1].click();
});

boot();
/* dev handle — the console is a room too */
window.__EBL={E,Rooms,Ledger,News,Board,showTab};
console.log("%cSUBLEVEL B — THE OFFICE LABYRINTH","color:#ff0044",
  "— walk, build, ship. It comes back. It always comes back.");
