/* ============================================================ main.js
   v3 boot and glue. Tabs: SHOP · BOARD · NEWS · DOCKET. The shop is
   home; the docket is the score; the shutter does the rest.
================================================================ */
import * as E from "./engine.js";
import * as Rooms from "./rooms.js";
import * as Ledger from "./ledger.js";
import * as News from "./news.js";
import * as Board from "./board.js";
import * as World from "./world.js";
import * as Summons from "./summons.js";
import {LORE,CAST,shipReactions} from "./data.js";
import {makeCanvas,drawProduct} from "./art.js";

const $=s=>document.querySelector(s);
const esc=Rooms.esc;

/* ---------------- tabs + swipe ---------------- */
const TABS=["shop","board","news","docket"];
let tab="shop";
function showTab(t){
  tab=t;
  for(const x of TABS){
    $("#view-"+x).classList.toggle("hidden",x!==t);
    $("#tab-"+x).classList.toggle("active",x===t);
  }
  if(t==="board")renderBoard();
  if(t==="news")renderNews();
  if(t==="docket")renderDocket();
  if(t==="shop")Rooms.drawScene();
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
    `RUN #${E.FILE.runs} · SEED ${R.seed} · SHIPPED ${R.ships} · STREAK BEST ${E.FILE.bestStreak}`;
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
E.on("shipped",({product,funder,revenue,verdict,streak,mult})=>{
  Ledger.recordShip({product,funder,verdict});
  const cycle=News.buildCycle({product,funder,revenue});
  Board.onShip(cycle.product);
  for(const r of shipReactions(product,funder)){
    E.bump(r.c,r.d);
    toast(r.line+` (${CAST[r.c]?.name} ${r.d>0?"+":""}${r.d})`);
  }
  const stampWord=verdict.stamp==="REVIEW"?"UNDER REVIEW":verdict.stamp;
  toast(`SHIPPED · +${revenue} SYNERGY${streak>1?` · STREAK ${streak} (×${mult.toFixed(2)})`:""} · VERDICT: ${stampWord}`);
  /* overwork feeds the interruptions */
  const s=Summons.afterShip();
  if(!E.R.dead){
    Rooms.renderShop();
    if(s)toast("The shutter. Someone's knuckles. "+(CAST[Summons.TYPES[s.type].who]?.name||"The company")+" requires you.");
  }
});
E.on("week",()=>{
  const surfaced=Ledger.onWeek();
  for(const s of surfaced){
    Board.onConsequence(s.board);
    toast(s.isEcho?"THE PAST: "+s.wire:"THE LEDGER: "+s.wire);
  }
  const landed=Board.onWeek();
  if(landed)toast(landed===1?"The board replied to you.":"The board has opinions about you. "+landed+" of them.");
  const tick=World.weekTick();
  if(tick?.ledgerHit)toast("MEANWHILE: "+tick.text);
  const s=Summons.onWeek();
  if(s&&!E.R.dead&&tab==="shop")Rooms.renderShop();
});
E.on("attended",()=>{statBar();});
E.on("quarter",()=>{toast("THE QUARTER CLOSES. DOOM +1. Accounting sends its regards, itemized.");});
E.on("resigned",()=>{
  $("#stage").insertAdjacentHTML("afterbegin",
   `<div class="card"><div class="who sys">SUBLEVEL SYSTEMS</div>
    <p>Resignation declined. Employees may not terminate their employment; employment terminates the employee. This is called natural attrition. Your attempt has been logged as a human behaviour.</p></div>`);
  statBar();
});

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

/* ---------------- docket tab (the score) ---------------- */
const STAMP_COLOR={GOOD:"#00ff88",EVIL:"#ff0044",REVIEW:"#ffd700"};
function renderDocket(){
  const F=E.FILE, R=E.R;
  const recs=(F.ledger||[]).slice().reverse();
  const stamps=recs.reduce((m,r)=>{const s=r.verdict?.stamp||"REVIEW";m[s]=(m[s]||0)+1;return m;},{});
  const lore=F.lore.map(k=>LORE[k]?`<div class="lorebox">◈ ${esc(LORE[k].t)}\n${esc(LORE[k].x)}</div>`:"").join("")
    ||`<p class="dim">Nothing recovered yet. Clearance opens drawers.</p>`;
  const trustRows=Object.entries(F.trust).filter(([,v])=>v).sort((a,b)=>b[1]-a[1])
    .map(([k,v])=>`<span class="badge">${esc(CAST[k]?.name||k)} ${v>0?"+":""}${v}</span>`).join("")
    ||'<span class="dim">No one remembers you yet. They will.</span>';
  $("#docketlist").innerHTML=
   `<div class="card"><div class="who lore">THE SHIPPED DOCKET (IN-WORLD, PERMANENT, FICTIONAL)</div>
    <p>Shipped, lifetime: <b>${F.shipsTotal}</b> · Best streak: <b>${F.bestStreak}</b> · This employment: ${R?.ships??0}</p>
    <p>Stamps: <span style="color:#00ff88">GOOD ${stamps.GOOD||0}</span> ·
       <span style="color:#ff0044">EVIL ${stamps.EVIL||0}</span> ·
       <span style="color:#ffd700">UNDER REVIEW ${stamps.REVIEW||0}</span></p></div>`+
   (recs.slice(0,14).map(r=>{
     const st=r.verdict?.stamp||"REVIEW";
     const votes=(r.verdict?.votes||[]).map(v=>
       `<span class="dim">${esc(CAST[v.who]?.name||v.who)}: ${v.v==="ABSTAIN"?"abstains":v.v}</span>`).join(" · ");
     return `<div class="card post">
       <div class="who">${esc(r.name)}
         <span class="stamp" style="color:${STAMP_COLOR[st]};border-color:${STAMP_COLOR[st]}">${st==="REVIEW"?"UNDER REVIEW":st}</span></div>
       <p class="dim">${esc(r.subtitle)} · run ${r.run}, week ${r.week} · ${esc(r.funderName)}</p>
       ${votes?`<p style="font-size:11px">${votes}</p>`:""}
     </div>`;}).join("")||'<div class="card"><p class="dim">The docket is empty. The docket is patient.</p></div>')+
   `<div class="card"><div class="who lore">PERSONNEL FILE</div>
    <p>Employments: ${F.runs} · Best week: ${F.bestDay} · Summons served: ${R?.summonsServed??0} · Ducked: ${R?.ducked??0}</p>
    <p>${F.roles.map(r=>`<span class="badge">${esc(r)}</span>`).join("")}</p>
    <p class="meta">STANDING WITH THE CAST</p><p>${trustRows}</p>
    <p class="meta">RECOVERED LORE</p>${lore}</div>`;
}

$("#resign").onclick=()=>E.resign();

/* ---------------- attrition ---------------- */
E.on("died",({cause,text,unlocks})=>{
  showTab("shop");
  $("#stage").innerHTML=
   `<div class="card term"><h2>NATURAL ATTRITION · ${esc(cause)}</h2>
    <p>${esc(text)}</p>
    <p class="meta">Survived to WEEK ${E.R.week} · SHIPPED ${E.R.ships} · BEST STREAK ${E.FILE.bestStreak} · SUMMONS SERVED ${E.R.summonsServed}, DUCKED ${E.R.ducked}</p>
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
  showTab("shop");
  $("#stage").innerHTML=
   `<div class="card"><div class="who sys">SUBLEVEL SYSTEMS</div>
    <p>MANDATORY EMPLOYMENT CERTIFICATION\nPer policy §7.12B, Evil Brain Labs employs exactly ONE human being. That position is filled.\nAll other employees must certify synthetic status before keys to a shop are issued.</p>
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
    Rooms.renderShop();
    toast("Keys to the shop. The bench is yours. The shutter is theirs.");
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
    Rooms.renderShop();
    toast("Shift resumed. The bench kept your place. The bench keeps everything.");
    return;
  }
  if(E.FILE.runs===0){
    startRun("TRAINEE");
  } else {
    showTab("shop");
    $("#stage").innerHTML=
     `<div class="card"><div class="who sys">SUBLEVEL SYSTEMS</div>
      <p>Welcome back. Your file is where you left it, which is to say: open, on someone's desk.</p>
      <div class="choices">${E.FILE.roles.map(r=>
        `<button class="ch" data-r="${esc(r)}"><span class="k">▸</span>NEW EMPLOYMENT · AS ${esc(r)}</button>`).join("")}</div></div>`;
    document.querySelectorAll("#stage .ch[data-r]").forEach(b=>b.onclick=()=>startRun(b.dataset.r));
  }
  statBar();
}

addEventListener("keydown",e=>{
  if(e.key==="Enter"&&$("#next"))return $("#next").click();
  const n=+e.key;
  const btns=document.querySelectorAll("#stage .ch[data-i]");
  if(n>=1&&n<=btns.length)btns[n-1].click();
});

boot();
window.__EBL={E,Rooms,Ledger,News,Board,World,Summons,showTab};
console.log("%cSUBLEVEL B — THE SHOP AND THE SUMMONS","color:#ff0044",
  "— ship after ship after ship, until the shutter.");
