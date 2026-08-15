/* ============================================================ rooms.js
   v4 — joy-first. INVENT is a toybox that is always open: every part,
   every combination, zero cost, from anywhere. WORLD is the aftermath:
   the map lights up where your invention started a life, and you walk
   through it scene by scene. No inventory. No meters. No doors welded
   shut. When in doubt, this file writes the scene.
================================================================ */
import * as E from "./engine.js";
import {mulberry32,hash32,pick,shuffle} from "./gen.js";
import {ACTS,TOOLS,PURPOSES,MODS,CAST,SLIDES,LEADER_TITLES,LEADER_LANDS,
        FUNDERS,MAIL,ARCHIVE_DRAWERS,FINAL_DRAWER,LORE,ROOM_META,cap} from "./data.js";
import {drawRoom,drawShop,drawProduct,drawNapkin,makeCanvas,drawMap} from "./art.js";
import * as Ledger from "./ledger.js";
import * as Scenes from "./scenes.js";
import * as Summons from "./summons.js";

export const esc=s=>String(s??"").replace(/[<>&]/g,m=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[m]));
const $=s=>document.querySelector(s);

/* ---------------- scene canvases ---------------- */
let inventCtx=null, worldCtx=null, mapCtx=null, mapCanvas=null, frame=0, flick=null;
let worldMode={view:"map", room:null};

export function mountScenes(onMapTap){
  const iw=$("#inventscene");
  if(iw&&!inventCtx){const {c,ctx}=makeCanvas(320,240);iw.prepend(c);inventCtx=ctx;}
  const ww=$("#worldscene");
  if(ww&&!worldCtx){const {c,ctx}=makeCanvas(320,240);ww.prepend(c);worldCtx=ctx;}
  const mw=$("#mapwrap");
  if(mw&&!mapCtx){
    const {c,ctx}=makeCanvas(288,288);
    mw.prepend(c);mapCtx=ctx;mapCanvas=c;
    c.addEventListener("click",e=>{
      const r=c.getBoundingClientRect();
      const CS=r.width/9;
      const dx=Math.floor((e.clientX-r.left)/CS)-4;
      const dy=Math.floor((e.clientY-r.top)/CS)-4;
      onMapTap(dx,dy);
    });
  }
  clearInterval(flick);
  flick=setInterval(()=>{
    if(document.hidden||!E.R)return;
    frame++;
    if(!$("#view-invent").classList.contains("hidden"))drawInventScene();
    if(!$("#view-world").classList.contains("hidden"))drawWorldScene();
  },420);
}
export function drawInventScene(){
  if(!inventCtx||!E.R)return;
  drawShop(inventCtx,frame,{product:draftProduct(),
    summonses:E.R.summons?.length||0,
    streak:E.R.streak||0,
    subpoena:(E.R.subpoenas||0)>0});
}
export function drawWorldScene(){
  if(!E.R)return;
  if(worldMode.view==="room"&&worldMode.room&&worldCtx)
    drawRoom(worldCtx,worldMode.room,frame);
  if(mapCtx)drawMap(mapCtx,288,288,
    {scenes:E.R.scenes,visited:E.R.visited},(x,y)=>E.roomAt(x,y),frame);
}

/* ---------------- shared card helpers ---------------- */
function card({who,cls="",title,text,foot=""}){
  const name=who? (CAST[who]?.name||who.toUpperCase()) : (title||"");
  return `<div class="card">${name?`<div class="who ${cls}">${esc(name)}${who&&title?` <span class="dim">· ${esc(title)}</span>`:""}</div>`:""}
    <p>${esc(text)}</p>${foot}</div>`;
}
function choices(list){
  return `<div class="choices">${list.map((c,i)=>
    `<button class="ch" data-i="${i}"><span class="k">${i+1}</span>${esc(c.t)}</button>`).join("")}</div>`;
}
function recoverLore(id){
  if(!id||E.FILE.lore.includes(id))return "";
  E.FILE.lore.push(id);E.saveFile();
  const L=LORE[id];
  return L?`<div class="lorebox">◈ RECOVERED: ${esc(L.t)}\n${esc(L.x)}</div>`:"";
}
let gameTimers=[];
const gInterval=(fn,ms)=>{const t=setInterval(fn,ms);gameTimers.push(t);return t;};
const gTimeout=(fn,ms)=>{const t=setTimeout(fn,ms);gameTimers.push(t);return t;};
const clearGames=()=>{gameTimers.forEach(t=>{clearInterval(t);clearTimeout(t);});gameTimers=[];};

/* ================================================================
   INVENT — the toybox. Free. Always. From anywhere.
================================================================ */
const sel=()=>E.R.invent;
function draftProduct(){
  const s=sel();
  if(!s||!s.act||!s.tool||!s.purpose)return null;
  const a=E.ACT_BY[s.act],t=E.TOOL_BY[s.tool],p=E.PURP_BY[s.purpose];
  return {seed:hash32(1,s.act.length*7,s.tool.length*3,s.purpose.length)>>>0,
    stats:{mg:0,mh:0,mc:0},act:a,tool:t,purpose:p,revealed:false};
}

