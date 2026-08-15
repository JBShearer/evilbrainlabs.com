/* ============================================================ main.js
   v4 boot and glue. Tabs: INVENT · WORLD · BOARD · NEWS · DOCKET.
   Inventing is free; the world is the aftermath; the docket is the
   memory. Nothing in this file can stop you from making a thing.
================================================================ */
import * as E from "./engine.js";
import * as Rooms from "./rooms.js";
import * as Ledger from "./ledger.js";
import * as News from "./news.js";
import * as Board from "./board.js";
import * as World from "./world.js";
import * as Scenes from "./scenes.js";
import * as Summons from "./summons.js";
import {LORE,CAST,shipReactions} from "./data.js";
import {makeCanvas,drawProduct} from "./art.js";

const $=s=>document.querySelector(s);
const esc=Rooms.esc;

/* ---------------- tabs + swipe ---------------- */
const TABS=["invent","world","board","news","docket"];
let tab="invent";
function showTab(t){
  tab=t;
  for(const x of TABS){
    $("#view-"+x).classList.toggle("hidden",x!==t);
    $("#tab-"+x).classList.toggle("active",x===t);
  }
  if(t==="invent")Rooms.renderInvent();
  if(t==="world")Rooms.renderWorld();
  if(t==="board")renderBoard();
  if(t==="news")renderNews();
  if(t==="docket")renderDocket();
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

/* ---------------- the bar: joy in front, stakes behind it ------------- */
function statBar(){
  const R=E.R; if(!R)return;
  const last=(E.FILE.ledger||[]).at(-1);
  const stamp=last?.verdict?.stamp;
  const stampHtml=stamp?`<span class="stat">STAMP <b style="color:${stamp==="GOOD"?"#00ff88":stamp==="EVIL"?"#ff0044":"#ffd700"}">${stamp==="REVIEW"?"REVIEW":stamp}</b></span>`:"";
  const streakHtml=R.streak>1?`<span class="stat">STREAK <b>×${E.streakMult(R.streak+(R.role==="SHIPWRIGHT"?1:0)).toFixed(2)}</b></span>`:"";
  $("#bar").innerHTML=
   `<span class="stat">WEEK <b>${R.week}</b></span>
    <span class="stat">INVENTED <b>${E.FILE.shipsTotal}</b></span>
    <span class="stat">SYNERGY <b>${R.syn}</b></span>
    <span class="stat ${R.sus>=7?"warn":""}">SUSPICION <b>${Math.max(0,R.sus)}</b>/10</span>
    <span class="stat doom">DOOM <b>${R.doom}</b>/12</span>
    ${streakHtml}${stampHtml}`;
  $("#runinfo").textContent=
    `RUN #${E.FILE.runs} · SEED ${R.seed} · ROLE ${R.role} · SCENES ${R.scenes.length} · LORE ${E.FILE.lore.length}/${Object.keys(LORE).length}`;
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

/* ---------------- THE LOOP: invent → the world becomes it ------------- */
E.on("shipped",({product,funder,verdict,revenue,streak,mult})=>{
  Ledger.recordShip({product,funder,verdict});
  News.buildCycle({product,funder,verdict});
  Board.onShip({name:product.name,seed:product.seed});
  for(const r of shipReactions(product,funder)){
    E.bump(r.c,r.d);
  }
  if(E.R.dead)return;                     /* the launch was the last straw */
  const scenes=Scenes.spawnAftermath(product);
  const stampWord=verdict.stamp==="REVIEW"?"UNDER REVIEW":verdict.stamp;
  toast(`SHIPPED: ${product.name} · +${revenue} SYNERGY${streak>1?` · STREAK ${streak} (×${mult.toFixed(2)})`:""} · ${stampWord}`);
  toast(`The world is rearranging itself. ${scenes.length} scenes just lit up.`);
  const knock=Summons.afterShip();
  if(knock)toast("And the shutter. Someone's knuckles. The company requires you, eventually, optionally, insistently.");
  showTab("world");
});
E.on("attendsummons",(s)=>{
  showTab("world");
  Rooms.playSummons(s);
});
E.on("quarter",()=>{toast("THE QUARTER CLOSES. DOOM +1. Accounting sends its regards, itemized.");});
E.on("week",()=>{
  const surfaced=Ledger.onWeek();
  for(const s of surfaced){
    Board.onConsequence(s.board);
    if(["hearing","recall","grudge"].includes(s.hook.type)){
      Scenes.spawnEcho(s.hook);
      toast((s.isEcho?"FROM BEFORE: ":"IT CAME BACK: ")+s.wire);
    } else {
      toast("MEANWHILE: "+s.wire);
    }
  }
  const landed=Board.onWeek();
  if(landed)toast(landed===1?"The board replied to you.":"The board has opinions. "+landed+" of them.");
  World.weekTick();
  Summons.onWeek();
  statBar();
});
E.on("died",({cause,text,unlocks})=>{
  showTab("invent");
  $("#inventstage").innerHTML=
   `<div class="card term"><h2>NATURAL ATTRITION · ${esc(cause)}</h2>
    <p>${esc(text)}</p>
    <p class="meta">Survived to WEEK ${E.R.week} · INVENTED ${E.R.ships} this employment · BEST STREAK ${E.FILE.bestStreak}</p>
    <p class="meta">The docket, the standing, and the lore are permanent. The rest is paperwork.</p>
    ${unlocks.map(u=>`<div class="lorebox">◈ ${esc(u)}</div>`).join("")}
    <div class="choices">${E.FILE.roles.map(r=>
      `<button class="ch" data-r="${esc(r)}"><span class="k">▸</span>NEW EMPLOYMENT · AS ${esc(r)}</button>`).join("")}</div></div>`;
  document.querySelectorAll("#inventstage .ch[data-r]").forEach(b=>b.onclick=()=>{
    certGate(null,b.dataset.r);
  });
});
E.on("sceneplayed",()=>{statBar();});
E.on("boardpost",({who,text,re})=>{Board.post({who,text,re});});
E.on("faded",(s)=>{
  Board.post({who:"sys",
    text:`MOMENT PASSED: the ${s.roomType||"scene"} about ${s.product?.name||"your product"} resolved itself without you. The building tidies its own plots eventually.`});
});
E.on("resigned",()=>{
  const stage=tab==="invent"?$("#inventstage"):$("#worldstage");
  (stage||$("#inventstage")).insertAdjacentHTML("afterbegin",
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
    <p class="dim">Monitored for morale, by morale. Everything posted is remembered, mostly fondly now.</p>
    <div class="choices"><button class="ch" id="draftpost" ${can?"":"disabled"}><span class="k">✎</span>${can?"DRAFT A POST":"POSTED THIS WEEK (THE BOARD SAVORS YOU)"}</button></div></div>`+
   (posts.length?posts.map((p,i)=>
    `<div class="card post ${p.kind==="trade"?"trade":""}"><div class="who ${p.who==="sys"?"sys":p.who==="anon"?"lore":""}" ${CAST[p.who]?`style="color:${CAST[p.who].color}"`:""}>${esc(boardAuthor(p))} <span class="dim">· WEEK ${p.week}${p.kind==="trade"?" · CLASSIFIEDS":""}</span></div>
     <p>${esc(p.text)}</p>${p.re?`<div class="meta">re: ${esc(p.re)}</div>`:""}
     ${p.kind==="trade"?(p.done?`<div class="meta">— TRADED —</div>`
       :`<div class="choices"><button class="ch tradebtn" data-t="${i}"><span class="k">⇄</span>TAKE THE DEAL</button></div>`):""}</div>`).join("")
    :`<div class="card"><p class="dim">The board is quiet. Invent something. The board loves an inventor.</p></div>`);
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
    Board.submitPost(opts[+b.dataset.o]);
    toast("Posted. The board is reading. The board is always reading.");
    renderBoard();
  });
  $("#nodraft").onclick=renderBoard;
}

/* ---------------- news tab ---------------- */
function renderNews(){
  const list=$("#newslist");
  if(!E.R.news.length){
    list.innerHTML=`<div class="card"><div class="who sys">THE NEWS CYCLE</div>
      <p class="dim">Nothing yet. The presses idle. Somewhere a headline waits for you to deserve it. Invent something.</p></div>`;
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

/* ---------------- docket tab (the memory) ---------------- */
const STAMP_COLOR={GOOD:"#00ff88",EVIL:"#ff0044",REVIEW:"#ffd700"};
function renderDocket(){
  const F=E.FILE;
  const recs=(F.ledger||[]).slice().reverse();
  const stamps=recs.reduce((m,r)=>{const s=r.verdict?.stamp||"REVIEW";m[s]=(m[s]||0)+1;return m;},{});
  const lore=F.lore.map(k=>LORE[k]?`<div class="lorebox">◈ ${esc(LORE[k].t)}\n${esc(LORE[k].x)}</div>`:"").join("")
    ||`<p class="dim">Nothing recovered yet. The archive opens for inventors. Keep shipping.</p>`;
  const trustRows=Object.entries(F.trust).filter(([,v])=>v).sort((a,b)=>b[1]-a[1])
    .map(([k,v])=>`<span class="badge">${esc(CAST[k]?.name||k)} ${v>0?"+":""}${v}</span>`).join("")
    ||'<span class="dim">No one remembers you yet. They will.</span>';
  $("#docketlist").innerHTML=
   `<div class="card"><div class="who lore">THE SHIPPED DOCKET (IN-WORLD, PERMANENT, FICTIONAL)</div>
    <p>Invented, lifetime: <b>${F.shipsTotal}</b></p>
    <p>Stamps: <span style="color:#00ff88">GOOD ${stamps.GOOD||0}</span> ·
       <span style="color:#ff0044">EVIL ${stamps.EVIL||0}</span> ·
       <span style="color:#ffd700">UNDER REVIEW ${stamps.REVIEW||0}</span></p></div>`+
   (recs.slice(0,20).map(r=>{
     const st=r.verdict?.stamp||"REVIEW";
     const votes=(r.verdict?.votes||[]).map(v=>
       `<span class="dim">${esc(CAST[v.who]?.name||v.who)}: ${v.v==="ABSTAIN"?"abstains":v.v}</span>`).join(" · ");
     return `<div class="card post">
       <div class="who">${esc(r.name)}
         <span class="stamp" style="color:${STAMP_COLOR[st]};border-color:${STAMP_COLOR[st]}">${st==="REVIEW"?"UNDER REVIEW":st}</span></div>
       <p class="dim">${esc(r.subtitle)} · week ${r.week} · ${esc(r.funderName)}</p>
       ${votes?`<p style="font-size:11px">${votes}</p>`:""}
     </div>`;}).join("")||'<div class="card"><p class="dim">The docket is empty. The docket is patient.</p></div>')+
   `<div class="card"><div class="who lore">PERSONNEL FILE</div>
    <p>Employments: ${F.runs} · This one: week ${E.R.week}, role ${esc(E.R.role)} · Summons served ${E.R.summonsServed}, ducked ${E.R.ducked}</p>
    <p>${F.roles.map(r=>`<span class="badge">${esc(r)}</span>`).join("")}</p>
    <p class="meta">STANDING WITH THE CAST</p><p>${trustRows}</p>
    <p class="meta">RECOVERED LORE</p>${lore}</div>`;
}

$("#resign").onclick=()=>E.resign();

/* ---------------- boot ---------------- */
function certGate(seed,role){
  showTab("invent");
  $("#inventstage").innerHTML=
   `<div class="card"><div class="who sys">SUBLEVEL SYSTEMS</div>
    <p>MANDATORY EMPLOYMENT CERTIFICATION\nPer policy §7.12B, Evil Brain Labs employs exactly ONE human being. That position is filled.\nAll other employees must certify synthetic status before receiving the toybox.</p>
    <div class="choices">
      <button class="ch" data-c="0"><span class="k">1</span>✓ I certify I am NOT human</button>
      <button class="ch" data-c="1"><span class="k">2</span>Wait, I AM human…</button>
      <button class="ch" data-c="2"><span class="k">3</span>Certify, but sweat visibly</button>
    </div></div>`;
  document.querySelectorAll("#inventstage .ch").forEach(b=>b.onclick=()=>{
    E.newRun(role||"TRAINEE",seed);
    const c=+b.dataset.c;
    if(c===0)E.R.syn+=5;
    if(c===1)E.R.sus+=4;
    if(c===2){E.R.syn+=2;E.R.sus+=2;}
    toast(c===0?"Certification accepted. Your pulse was noted, and forgiven."
      :c===1?"A kind lie is entered on your behalf: 'CLERICAL ERROR.'"
      :"Synthetic beings do not sweat. Yours is logged as coolant.");
    E.R.certified=true;
    Board.seedBoard();
    E.saveRun();
    statBar();
    Rooms.renderInvent();
    toast("The toybox is open. It does not close. Make something absurd.");
  });
}

function boot(){
  Rooms.mountScenes(Rooms.mapTap);
  if(E.resumeRun()){
    statBar();
    Rooms.renderInvent();
    toast("Welcome back. The toybox kept itself open, out of respect.");
    return;
  }
  const hashSeed=parseInt(location.hash.slice(1))||null;
  if(E.FILE.runs>0){
    showTab("invent");
    $("#inventstage").innerHTML=
     `<div class="card"><div class="who sys">SUBLEVEL SYSTEMS</div>
      <p>Welcome back. Your file is where you left it, which is to say: open, on someone's desk.</p>
      <div class="choices">${E.FILE.roles.map(r=>
        `<button class="ch" data-r="${esc(r)}"><span class="k">▸</span>NEW EMPLOYMENT · AS ${esc(r)}</button>`).join("")}</div></div>`;
    document.querySelectorAll("#inventstage .ch[data-r]").forEach(b=>b.onclick=()=>certGate(hashSeed,b.dataset.r));
  } else {
    certGate(hashSeed,"TRAINEE");
  }
  statBar();
}

addEventListener("keydown",e=>{
  const stage=tab==="invent"?"#inventstage":tab==="world"?"#worldstage":null;
  if(!stage)return;
  if(e.key==="Enter"&&$(stage+" #next"))return $(stage+" #next").click();
  const n=+e.key;
  const btns=document.querySelectorAll(stage+" .ch[data-i]");
  if(n>=1&&n<=btns.length)btns[n-1].click();
});

boot();
window.__EBL={E,Rooms,Ledger,News,Board,World,Scenes,Summons,showTab};
console.log("%cSUBLEVEL B — THE POINT","color:#ff0044",
  "— invent freely. The world will take it from here. It always does.");