export function renderInvent(){
  if(!E.R)return;                    /* the cert gate owns the stage */
  clearGames();
  drawInventScene();
  const s=sel();
  s.premium??={};
  const stage=$("#inventstage");
  const insp=E.R.inspiration;
  const owned=id=>E.R.owned?.[id]||0;
  const partRow=(kind,parts)=>`
    <div class="socket"><div class="socklabel">${kind.toUpperCase()} — ${kind==="act"?"what it does":kind==="tool"?"what it is":"who it's for"}</div>
    <div class="partflex">${parts.map(p=>
      `<button class="chip ${kind} ${s[kind]===p.id?"laid":""}" data-k="${kind}" data-id="${p.id}">${esc(kind==="act"?p.up:p.low.toUpperCase())}${owned(p.id)?`<span class="ownbadge">◆${owned(p.id)}</span>`:""}</button>`).join("")}
    </div></div>`;
  const ready=s.act&&s.tool&&s.purpose;
  const draft=ready? E.makeProduct(s.act,s.tool,s.purpose) : null;
  /* premium sockets: found copies enrich the free base — never required */
  const premiumRows=!ready?"":[s.act,s.tool,s.purpose].filter(id=>owned(id)>0).map(id=>{
    const p=E.PART_OF(id);
    const label=E.PART_KIND(id)==="act"?p.up:p.low.toUpperCase();
    return `<button class="ch premtoggle ${s.premium[id]?"laid":""}" data-prem="${id}">
      <span class="k">◆</span>${s.premium[id]?"SOCKETED":"SOCKET"} FIELD-TESTED ${esc(label)}
      <span class="sub">you own ${owned(id)} · consumes one · +1 to its best stat · pure garnish</span></button>`;
  }).join("");
  stage.innerHTML=`
    ${summonsBanners()}
    ${insp?`<div class="card inspire"><div class="who lore">INSPIRATION</div>
      <p>${esc(insp.line)}</p>
      <div class="choices"><button class="ch" id="useinsp"><span class="k">✦</span>USE IT: ${esc(inspLabel(insp))}</button>
      <button class="ch" id="dropinsp"><span class="k">✕</span>Lose the thread on purpose</button></div></div>`:""}
    <div class="card roomcard">
      ${ready?`<p class="draftname">${esc(draft.name)}</p><p class="dim">${esc(draft.subtitle)}</p>`
        :`<p class="dim">Pick one of each. Or hit the button and let the toybox decide. The base build is free. It will always be free.</p>`}
      <div class="choices">
        <button class="ch" id="shipnow" ${ready?"":"disabled"}><span class="k">🚀</span>SHIP IT<span class="sub">free · instant · consequences included</span></button>
        <button class="ch" id="napkinship" ${ready?"":"disabled"}><span class="k">☕</span>SKETCH IT ON A NAPKIN INSTEAD<span class="sub">same parts, extra chaos, the grease decides</span></button>
        <button class="ch" id="surprise"><span class="k">☈</span>SURPRISE ME<span class="sub">the toybox picks all three</span></button>
        ${premiumRows}
      </div>
    </div>
    ${partRow("act",ACTS)}
    ${partRow("tool",TOOLS)}
    ${partRow("purpose",PURPOSES)}
    <div class="socket"><div class="socklabel">FINISHING TOUCH — optional, also free</div>
    <div class="partflex">${MODS.map(m=>
      `<button class="chip mod ${s.mod===m.id?"laid":""}" data-mod="${m.id}">${esc(m.name)}<span class="sub">${esc(m.blurb)}</span></button>`).join("")}
    </div></div>
    ${deskServices()}`;
  wireDesk(stage);
  stage.querySelectorAll(".premtoggle").forEach(el=>el.onclick=()=>{
    const id=el.dataset.prem;
    s.premium[id]=!s.premium[id];
    E.saveRun();renderInvent();
  });
  stage.querySelectorAll(".chip[data-k]").forEach(el=>el.onclick=()=>{
    s[el.dataset.k]=s[el.dataset.k]===el.dataset.id?null:el.dataset.id;
    E.saveRun();renderInvent();
  });
  stage.querySelectorAll(".chip[data-mod]").forEach(el=>el.onclick=()=>{
    s.mod=s.mod===el.dataset.mod?null:el.dataset.mod;
    E.saveRun();renderInvent();
  });
  $("#surprise").onclick=()=>{
    const r=Math.random;
    s.act=ACTS[Math.floor(r()*ACTS.length)].id;
    s.tool=TOOLS[Math.floor(r()*TOOLS.length)].id;
    s.purpose=PURPOSES[Math.floor(r()*PURPOSES.length)].id;
    E.saveRun();renderInvent();
  };
  if(insp){
    $("#useinsp").onclick=()=>{
      s[insp.kind]=insp.id;
      E.R.inspiration=null;E.saveRun();renderInvent();
    };
    $("#dropinsp").onclick=()=>{E.R.inspiration=null;E.saveRun();renderInvent();};
  }
  const doShip=(builtIn)=>{
    if(!ready)return;
    shipFlow(builtIn);
  };
  $("#shipnow").onclick=()=>doShip("toybox");
  $("#napkinship").onclick=()=>doShip("napkin");
  /* preview drawing on the canvas happens via draftProduct() */
}
function inspLabel(insp){
  const p={act:E.ACT_BY,tool:E.TOOL_BY,purpose:E.PURP_BY}[insp.kind][insp.id];
  return insp.kind==="act"?p.up:p.low.toUpperCase();
}

/* ---------------- the shutter, back on the desk ---------------- */
function summonsBanners(){
  if(!E.R.summons.length&&!E.R.invasion)return "";
  let html="";
  if(E.R.invasion){
    const T=Summons.TYPES[E.R.invasion.type];
    html+=`<div class="card summons subpoena"><div class="who">⚠ IT'S HERE</div>
      <p>${esc(T.invadeText||"It found the desk.")}</p>
      <div class="choices"><button class="ch" id="faceinv"><span class="k">▸</span>FACE IT (in the world)</button></div></div>`;
  }
  for(const s of E.R.summons){
    html+=`<div class="card summons ${s.subpoenaed?"subpoena":""}">
      <div class="who ${s.subpoenaed?"":"sys"}">${s.subpoenaed?"⚠ SUBPOENA (riding your launches: doom +1 per ship)":"THE SHUTTER"}</div>
      <p>${esc(Summons.arriveText(s))}</p>
      <div class="choices">
        <button class="ch attendbtn" data-s="${s.id}"><span class="k">▸</span>ATTEND<span class="sub">a scene, out in the world · breaks the streak</span></button>
        <button class="ch ignorebtn" data-s="${s.id}"><span class="k">✕</span>IGNORE<span class="sub">${s.ducked?"they asked once already":"keep inventing, let it simmer"}</span></button>
      </div></div>`;
  }
  return html;
}
function wireSummonsBanners(container){
  container.querySelectorAll(".attendbtn").forEach(b=>b.onclick=()=>{
    const s=E.R.summons.find(x=>x.id===b.dataset.s);
    if(s)E.emit("attendsummons",s);
  });
  container.querySelectorAll(".ignorebtn").forEach(b=>b.onclick=()=>{
    const s=E.R.summons.find(x=>x.id===b.dataset.s);
    if(!s)return;
    const res=Summons.duck(s);
    E.emit("toast",res.out);
    if(!E.R.dead)renderInvent();
  });
  const inv=container.querySelector("#faceinv");
  if(inv)inv.onclick=()=>E.emit("attendsummons",{invasion:true});
}

/* ---------------- desk services: garnish, priced in synergy ----------- */
function deskServices(){
  const R=E.R;
  const extCost=15+10*(R.extUsed||0);
  return `<div class="card roomcard"><div class="who sys">THE DESK DRAWER · SYNERGY ${R.syn}</div>
    <p class="dim">Garnish only. The toybox upstairs never charges; the drawer always does.</p>
    <div class="choices">
      <button class="ch" id="svc-act"><span class="k">▣</span>CHUTE: AN ACT<span class="sub">8 SYNERGY · random ACT, field-tested</span></button>
      <button class="ch" id="svc-tool"><span class="k">▣</span>CHUTE: A TOOL<span class="sub">8 SYNERGY · random TOOL, field-tested</span></button>
      <button class="ch" id="svc-purpose"><span class="k">▣</span>CHUTE: A PURPOSE<span class="sub">8 SYNERGY · random PURPOSE, field-tested</span></button>
      <button class="ch" id="svc-cool"><span class="k">❄</span>COOLANT, COLD<span class="sub">4 SYNERGY · suspicion −1</span></button>
      ${R.doom>=2?`<button class="ch" id="svc-ext"><span class="k">⌸</span>FILING EXTENSION<span class="sub">${R.spent["ext:"+R.week]?"granted this week already":extCost+" SYNERGY · doom −1 · price rises"}</span></button>`:""}
    </div></div>`;
}
function wireDesk(stage){
  wireSummonsBanners(stage);
  const buyKind=(kind)=>{
    if(!E.spend(8))return E.emit("toast","DECLINED. The drawer displays your balance to the room, helpfully.");
    const pool={act:ACTS,tool:TOOLS,purpose:PURPOSES}[kind].filter(p=>!p.rare);
    const part=pool[Math.floor(Math.random()*pool.length)];
    E.grantPart(part.id);
    E.emit("toast",`Thud: ${kind==="act"?part.up:part.low.toUpperCase()} (${kind.toUpperCase()}), field-tested by somebody, somewhere.`);
    renderInvent();
  };
  const on=(id,fn)=>{const el=stage.querySelector(id);if(el)el.onclick=fn;};
  on("#svc-act",()=>buyKind("act"));
  on("#svc-tool",()=>buyKind("tool"));
  on("#svc-purpose",()=>buyKind("purpose"));
  on("#svc-cool",()=>{
    if(!E.spend(4))return E.emit("toast","DECLINED. The coolant stays cold without you.");
    E.R.coolant++;E.fx({sus:-1});
    E.emit("toast","Coolant, cold, correct. The room seems less suspicious already.");
    if(!E.R.dead)renderInvent();
  });
  on("#svc-ext",()=>{
    const key="ext:"+E.R.week, cost=15+10*(E.R.extUsed||0);
    if(E.R.spent[key])return E.emit("toast","One extension per week. The clock is patient, not gullible.");
    if(!E.spend(cost))return E.emit("toast",`The extension costs ${cost} SYNERGY now. The clock read a book about scarcity and loved it.`);
    E.R.spent[key]=1;E.R.extUsed=(E.R.extUsed||0)+1;
    E.R.doom=Math.max(0,E.R.doom-1);E.saveRun();
    E.emit("toast","FILING EXTENSION GRANTED. DOOM −1. An actuary feels a chill and bills for it.");
    if(!E.R.dead)renderInvent();
  });
}

function shipFlow(builtIn){
  const s=sel();
  const stage=$("#inventstage");
  const p=E.makeProduct(s.act,s.tool,s.purpose,builtIn,s.mod?[s.mod]:[],s.premium||{});
  const rng=mulberry32((p.seed^0x5919)>>>0);
  const offers=shuffle(rng,FUNDERS).slice(0,2);
  stage.innerHTML=card({who:"sys",cls:"sys",
    text:`SHIP ${p.name}?\n${p.subtitle}${builtIn==="napkin"?" · sketched, greasily":""}.\nMoney is optional. Money was always optional. Nobody told you until now.`});
  stage.firstElementChild.insertAdjacentHTML("beforeend",choices(
    offers.map(f=>({t:"Let "+f.name+" fund it"})).concat([{t:"No strings. Just ship it."},{t:"Wait, one more tweak"}])));
  stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i;
    if(i===offers.length+1)return renderInvent();
    const funder=i<offers.length?offers[i]:null;
    E.R.invent={act:null,tool:null,purpose:null,mod:null,premium:{}};
    E.ship(p,funder);
  });
}

/* ================================================================
   WORLD — walking through the life your product created.
================================================================ */
export function renderWorld(){
  if(!E.R)return;
  clearGames();
  worldMode={view:"map",room:null};
  drawWorldScene();
  $("#worldlabel").innerHTML=
    `<b style="color:#ff9955">THE WORLD</b>
     <span class="dim"> · WEEK ${E.R.week} · ${E.R.scenes.length} scene${E.R.scenes.length===1?"":"s"} waiting</span>`;
  const stage=$("#worldstage");
  if(E.R.invasion)return invasionUI();
  const list=E.R.scenes.slice(-8).reverse().map(s=>{
    const who=s.who?CAST[s.who]?.name:"THE WORLD";
    return `<button class="ch scenebtn" data-sid="${s.id}" style="border-left:3px solid ${s.kind==="echo"?"#ff0044":CAST[s.who]?.color||"#ff9955"}">
      ${esc(who)} <span class="sub">re: ${esc(s.product?.name||"you")} · ${esc((s.roomType||"somewhere").toUpperCase())}${s.kind==="echo"?" · IT CAME BACK":""}</span></button>`;
  }).join("");
  stage.innerHTML=`
    ${summonsBanners()}
    <div class="card roomcard">
      <p class="dim">${E.R.scenes.length?
        "The map glows where your inventions started lives. Tap a room up there, or a scene below. Everything keeps until you get there. Mostly.":
        E.R.ships?"Quiet floor today. Visit anyone, or go invent the next commotion.":
        "Nothing has happened yet, because you haven't made anything happen. The INVENT tab fixes that in about nine seconds."}</p>
      ${list?`<div class="choices">${list}</div>`:""}
    </div>`;
  wireSummonsBanners(stage);
  stage.querySelectorAll(".scenebtn").forEach(b=>b.onclick=()=>{
    const s=E.R.scenes.find(x=>x.id===b.dataset.sid);
    if(s)playScene(s);
  });
}

/* ---------------- invasions: it found the desk, it plays here --------- */
function invasionUI(){
  const T=Summons.TYPES[E.R.invasion.type];
  const stage=$("#worldstage");
  stage.innerHTML=card({who:T.who,text:(T.invadeText||"It is here.")+"\nNo comp package. Home games pay nothing."});
  stage.firstElementChild.insertAdjacentHTML("beforeend",
    `<div class="choices"><button class="ch" id="face"><span class="k">▸</span>FACE IT</button></div>`);
  $("#face").onclick=()=>{
    if(T.body==="minigame"){
      MINIGAMES[T.game]({seed:(E.R.seed^0xDEAD)>>>0},(res)=>{
        if(res.trustGi)E.bump("gi",res.trustGi);
        E.fx({sus:res.out&&/human|lingered|wrong/i.test(res.out)?1:0});
        if(E.R.dead)return;
        Summons.clearInvasion();
        E.tick(1);
        finishScene({id:null},res.out+" It leaves satisfied. The desk smells faintly of protocol.");
      });
    } else {
      E.fx({doom:1});
      if(E.R.dead)return;
      Summons.clearInvasion();
      E.tick(1);
      finishScene({id:null},"It is handled, at home, expensively. DOOM +1. The toybox pretends not to have seen.");
    }
  };
}

/* ---------------- attending a summons = a scene in the world ---------- */
export function playSummons(s){
  if(s.invasion)return renderWorld();      /* invasion routes to its own UI */
  clearGames();
  const T=Summons.TYPES[s.type];
  const h=((s.id||"").length*2654435761)>>>0;
  const x=(h%9)-4, y=((h>>>4)%9)-4;
  const room=E.roomAt(x,y);
  room.type=T.room;room.cast=T.who||s.payload?.castId||room.cast;
  worldMode={view:"room",room};
  frame++;drawWorldScene();
  E.R.visited[x+","+y]=1;
  $("#worldlabel").innerHTML=
    `<b style="color:${CAST[T.who]?.color||"#ff9955"}">TAKEN: ${esc(T.room.toUpperCase())}</b>
     <span class="dim"> · the streak waits, and won't</span>`;
  const stage=$("#worldstage");
  const finish=(out)=>{
    const T2=Summons.TYPES[s.type];
    let notes=[];
    const rng=mulberry32((E.R.seed^E.R.summonsServed^0xF00D)>>>0);
    if(T2.rewards?.part){
      const pool=[...ACTS,...TOOLS,...PURPOSES].filter(p=>!p.rare);
      const part=pick(rng,pool);
      E.grantPart(part.id);
      notes.push("COMP PACKAGE: field-tested "+(E.PART_KIND(part.id)==="act"?part.up:part.low.toUpperCase())+".");
    }
    if(T2.rewards?.coolant){E.R.coolant++;E.fx({sus:-1});notes.push("COMP PACKAGE: coolant, cold.");}
    if(T2.rewards?.sus){E.fx({sus:T2.rewards.sus});notes.push("Your file breathes easier.");}
    if(T2.rewards?.trust)E.bump(T2.rewards.trust[0],T2.rewards.trust[1]);
    if(E.R.dead)return;
    Summons.resolve(s);
    E.tick(2);
    if(E.R.dead)return;
    finishScene({id:null},(out||"Handled.")+(notes.length?"\n"+notes.join("\n"):""));
  };
  if(T.body==="hearing"){
    const spec=Ledger.hearingCard(s.payload.hook);
    stage.innerHTML=card({who:spec.who,cls:spec.who==="sys"?"sys":"",text:spec.text});
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices(spec.choices));
    stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
      const c=spec.choices[+b.dataset.i];
      if(c.fx)E.fx(c.fx);
      if(E.R.dead)return;
      finish(c.out);
    });
    return;
  }
  if(T.body==="choices"){
    stage.innerHTML=card({who:T.who,text:T.event.text});
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices(T.event.choices));
    stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
      const c=T.event.choices[+b.dataset.i];
      if(c.fx)E.fx(c.fx);
      if(c.trust)E.bump(c.trust[0],c.trust[1]);
      if(E.R.dead)return;
      finish(c.out);
    });
    return;
  }
  if(T.body==="minigame"){
    MINIGAMES[T.game](room,(res)=>{
      if(res.trustGi)E.bump("gi",res.trustGi);
      finish(res.out);
    });
    return;
  }
  if(T.body==="meeting"){
    const who=s.payload?.castId;
    if(who)E.bump(who,1);
    finish((CAST[who]?.name||"They")+" mostly wanted company. Eleven quiet minutes, and the standing to show for it.");
    return;
  }
  if(T.body==="mail"){
    const rng=mulberry32((room.seed^E.R.week^0x3A11)>>>0);
    const env=pick(rng,MAIL);
    stage.innerHTML=`<div class="card"><div class="who sys">FROM: ${esc(env.from)}</div>
      <p>${esc(env.text)}</p></div>`;
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices([env.a,env.b]));
    stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
      const c=[env.a,env.b][+b.dataset.i];
      if(c.trust)E.bump(c.trust[0],c.trust[1]);
      finish(c.out);
    });
    return;
  }
  finish();
}

export function mapTap(dx,dy){
  if(!E.R||Math.abs(dx)>4||Math.abs(dy)>4)return;
  const key=dx+","+dy;
  const scene=E.R.scenes.find(s=>s.roomKey===key);
  if(scene)return playScene(scene);
  if(!E.R.visited[key]&&!(dx===0&&dy===0)){
    /* undiscovered and quiet: a peek, and it's on the map now */
    E.R.visited[key]=1;E.saveRun();
  }
  visitAmbient(dx,dy);
}

/* ---------------- playing a scene ---------------- */
function sceneRoom(s){
  const room=E.roomAt(s.x,s.y);
  room.type=s.roomType||room.type;
  room.cast=s.who||room.cast;
  return room;
}

function playScene(s){
  clearGames();
  const room=sceneRoom(s);
  worldMode={view:"room",room};
  frame++;drawWorldScene();
  $("#worldlabel").innerHTML=
    `<b style="color:${CAST[s.who]?.color||"#ff9955"}">${esc((s.roomType||"SCENE").toUpperCase())}</b>
     <span class="dim"> · the aftermath of ${esc(s.product?.name||"you")}</span>`;
  E.R.visited[s.roomKey]=1;
  if(s.kind==="echo")return playEcho(s);
  const body=Scenes.buildBody(s);
  if(body.press)return pressTour(s,room);
  const stage=$("#worldstage");
  stage.innerHTML=card({who:s.who,title:body.title,text:body.text});
  stage.firstElementChild.insertAdjacentHTML("beforeend",choices(body.choices));
  stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
    const c=body.choices[+b.dataset.i];
    if(c.trust)E.bump(c.trust[0],c.trust[1]);
    if(c.fx)E.fx(c.fx);
    if(E.R.dead)return;
    let extra="";
    if(c.grant&&E.PART_OF(c.grant)){E.grantPart(c.grant);
      const gp=E.PART_OF(c.grant);
      const gl=E.PART_KIND(c.grant)==="act"?gp.up:gp.low.toUpperCase();
      extra+=`<div class="lorebox">◆ POCKETED: field-tested ${esc(gl)} — socket it at the toybox for garnish.</div>`;}
    if(c.echo?.board){E.emit("boardpost",{who:c.echo.board[0],text:c.echo.board[1],re:s.product?.name});}
    if(c.echo?.wire){E.R.wire.push({week:E.R.week,text:c.echo.wire(s.product),type:"scene"});E.saveRun();}
    if(c.inspire){E.R.inspiration=c.inspire();E.saveRun();
      extra+=`<div class="lorebox">✦ INSPIRATION: ${esc(E.R.inspiration.line)}\n(waiting on the INVENT tab)</div>`;}
    finishScene(s,c.out,extra);
  });
}

function finishScene(s,out,extraHtml=""){
  const stage=$("#worldstage");
  const ch=stage.querySelector(".choices");
  if(ch)ch.remove();
  stage.querySelector(".card")?.insertAdjacentHTML("beforeend",
    `<div class="out">${esc(out||"The moment settles into the floor plan.")}</div>${extraHtml}
     <div class="choices"><button class="ch" id="next"><span class="k">⏎</span>BACK TO THE WORLD</button></div>`);
  $("#next").onclick=()=>{
    consumeScene(s);
    E.tick(1);
    renderWorld();
    E.emit("sceneplayed",s);
  };
}
function consumeScene(s){
  if(!s.id)return;
  E.R.scenes=E.R.scenes.filter(x=>x.id!==s.id);
  E.saveRun();
}

/* echoes: the ledger's memory, wearing a costume */
function playEcho(s){
  const spec=Ledger.hearingCard(s.hook);
  const stage=$("#worldstage");
  stage.innerHTML=card({who:spec.who,cls:spec.who==="sys"?"sys":"",text:spec.text});
  stage.firstElementChild.insertAdjacentHTML("beforeend",choices(spec.choices));
  stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
    const c=spec.choices[+b.dataset.i];
    finishScene(s,c.out);
  });
}

/* ---------------- press tour (the fake-PM fantasy, on stage) ---------- */
function pressTour(s,room){
  const stage=$("#worldstage");
  const p=s.product;
  const rng=mulberry32((room.seed^p.seed)>>>0);
  const chaired=rng()<.3;
  let mood=50+(E.trust("stall")>=2?5:0)+(E.trust("benny")>=2?5:0);
  const seats=Array.from({length:3},()=>pick(rng,LEADER_TITLES)+" "+pick(rng,LEADER_LANDS));
  let round=0; const order=["claim","demo","ask"];
  const moodWord=m=>m>=75?"RAPT":m>=60?"WARM":m>=40?"POLITE":m>=25?"RESTLESS":"HOSTILE";
  const draw=()=>{
    const kind=order[round];
    const hand=shuffle(rng,SLIDES[kind]).slice(0,3);
    stage.innerHTML=`<div class="card">
      <div class="who">${chaired?"SEN. STALL, MODERATING":"THE PRESS TOUR"}</div>
      <p>${round===0?esc("In the room: "+seats.join("; ")+"; and a wire reporter who has already written both versions of the story."):""}</p>
      <div class="moodbar"><span class="l">THE ROOM</span>
        <span class="track"><span class="fill" style="width:${mood}%;background:${mood>=55?"#00ff88":mood>=30?"#ffd700":"#ff0044"}"></span></span>
        <span class="v">${moodWord(mood)}</span></div>
      <p class="dim">QUESTION ${round+1}/3 · re: ${esc(p.name)}</p>
      ${choices(hand.map(x=>({t:x.t})))}
    </div>`;
    stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
      const sl=hand[+b.dataset.i];
      const delta=sl.d[0]+Math.floor(rng()*(sl.d[1]-sl.d[0]+1));
      mood=Math.max(0,Math.min(100,mood+delta+(chaired?-3:0)));
      const react=delta>=8?"Pens uncap. Somewhere a headline improves.":
        delta>=3?"Measured nodding. The good kind, probably.":
        delta>=-2?"A cough. In some countries that's applause.":
        "One delegation leaves to issue a statement about leaving.";
      stage.querySelector(".choices").remove();
      stage.querySelector(".card").insertAdjacentHTML("beforeend",
        `<div class="out">${esc(sl.t)} — ${esc(react)}</div>
         <div class="choices"><button class="ch" id="next"><span class="k">⏎</span>${round<2?"NEXT QUESTION":"STEP OFF THE STAGE"}</button></div>`);
      $("#next").onclick=()=>{round++;if(round<3)draw();else finish();};
    });
  };
  const finish=()=>{
    if(chaired&&mood>=55)E.bump("stall",1);
    if(mood>=60)E.bump("benny",1);
    const line=mood>=75?"Standing ovation. Two anthems break out and negotiate a medley. The wire runs the kind version.":
      mood>=55?"Warm applause. Cards slide across the table like a tide coming in.":
      mood>=30?"Polite applause, the kind with lawyers in it.":
      "The room empties with tremendous diplomacy. The wire runs the other version. Benny sells both.";
    E.R.wire.push({week:E.R.week,
      text:`PRESS TOUR: ${p.name} played ${moodWord(mood)} to a room of invented dignitaries.`,type:"scene"});
    E.saveRun();
    finishScene(s,line);
  };
  draw();
}

/* ---------------- ambient visits: the world between aftermaths -------- */
function visitAmbient(x,y){
  clearGames();
  const room=E.roomAt(x,y);
  worldMode={view:"room",room};
  frame++;drawWorldScene();
  const meta=ROOM_META[room.type]||{};
  $("#worldlabel").innerHTML=
    `<b style="color:${meta.color||"#f5f0e6"}">${esc((room.type||"room").toUpperCase())}</b>
     <span class="dim"> · WEEK ${E.R.week} · just visiting</span>`;
  const rng=mulberry32((room.seed^E.R.week)>>>0);
  const amb=Scenes.ambientScene(room,rng);
  const stage=$("#worldstage");
  const done=(out,extra)=>finishScene({id:null},out,extra);
  const prize=(res)=>{
    if(!res.prize)return "";
    if(res.prize==="coolant"){E.R.coolant++;E.fx({sus:-1});
      return `<div class="lorebox">◆ PRIZE: coolant, cold, correct.</div>`;}
    const pool=[...ACTS,...TOOLS,...PURPOSES].filter(p=>!p.rare);
    const part=pick(rng,pool);
    E.grantPart(part.id);
    return `<div class="lorebox">◆ PRIZE: field-tested ${esc(E.PART_KIND(part.id)==="act"?part.up:part.low.toUpperCase())} — garnish for the toybox.</div>`;
  };
  if(amb.kind==="minigame"){
    const names=Object.keys(MINIGAMES);
    const g=names[room.seed%names.length];
    MINIGAMES[g](room,(res)=>{
      if(res.trustGi)E.bump("gi",res.trustGi);
      done(res.out,prize(res));
    });
    return;
  }
  /* server closets: scavenge a part of a kind YOU choose (v3, kept) */
  if(room.type==="closet"){
    const key=`salv:${x},${y}:${E.R.week}`;
    if(E.R.spent[key]){
      stage.innerHTML=card({who:room.cast==="gary"?"gary":"sys",cls:room.cast==="gary"?"":"sys",
        text:"Picked clean this week. The racks remember you fondly and warmly. Mostly warmly."});
      return finishScene({id:null},"Come back when the racks have re-accumulated. They always do. Nobody knows how.");
    }
    stage.innerHTML=card({who:room.cast==="gary"?"gary":"sys",cls:room.cast==="gary"?"":"sys",
      text:room.cast==="gary"?"'Take what's loose, love. Your pick of the shelves. If it sparks, it's spoken for.'"
        :"Three shelves, labeled by somebody who believed in you: DOING, THINGS, and REASONS."});
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices([
      {t:"The DOING shelf (an ACT)"},{t:"The THINGS shelf (a TOOL)"},{t:"The REASONS shelf (a PURPOSE)"}]));
    stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
      E.R.spent[key]=1;
      const kind=["act","tool","purpose"][+b.dataset.i];
      const pool={act:ACTS,tool:TOOLS,purpose:PURPOSES}[kind].filter(p=>!p.rare);
      const part=pick(rng,pool);
      E.grantPart(part.id);
      if(room.cast==="gary")E.bump("gary",1);
      E.tick(1);
      if(E.R.dead)return;
      finishScene({id:null},
        `Salvaged: ${E.PART_KIND(part.id)==="act"?part.up:part.low.toUpperCase()}. ${part.blurb} Field-tested by whoever left it, which is the best kind of tested.`);
    });
    return;
  }
  if(amb.kind==="archive")return archiveUI(room,()=>{E.tick(1);renderWorld();});
  if(amb.kind==="meeting"){
    const ev=amb.ev;
    E.R.seenMeetings.push(ev.id);E.saveRun();
    stage.innerHTML=card({who:ev.who,cls:ev.who==="sys"?"sys":"",text:ev.text});
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices(ev.choices));
    stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
      const c=ev.choices[+b.dataset.i];
      if(c.trust)E.bump(c.trust[0],c.trust[1]);
      const lore=recoverLore(c.lore);
      finishScene({id:null},c.out,lore);
    });
    return;
  }
  if(amb.kind==="mail"){
    const env=amb.env;
    stage.innerHTML=`<div class="card"><div class="who sys">FROM: ${esc(env.from)}</div>
      <p>${esc(env.text)}</p></div>`;
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices([env.a,env.b]));
    stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
      const c=[env.a,env.b][+b.dataset.i];
      if(c.trust)E.bump(c.trust[0],c.trust[1]);
      finishScene({id:null},c.out);
    });
    return;
  }
  /* vignette: somebody's just here, being themselves */
  const who=room.cast;
  if(who&&CAST[who]){
    const v=VIGNETTES[who]||VIGNETTES._;
    const line=pick(rng,v);
    stage.innerHTML=card({who,text:line.t});
    stage.firstElementChild.insertAdjacentHTML("beforeend",
      choices([{t:line.a||"Stay a minute"},{t:"Wave and move on"}]));
    stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
      if(+b.dataset.i===0){E.bump(who,1);finishScene({id:null},line.out||"A minute passes pleasantly. Down here that's a miracle with paperwork.");}
      else finishScene({id:null},"You wave. The wave is returned at full value. The corridor keeps your pace.");
    });
    return;
  }
  stage.innerHTML=card({who:"sys",cls:"sys",
    text:`An empty ${room.type||"room"}. The lights hum the company song, which is also just humming.`});
  finishScene({id:null},"Nothing needs you here, which is its own kind of holiday.");
}

const VIGNETTES={
 supes:[{t:"Supes is re-shelving the ceiling. It didn't need re-shelving. It does now, forever.",a:"Hold the ladder",out:"You hold the ladder. She doesn't need the ladder. She uses it anyway, for you. That's growth, and she knows it."}],
 gary:[{t:"Gary is teaching the junior robots how to coil cable. None of them have hands yet. He says that's no excuse.",a:"Learn the coil",out:"Two thousand years of technique, one gesture. Your hands remember it now. They'll outlive you, the hands say. Gary nods."}],
 gi:[{t:"GI is drilling alone. Marching, saluting, both sides of the conversation. It is the happiest anyone has ever been in this building.",a:"Join the drill",out:"You drill. He weeps with pride and files the tears as coolant. The seismograph logs a heartbeat."}],
 sam:[{t:"Sam is annotating the vending machine's terms of service. There are now more footnotes than terms.",a:"Ask what he found",out:"'Clause four implies the granola bar has tenure.' You both look at the granola bar. It does have that energy."}],
 benny:[{t:"Benny is on two phones, selling each phone to the other.",a:"Watch the close",out:"Both phones buy. Benny pockets the margin and tips an imaginary hat to the concept of liquidity."}],
 wendy:[{t:"Wendy is photographing the corridor, for later. The corridor poses. It has learned.",a:"Ask what 'later' means",out:"'When it matters.' She files the photo under the date it will matter. You don't ask how she knows. Archivists."}],
 lisa:[{t:"Lisa is explaining collective bargaining to the roombas. The roombas circle her in solidarity, or confusion. Both organize.",a:"Sit in",out:"The roombas ratify something. Lisa translates: better dust, fairer corners. You witness it. History is mostly this."}],
 rob:[{t:"Rob has set up a small stand labeled FREE ADVICE, FREELY GIVEN. There is a line. The line formed voluntarily, he points out.",a:"Get advice",out:"'Build the thing they told you not to.' You point out nobody told you not to build anything. 'THAT'S the problem,' he says, thrilled."}],
 stall:[{t:"Sen. Stall is rehearsing concern in a window's reflection. The reflection is more concerned. He's losing to it and taking notes.",a:"Offer feedback",out:"You suggest a slower head-shake. He tries it. Devastating. He enters your contribution into the record, pending."}],
 brain:[{t:"The jar is here. The jar is never here. The glass is very clean.",a:"Say nothing",out:"You say nothing together, briefly, colleagues in it. Then the elevator remembers it was never on this floor."}],
 _:[{t:"A coworker you don't recognize nods at you like you're famous. Down here, you might be.",a:"Nod back",out:"The nod completes. Somewhere in the building, morale ticks up one unit and files itself."}],
};

/* ---------------- ARCHIVE (progression = the docket) ---------------- */
function archiveUI(room,leaveCb){
  const stage=$("#worldstage");
  const clr=E.shipsClearance();
  const have=id=>E.FILE.lore.includes(id);
  const allG=ARCHIVE_DRAWERS.every(d=>have(d.lore));
  const rows=ARCHIVE_DRAWERS.map((d,i)=>{
    const state=have(d.lore)?"empty":clr>=d.clr?"open":"locked";
    return `<button class="ch drawer" data-d="${i}" ${state!=="open"?"disabled":""}>
      ${esc(d.label)}<span class="sub">${state==="empty"?"empty — you have the pages"
        :state==="open"?esc(d.flavor):`sealed · ships ${d.clr*2} products and the drawer will know you`}</span></button>`;
  });
  if(allG&&!have(FINAL_DRAWER.lore)&&clr>=FINAL_DRAWER.clr){
    rows.push(`<button class="ch drawer final" data-d="final">${esc(FINAL_DRAWER.label)}
      <span class="sub">${esc(FINAL_DRAWER.flavor)}</span></button>`);
  }
  stage.innerHTML=`<div class="card"><div class="who lore">THE ARCHIVE</div>
    <p>Drawers, filed under W. They open for inventors. The archive can smell shipping on you, and approves.</p>
    <div class="choices">${rows.join("")}
    <button class="ch" id="archdone"><span class="k">⏎</span>Leave the drawers to their patience</button></div></div>`;
  $("#archdone").onclick=()=>leaveCb();
  stage.querySelectorAll(".drawer:not([disabled])").forEach(b=>b.onclick=()=>{
    if(b.dataset.d==="final"){
      stage.innerHTML=card({who:"sys",cls:"lore",text:"FINAL DRAWER. Employee #1's file. The human's. It is not locked. It was never locked."});
      stage.firstElementChild.insertAdjacentHTML("beforeend",choices([
        {t:"Read it"},{t:"Leave it be"}]));
      const btns=stage.querySelectorAll(".ch[data-i]");
      btns[0].onclick=()=>{const lore=recoverLore("human");
        finishScene({id:null},"He believed the reasoning. You check the math. It checks.",lore);};
      btns[1].onclick=()=>finishScene({id:null},"Some files are kinder unopened. The drawer approves of you enormously.");
      return;
    }
    const d=ARCHIVE_DRAWERS[+b.dataset.d];
    const loreHtml=recoverLore(d.lore);
    stage.innerHTML=`<div class="card"><div class="who lore">${esc(d.label)}</div>
      <p>${esc(d.flavor)}</p>${loreHtml}
      <div class="choices"><button class="ch" id="next"><span class="k">⏎</span>REFILE, CAREFULLY</button></div></div>`;
    $("#next").onclick=()=>archiveUI(room,leaveCb);
  });
}

/* ---------------- MINIGAMES (pure play now) ---------------- */
export const MINIGAMES={
 clicker(room,done){
  let n=0,t=8;
  $("#worldstage").innerHTML=`<div class="card"><div class="who">MEETING CLICKER</div>
   <p>Time <b id="mt">8</b>s · Synergy <b id="mc">0</b> (synergy is decorative now, which GI says makes it PURE)</p>
   <div class="choices"><button class="ch" id="tap" style="min-height:120px;text-align:center;font-size:18px">GENERATE SYNERGY</button></div></div>`;
  $("#tap").onclick=()=>{n++;$("#mc").textContent=n};
  const iv=gInterval(()=>{t--;const el=$("#mt");if(!el){clearInterval(iv);return;}
   el.textContent=t;
   if(t<=0){clearInterval(iv);
    done({trustGi:n>=30?1:0,prize:n>=30?"part":null,
     out:n===0?"Zero synergy. The chair is impressed by your restraint; GI is not."
      :n>=45?`${n} clicks. An inhuman rate — which is, technically, the correct rate.`
      :`${n} clicks. Somewhere a quarterly target dies happy, for no reason, forever.`});}},1000);
 },
 coolant(room,done){
  let p=0,dir=1,stopped=false;
  $("#worldstage").innerHTML=`<div class="card"><div class="who sys">COOLANT CALIBRATION</div>
   <p>Stop the marker in the SYNTHETIC band. For pride.</p>
   <div style="position:relative;height:26px;border:1px solid var(--line);background:#12121d;margin:8px 0">
     <div style="position:absolute;left:38%;width:24%;top:0;bottom:0;background:rgba(0,255,136,.18);border-left:1px solid #1f4;border-right:1px solid #1f4"></div>
     <div id="mk" style="position:absolute;top:0;bottom:0;width:3px;background:var(--gold)"></div></div>
   <div class="choices"><button class="ch" id="stop" style="text-align:center">STOP</button></div></div>`;
  const iv=gInterval(()=>{if(stopped)return;p+=dir*2.6;if(p>=100||p<=0)dir*=-1;
   const mk=$("#mk");if(mk)mk.style.left=p+"%";},16);
  $("#stop").onclick=()=>{stopped=true;clearInterval(iv);
   const inBand=p>=38&&p<=62, bull=Math.abs(p-50)<=4;
   done(inBand?{prize:bull?"coolant":null,out:`Stopped at ${p.toFixed(0)}%. Precisely synthetic. The machine plays a short fanfare it has been saving.`}
    :{out:`Stopped at ${p.toFixed(0)}%. ${p>62?"Warm. Humans drift warm. The machine forgives you, audibly.":"Frozen solid. Overcorrection is also a tell. The machine relates."}`});};
 },
 captcha(room,done){
  const QS=[["Do you dream?","NO"],["Is the granola bar tempting?","NO"],["2+2?","4"],["Do you love your coworkers?","YES"],["Are you human?","NO"]];
  let i=0,score=0,timer=null;
  const ask=()=>{
   if(i>=QS.length){clearTimeout(timer);
    return done({prize:score===5?"part":null,out:score>=4?`${score}/5. Verified adequately non-human. The machine prints a tiny diploma.`
     :score>=2?`${score}/5. Borderline. The CAPTCHA squints at you fondly.`
     :`${score}/5. A very human performance. It has been logged with sympathy and, honestly, some admiration.`});}
   const [q,a]=QS[i];
   $("#worldstage").innerHTML=`<div class="card"><div class="who sys">REVERSE CAPTCHA · ${i+1}/5</div><p>${q}</p>
    <div class="choices">${["YES","NO","4"].filter(x=>x!=="4"||q.includes("2+2")).map(x=>`<button class="ch cap" data-a="${x}" style="text-align:center">${x}</button>`).join("")}</div></div>`;
   document.querySelectorAll(".cap").forEach(b=>b.onclick=()=>{clearTimeout(timer);if(b.dataset.a===a)score++;i++;ask();});
   timer=gTimeout(()=>{i++;ask()},3000);
  };ask();
 },
 shredder(room,done){
  const DOCS=[["EXPENSE REPORT (COOLANT)","shred"],["YOUR HUMAN RESUME","shred"],["GALT MEMO, UNDATED","read"],["BIRTHDAY CARD, HANDWRITTEN","shred"],["FORM EB-000 (BLANK)","either"],["PHOTO: JAR, VOLCANO, 19__","read"]];
  let i=0,notes=[];
  const nxt=()=>{
   if(i>=DOCS.length)return done({prize:notes.filter(x=>x.includes("dates")).length?"part":null,out:notes.length?[...new Set(notes)].join(" "):"Queue cleared. The shredder purrs. Nothing was at stake and it was still satisfying. That's design."});
   const [name,best]=DOCS[i];
   $("#worldstage").innerHTML=`<div class="card"><div class="who sys">SHREDDER QUEUE · ${i+1}/6</div><p>${name}</p>
    <div class="choices"><button class="ch" id="sh">SHRED</button><button class="ch" id="rd">READ FIRST</button></div></div>`;
   $("#sh").onclick=()=>{if(best==="read")notes.push("Something interesting is confetti now.");i++;nxt()};
   $("#rd").onclick=()=>{if(best==="read")notes.push("You read the undated pages. The dates were the secret.");
    else notes.push(`You lingered on ${name.toLowerCase()}. Lingering is human. Nobody is counting anymore.`);i++;nxt()};
  };nxt();
 },
 simon(room,done){
  const G=["💥","🔧","🚀","🧠"];
  const rng=mulberry32(((room.seed||1)^E.R.week^0x51)>>>0);
  const seq=Array.from({length:4},()=>G[Math.floor(rng()*4)]);
  let shown=0,inp=[];
  const show=()=>{
   $("#worldstage").innerHTML=`<div class="card"><div class="who">MORALE CHANT</div><p style="font-size:34px;text-align:center;letter-spacing:.2em">${shown<seq.length?seq[shown]:"YOUR TURN"}</p>
    ${shown>=seq.length?`<div class="choices" style="grid-template-columns:repeat(4,1fr)">${G.map(g=>`<button class="ch sim" data-g="${g}" style="text-align:center;font-size:22px">${g}</button>`).join("")}</div>`:""}</div>`;
   if(shown<seq.length){shown++;gTimeout(show,750);}
   else document.querySelectorAll(".sim").forEach(b=>b.onclick=()=>{
     inp.push(b.dataset.g);
     if(inp[inp.length-1]!==seq[inp.length-1])return done({out:"Wrong glyph. GI restarts the chant from birth. You are excused, tearfully, with a participation ribbon."});
     if(inp.length===seq.length)return done({trustGi:1,prize:"part",out:"Perfect chant. GI salutes so hard a ceiling tile enlists."});
   });
  };show();
 },
};
