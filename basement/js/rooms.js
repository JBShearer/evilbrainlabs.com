/* ============================================================ rooms.js
   v3 — THE SHOP AND THE SUMMONS. The shop is home: one room, always
   available, full build UI, ship after ship after ship. The labyrinth
   still exists, but you never wander it. You are taken. Every screen
   away from the bench is a tax with a face on it.
================================================================ */
import * as E from "./engine.js";
import {mulberry32,pick,shuffle} from "./gen.js";
import {ACTS,TOOLS,PURPOSES,MODS,CAST,MEETINGS,HAZARDS,SLIDES,
        LEADER_TITLES,LEADER_LANDS,FUNDERS,MAIL,ARCHIVE_DRAWERS,FINAL_DRAWER,
        LORE,ROOM_META,cap} from "./data.js";
import {drawRoom,drawShop,drawProduct,drawNapkin,makeCanvas} from "./art.js";
import * as Ledger from "./ledger.js";
import * as Summons from "./summons.js";

export const esc=s=>String(s??"").replace(/[<>&]/g,m=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[m]));
const $=s=>document.querySelector(s);

let sceneCtx=null, frame=0, flickerTimer=null;
let scene={mode:"shop", room:null};

export function mountScene(){
  const wrap=$("#scenewrap");
  const {c,ctx}=makeCanvas(320,240);
  wrap.prepend(c);
  sceneCtx=ctx;
  clearInterval(flickerTimer);
  flickerTimer=setInterval(()=>{
    if(document.hidden)return;
    if($("#view-shop").classList.contains("hidden"))return;
    frame++;drawScene();
  },420);
}
export function drawScene(){
  if(!sceneCtx)return;
  if(!E.R){bootCard(sceneCtx);return;}
  if(scene.mode==="room"&&scene.room)drawRoom(sceneCtx,scene.room,frame);
  else drawShop(sceneCtx,frame,{
    product:E.R.product, summonses:E.R.summons.length,
    streak:E.R.streak, subpoena:!!E.R.subpoena});
}
function bootCard(ctx){
  ctx.fillStyle="#07070b";ctx.fillRect(0,0,320,240);
  ctx.save();ctx.shadowColor="#ff006e";ctx.shadowBlur=16;
  ctx.fillStyle="#ff006e";ctx.fillRect(136,74,48,36);
  ctx.fillStyle="#d90056";
  ctx.fillRect(130,84,6,14);ctx.fillRect(184,84,6,14);
  ctx.fillRect(146,82,10,4);ctx.fillRect(162,92,10,4);ctx.fillRect(146,100,10,4);
  ctx.restore();
  ctx.fillStyle="#06b6d4";ctx.fillRect(146,88,8,8);ctx.fillRect(166,88,8,8);
  ctx.fillStyle="#fff";ctx.fillRect(148,90,3,3);ctx.fillRect(168,90,3,3);
  ctx.fillStyle="#00ff88";ctx.font="10px ui-monospace,monospace";ctx.textAlign="center";
  ctx.fillText("EVIL BRAIN LABS",160,136);
  ctx.fillStyle="#8b8ba0";ctx.font="8px ui-monospace,monospace";
  ctx.fillText("SUBLEVEL B · CERTIFY AT THE DOOR",160,152);
}

/* ---------------- shared helpers ---------------- */
function card({who,cls="",text,foot=""}){
  const name=who? (CAST[who]?.name||who.toUpperCase()) : "";
  return `<div class="card">${who?`<div class="who ${cls}">${esc(name)}</div>`:""}
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
  if(!L)return "";
  return `<div class="lorebox">◈ RECOVERED: ${esc(L.t)}\n${esc(L.x)}</div>`;
}
function bindChoices(container,list,after){
  container.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
    const c=list[+b.dataset.i];
    E.fx(c.fx||{});
    if(c.trust)E.bump(c.trust[0],c.trust[1]);
    c._loreHtml=recoverLore(c.lore);
    if(E.R.dead)return;
    after(c);
  });
}
function outcome(container,c,then="CONTINUE",cb){
  const ch=container.querySelector(".choices");
  if(ch)ch.remove();
  container.querySelector(".card")?.insertAdjacentHTML("beforeend",
    `<div class="out">${esc(c.out||"Noted.")}</div>${c._loreHtml||""}
     <div class="choices"><button class="ch" id="next"><span class="k">⏎</span>${esc(then)}</button></div>`);
  $("#next").onclick=cb;
}
let gameTimers=[];
const gInterval=(fn,ms)=>{const t=setInterval(fn,ms);gameTimers.push(t);return t;};
const gTimeout=(fn,ms)=>{const t=setTimeout(fn,ms);gameTimers.push(t);return t;};
const clearGames=()=>{gameTimers.forEach(t=>{clearInterval(t);clearTimeout(t);});gameTimers=[];};

const PARTS_BY={act:Object.fromEntries(ACTS.map(p=>[p.id,p])),
  tool:Object.fromEntries(TOOLS.map(p=>[p.id,p])),
  purpose:Object.fromEntries(PURPOSES.map(p=>[p.id,p]))};
const partLabel=(kind,id)=>{
  const p=PARTS_BY[kind][id];
  return kind==="act"?p.up:p.low.toUpperCase();
};
const hasAllParts=()=>E.R.inv.act.length&&E.R.inv.tool.length&&E.R.inv.purpose.length;
const totalParts=()=>E.R.inv.act.length+E.R.inv.tool.length+E.R.inv.purpose.length;
function bars(s){
  const bar=(label,v,col)=>`<div class="bar"><span class="l">${label}</span>
    <span class="track"><span class="fill" style="width:${Math.min(100,v/15*100)}%;background:${col}"></span></span>
    <span class="v">${v}</span></div>`;
  return bar("MARGIN",s.mg,"#ffd700")+bar("MAYHEM",s.mh,"#ff0044")+bar("MERCY",s.mc,"#00ff88");
}
function grantRandomPart(rng){
  const kind=pick(rng,["act","tool","purpose"]);
  const pool={act:ACTS,tool:TOOLS,purpose:PURPOSES}[kind].filter(p=>!p.rare);
  const part=pick(rng,pool);
  E.grantPart(kind,part.id);
  return `${partLabel(kind,part.id)} (${kind.toUpperCase()})`;
}

/* ================================================================
   THE SHOP
================================================================ */
export function renderShop(){
  if(E.R?.dead)return;                 /* the death screen owns the stage */
  clearGames();
  scene={mode:"shop",room:null};
  frame++;drawScene();
  const R=E.R;
  const sMult=E.streakMult(R.streak+(R.role==="SHIPWRIGHT"?1:0));
  $("#roomlabel").innerHTML=
    `<b style="color:#ffd700">THE SHOP</b>
     <span class="dim"> · WEEK ${R.week} · SHIPPED ${R.ships}</span>
     ${R.streak>1?`<span class="streak">STREAK ×${sMult.toFixed(2)}</span>`:""}`;
  const stage=$("#stage");
  stage.innerHTML="";

  /* invasions resolve before anything else — it found you */
  if(R.invasion){invasionUI(R.invasion);return;}

  /* the shutter: pending summonses */
  for(const s of R.summons){
    const sub=Summons.isSubpoenaed(s);
    stage.insertAdjacentHTML("beforeend",
      `<div class="card summons ${sub?"subpoena":""}">
        <div class="who ${sub?"":"sys"}">${sub?"⚠ SUBPOENA":"THE SHUTTER"}</div>
        <p>${esc(Summons.arriveText(s))}</p>
        <div class="choices">
          <button class="ch attend" data-s="${s.id}"><span class="k">▸</span>${sub?"ANSWER IT (you have no choice left)":"ATTEND"}<span class="sub">costs shop time · breaks the streak</span></button>
          ${sub?"":`<button class="ch ignore" data-s="${s.id}"><span class="k">✕</span>IGNORE<span class="sub">${s.ducked?"they asked once already":"keep shipping, let it simmer"}</span></button>`}
        </div></div>`);
  }

  /* the bench */
  const btn=(id,label,sub,dis)=>`<button class="ch" id="${id}" ${dis?"disabled":""}>${esc(label)}${sub?`<span class="sub">${esc(sub)}</span>`:""}</button>`;
  const bits=[];
  if(R.product){
    bits.push(btn("v-prod","▤ ON THE BENCH: "+R.product.name,
      R.product.pitched?"pitched · funder warm":"ready when you are"));
    bits.push(btn("v-ship","🚀 SHIP IT",
      R.subpoena?"SUSPENDED — the subpoena is nailed to the shutter":
      `streak would pay ×${E.streakMult(R.streak+1+(R.role==="SHIPWRIGHT"?1:0)).toFixed(2)}`,
      !!R.subpoena));
  } else {
    bits.push(btn("v-bench","⚗ BENCH BUILD",
      hasAllParts()?benchPartnerLabel():"needs one ACT, one TOOL, one PURPOSE",!hasAllParts()));
    bits.push(btn("v-nap","☕ NAPKIN SKETCH",
      R.inv.napkins?`napkins ×${R.inv.napkins} · chaos included`:"no napkins (the chute sells visionary single-ply)",
      !R.inv.napkins||!hasAllParts()));
  }
  bits.push(btn("v-chute","▣ PROCUREMENT CHUTE",
    `SYNERGY ${R.syn} · parts ${R.inv.act.length}/${R.inv.tool.length}/${R.inv.purpose.length} · napkins ${R.inv.napkins}`));
  if(R.doom>=2)bits.push(btn("v-ext","⌸ FILE FOR EXTENSION",
    R.spent["ext:"+R.week]?"granted this week already":`${15+10*(R.extUsed||0)} SYNERGY · doom −1`));
  if(totalParts()<3&&!R.spent["scrap:"+R.week])
    bits.push(btn("v-scrap","▦ THE SCRAP BIN","something usable, free, weekly, judged"));
  stage.insertAdjacentHTML("beforeend",
    `<div class="card roomcard"><div class="choices" id="shopacts">${bits.join("")}</div></div>`);

  wireShop();
}
export const renderFloor=renderShop;   /* old name, same home */

function benchPartnerLabel(){
  const p=benchPartner();
  return p==="supes"?"SUPES is leaning on the bench (+1 all, +2 mayhem)":
         p==="gary"?"GARY is leaning on the bench (+1 mercy, honest wobble check)":
         "the bench is yours alone this week";
}
function benchPartner(){
  const h=mulberry32((E.R.seed^(E.R.week*77))>>>0)();
  return h<.15?"supes":h<.3?"gary":null;
}

function wireShop(){
  const stage=$("#stage");
  const on=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
  stage.querySelectorAll(".attend").forEach(b=>b.onclick=()=>{
    const s=E.R.summons.find(x=>x.id===b.dataset.s);
    if(s)attend(s);
  });
  stage.querySelectorAll(".ignore").forEach(b=>b.onclick=()=>{
    const s=E.R.summons.find(x=>x.id===b.dataset.s);
    if(!s)return;
    const res=Summons.duck(s);
    E.emit("toast",res.out);
    if(!E.R.dead)renderShop();
  });
  on("#v-prod",()=>productCard());
  on("#v-ship",()=>shipUI());
  on("#v-bench",()=>benchUI());
  on("#v-nap",()=>napkinUI());
  on("#v-chute",()=>chuteUI());
  on("#v-ext",()=>extensionUI());
  on("#v-scrap",()=>scrapUI());
}

/* ---------------- BENCH BUILD (full UI, revealed stats) ---------------- */
function benchUI(){
  const stage=$("#stage");
  const rng=mulberry32((E.R.seed^(E.R.week*31))>>>0);
  const modOffer=MODS[Math.floor(rng()*MODS.length)];
  const partner=benchPartner();
  const sel={act:E.R.inv.act[0],tool:E.R.inv.tool[0],purpose:E.R.inv.purpose[0],mod:null};
  stage.innerHTML=`<div class="card">
    <div class="who">${partner? esc(CAST[partner].name)+" · AT YOUR BENCH":"THE BENCH"}</div>
    <p>${partner==="supes"?"'I pre-heated the sockets! They didn't need heat! They have it now!'"
       :partner==="gary"?"'Measure twice, love. The third measure is for luck.'"
       :"Your bench. Your sockets. The readout tells the truth; it's the only thing down here that does."}</p>
    <div id="sockets"></div>
    <div id="statbars"></div>
    <div id="modrow"></div>
    <div class="choices"><button class="ch" id="assemble"><span class="k">⚗</span>ASSEMBLE</button>
    <button class="ch" id="benchback"><span class="k">✕</span>Step back</button></div></div>`;
  const drawSockets=()=>{
    $("#sockets").innerHTML=["act","tool","purpose"].map(kind=>{
      const opts=[...new Set(E.R.inv[kind])];
      return `<div class="socket"><div class="socklabel">${kind.toUpperCase()}</div>
        ${opts.map(id=>`<button class="chip ${kind} ${sel[kind]===id?"laid":""}" data-k="${kind}" data-id="${id}">${esc(partLabel(kind,id))}</button>`).join("")}
      </div>`;
    }).join("");
    $("#modrow").innerHTML=`<div class="socket"><div class="socklabel">MOD SOCKET · THIS WEEK</div>
      <button class="chip mod ${sel.mod?"laid":""}" id="modbtn">${esc(modOffer.name)}<span class="sub">${sel.mod?"installed":"5 SYNERGY · "+esc(modOffer.blurb)}</span></button></div>`;
    $("#modbtn").onclick=()=>{
      if(sel.mod){sel.mod=null;drawSockets();return;}
      if(!E.spend(5)){E.emit("toast","Synergy insufficient. The mod stays in the drawer.");return;}
      sel.mod=modOffer.id;drawSockets();
    };
    $("#sockets").querySelectorAll(".chip").forEach(el=>el.onclick=()=>{
      sel[el.dataset.k]=el.dataset.id;drawSockets();
    });
    const a=PARTS_BY.act[sel.act],t=PARTS_BY.tool[sel.tool],p=PARTS_BY.purpose[sel.purpose];
    let mg=a.mg+t.mg+p.mg, mh=a.mh+t.mh+p.mh, mc=a.mc+t.mc+p.mc;
    if(sel.mod){const m=MODS.find(m=>m.id===sel.mod);mg+=m.d.mg;mh+=m.d.mh;mc+=m.d.mc;}
    if(partner==="supes"){mg+=1;mh+=3;mc+=1;}
    if(partner==="gary"){mc+=1;}
    $("#statbars").innerHTML=bars({mg,mh,mc});
  };
  drawSockets();
  $("#benchback").onclick=()=>renderShop();
  $("#assemble").onclick=()=>{
    E.consumeParts(sel.act,sel.tool,sel.purpose);
    const mods=sel.mod?[sel.mod]:[];
    const p=E.makeProduct(sel.act,sel.tool,sel.purpose,"lab",mods);
    if(partner==="supes"){p.stats.mg+=1;p.stats.mh+=3;p.stats.mc+=1;p.notes.push("SUPES HELPED");}
    if(partner==="gary"){p.stats.mc+=1;p.notes.push("GARY CHECKED THE WOBBLE");}
    for(const k of ["mg","mh","mc"])p.stats[k]=Math.max(0,Math.min(15,p.stats[k]));
    if(partner)E.bump(partner,1);
    E.saveRun();E.tick(1);
    if(E.R.dead)return;
    productCard("Assembled to spec. The spec is the part that should worry you.");
  };
}

/* ---------------- NAPKIN CORNER ---------------- */
function napkinUI(){
  const stage=$("#stage");
  const slots={act:null,tool:null,purpose:null};
  stage.innerHTML=`<div class="card">
    <div class="who">THE NAPKIN CORNER</div>
    <p>Sketch it like you mean it. The grease decides the rest.</p>
    <div id="napwrap"></div>
    <div id="napparts"></div>
    <div class="choices"><button class="ch" id="scrawl" disabled><span class="k">✎</span>SCRAWL THE NAME</button>
    <button class="ch" id="napback"><span class="k">✕</span>Put the napkin down</button></div></div>`;
  const {c,ctx}=makeCanvas(300,170);
  $("#napwrap").appendChild(c);
  const napSeed=(E.R.seed^E.R.builds)>>>0;
  const redraw=()=>{
    drawNapkin(ctx,300,170,napSeed);
    const laid=Object.entries(slots).filter(([,v])=>v);
    laid.forEach(([kind,v],i)=>{
      ctx.save();ctx.translate(62+i*88,86+((i%2)*14));ctx.rotate((i-1)*.08);
      ctx.strokeStyle="#4a4238";ctx.lineWidth=2;ctx.strokeRect(-26,-20,52,40);
      ctx.fillStyle="#4a4238";ctx.font="7px ui-monospace,monospace";ctx.textAlign="center";
      ctx.fillText(partLabel(kind,v),0,28);
      ctx.restore();
    });
    if(laid.length===3){
      const a=PARTS_BY.act[slots.act],t=PARTS_BY.tool[slots.tool],p=PARTS_BY.purpose[slots.purpose];
      drawProduct(ctx,150,80,64,{seed:napSeed,stats:{mg:0,mh:0,mc:0},act:a,tool:t,purpose:p},"sketch");
    }
  };
  redraw();
  const parts=$("#napparts");
  const chips=[];
  for(const kind of ["act","tool","purpose"])
    for(const id of [...new Set(E.R.inv[kind])])chips.push({kind,id});
  parts.innerHTML=chips.map((p,i)=>
    `<button class="chip ${p.kind}" data-i="${i}">${esc(partLabel(p.kind,p.id))}<span class="sub">${p.kind.toUpperCase()}</span></button>`).join("");
  const update=()=>{
    $("#scrawl").disabled=!(slots.act&&slots.tool&&slots.purpose);
    parts.querySelectorAll(".chip").forEach(el=>{
      const p=chips[+el.dataset.i];
      el.classList.toggle("laid",slots[p.kind]===p.id);
    });
    redraw();
  };
  parts.querySelectorAll(".chip").forEach(el=>{
    const place=()=>{const p=chips[+el.dataset.i];slots[p.kind]=p.id;update();};
    el.onclick=place;
    el.onpointerdown=(ev)=>{
      const p=chips[+el.dataset.i];
      let ghost=null;
      const move=(e)=>{
        if(!ghost){ghost=el.cloneNode(true);ghost.className="chip ghost";document.body.appendChild(ghost);}
        ghost.style.left=(e.clientX-30)+"px";ghost.style.top=(e.clientY-46)+"px";
      };
      const up=(e)=>{
        removeEventListener("pointermove",move);removeEventListener("pointerup",up);
        if(ghost){ghost.remove();
          const r=c.getBoundingClientRect();
          if(e.clientX>r.left&&e.clientX<r.right&&e.clientY>r.top&&e.clientY<r.bottom){slots[p.kind]=p.id;update();}
        }
      };
      addEventListener("pointermove",move);addEventListener("pointerup",up);
    };
  });
  $("#napback").onclick=()=>renderShop();
  $("#scrawl").onclick=()=>{
    if(!(slots.act&&slots.tool&&slots.purpose))return;
    E.consumeParts(slots.act,slots.tool,slots.purpose);
    E.R.inv.napkins--;
    E.makeProduct(slots.act,slots.tool,slots.purpose,"napkin");
    E.tick(1);
    if(E.R.dead)return;
    productCard("Scrawled. The napkin approves, greasily. Stats unknown — that's the napkin's whole philosophy.");
  };
}

/* ---------------- CHUTE, EXTENSION, SCRAP ---------------- */
function chuteUI(){
  const stage=$("#stage");
  const STOCK=[
    {k:"part",  n:"COMPONENT, ASSORTED",cost:5, b:"Rattles in a promising way."},
    {k:"napkin",n:"NAPKIN, SINGLE-PLY, VISIONARY",cost:3, b:"Pre-stained with potential."},
    {k:"coolant",n:"COOLANT (COLD)",cost:4, b:"Suspicion −1. Synthetic and proud."},
  ];
  stage.innerHTML=`<div class="card">
    <div class="who sys">THE PROCUREMENT CHUTE</div>
    <p>It thuds when it has something for you. It is always ready to have something for you, at a price it calls 'friendship.'</p>
    <div class="choices">${STOCK.map((s,i)=>
      `<button class="ch" data-i="${i}">${esc(s.n)}<span class="sub">${s.cost} SYNERGY · ${esc(s.b)}</span></button>`).join("")}
    <button class="ch" id="chuteback"><span class="k">✕</span>Back to the bench</button></div></div>`;
  $("#chuteback").onclick=()=>renderShop();
  stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
    const s=STOCK[+b.dataset.i];
    if(!E.spend(s.cost)){E.emit("toast","DECLINED. The chute displays your balance to the room, helpfully.");return;}
    let out="Thud.";
    if(s.k==="part"){const rng=mulberry32((E.R.seed^E.R.chuteBought++)>>>0);
      out="Thud: "+grantRandomPart(rng)+".";}
    if(s.k==="napkin"){E.R.inv.napkins++;out="Thud: one napkin, pre-visionary. The grease is complimentary.";}
    if(s.k==="coolant"){E.R.inv.coolant++;E.fx({sus:-1});out="Thud: coolant, cold, correct. The room seems less suspicious already.";}
    E.saveRun();
    E.emit("toast",out);
    chuteUI();
  });
}
function extensionUI(){
  const key="ext:"+E.R.week;
  const cost=15+10*(E.R.extUsed||0);
  if(E.R.spent[key])return holdOn("One extension per week. The clock is patient, not gullible.");
  if(E.R.doom<2)return holdOn("Nothing to extend. The clock looks at you, flattered but confused.");
  if(!E.spend(cost))return holdOn(`The extension costs ${cost} SYNERGY now. Each one costs more; the clock read a book about scarcity and loved it.`);
  E.R.spent[key]=1;
  E.R.extUsed=(E.R.extUsed||0)+1;
  E.R.doom=Math.max(0,E.R.doom-1);
  E.saveRun();
  const stage=$("#stage");
  stage.innerHTML=card({who:"sys",cls:"sys",
    text:"FILING EXTENSION GRANTED. Doomsday has been rescheduled by one unit of doom, per form EB-EXT-1, in triplicate. The clock signs all three copies without reading them. It has read enough."});
  outcome(stage,{out:"DOOM −1. Somewhere upstairs, an actuary feels a chill and bills for it."},"BACK TO THE BENCH",()=>{E.tick(1);if(!E.R.dead)renderShop();});
}
function scrapUI(){
  const key="scrap:"+E.R.week;
  if(E.R.spent[key])return renderShop();
  E.R.spent[key]=1;
  const rng=mulberry32((E.R.seed^(E.R.week*13))>>>0);
  const got=grantRandomPart(rng);
  E.saveRun();
  const stage=$("#stage");
  stage.innerHTML=card({who:"sys",cls:"sys",
    text:"THE SCRAP BIN. Officially it does not exist. Unofficially it is the most reliable supplier in the building."});
  outcome(stage,{out:`You fish out: ${got}. The bin watches you take it, the way bins do.`},"BACK TO THE BENCH",()=>renderShop());
}

/* ---------------- product + ship ---------------- */
function productCard(note){
  const stage=$("#stage");
  const p=E.R.product;
  if(!p)return renderShop();
  stage.innerHTML=`<div class="card">
    <div class="who">${esc(p.name)}</div>
    <div id="prodart"></div>
    <p class="dim">${esc(p.subtitle)} · built on ${p.builtIn==="napkin"?"a napkin":"the bench"}</p>
    ${p.revealed?bars(p.stats):`<p class="dim">Stats: the napkin knows. You don't. That's the deal.</p>`}
    ${p.notes.length?`<p class="dim">${esc(p.notes.join(" · "))}</p>`:""}
    ${note?`<div class="out">${esc(note)}</div>`:""}
    <div class="choices">
      <button class="ch" id="pship" ${E.R.subpoena?"disabled":""}><span class="k">🚀</span>${E.R.subpoena?"SHIPPING SUSPENDED (SUBPOENA)":"SHIP IT"}</button>
      <button class="ch" id="pback"><span class="k">⏎</span>Back to the bench</button>
    </div></div>`;
  const {c,ctx}=makeCanvas(140,90);
  $("#prodart").appendChild(c);
  ctx.fillStyle="#0a0a12";ctx.fillRect(0,0,140,90);
  drawProduct(ctx,70,48,60,p,"full");
  $("#pship").onclick=()=>shipUI();
  $("#pback").onclick=()=>renderShop();
}

function shipUI(){
  const stage=$("#stage");
  const p=E.R.product;
  if(!p||E.R.subpoena)return renderShop();
  const funder=p.funder;
  const doShip=(f)=>{E.ship(f);};
  if(funder){
    stage.innerHTML=card({who:"sys",cls:"sys",
      text:`SHIP ${p.name}?\n${p.subtitle}.\nFunder: ${funder.name}.\nShipping is permanent. So is the docket.`});
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices([{t:"SHIP IT"},{t:"Not yet"}]));
    const btns=stage.querySelectorAll(".ch[data-i]");
    btns[0].onclick=()=>doShip(funder);
    btns[1].onclick=()=>renderShop();
    return;
  }
  const rng=mulberry32((p.seed^0x5919)>>>0);
  const offers=shuffle(rng,FUNDERS).slice(0,2);
  stage.innerHTML=card({who:"sys",cls:"sys",
    text:`SHIP ${p.name}?\n${p.subtitle}.\nNo funder attached. Money will be found. Money is always found.`});
  stage.firstElementChild.insertAdjacentHTML("beforeend",choices(
    offers.map(f=>({t:"Wire from "+f.name})).concat([{t:"Petty cash (no strings, no cushion)"},{t:"Not yet"}])));
  stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i;
    if(i===offers.length+1)return renderShop();
    doShip(i<offers.length?offers[i]:null);
  });
}

/* ================================================================
   BEING TAKEN — the attend flow
================================================================ */
function destinationRoom(s){
  const {x,y}=E.roomForSummons(s);
  const room=E.roomAt(x,y);
  room.type=Summons.TYPES[s.type].room;
  room.cast=Summons.TYPES[s.type].who||room.cast;
  if(s.type==="lunch")room.cast=s.payload?.castId||room.cast;
  return room;
}

function attend(s){
  if(E.R?.dead)return;
  clearGames();
  const room=destinationRoom(s);
  scene={mode:"room",room};
  frame++;drawScene();
  const meta=ROOM_META[room.type]||{};
  $("#roomlabel").innerHTML=
    `<b style="color:${meta.color||"#f5f0e6"}">TAKEN: ${esc((room.type||"").toUpperCase())}</b>
     <span class="dim"> · WEEK ${E.R.week} · the bench waits</span>`;
  /* the corridor bites on the way, sometimes */
  if(Math.random()<.25){
    const stage=$("#stage");
    const rng=mulberry32((room.seed^E.R.week)>>>0);
    const hz=pick(rng,HAZARDS);
    stage.innerHTML=card({who:"sys",cls:"sys",text:"On the way over: "+hz.text});
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices([hz.a,hz.b]));
    bindChoices(stage,[hz.a,hz.b],(c)=>outcome(stage,c,"KEEP MOVING",()=>{
      if(!E.R.dead)playBody(s,room);
    }));
    return;
  }
  playBody(s,room);
}

function finishSummons(s,extraNote){
  const T=Summons.TYPES[s.type];
  let notes=[];
  if(T.rewards){
    const rng=mulberry32((E.R.seed^E.R.summonsServed^0xF00D)>>>0);
    if(T.rewards.part)notes.push("COMP PACKAGE: "+grantRandomPart(rng));
    if(T.rewards.coolant){E.R.inv.coolant++;E.fx({sus:-1});notes.push("COMP PACKAGE: coolant, cold.");}
    if(T.rewards.clr){E.fx({clr:T.rewards.clr});notes.push("You saw something you weren't meant to. CLEARANCE +"+T.rewards.clr+".");}
    if(T.rewards.sus){E.fx({sus:T.rewards.sus});notes.push("Your file breathes easier. SUSPICION "+T.rewards.sus+".");}
    if(T.rewards.trust)E.bump(T.rewards.trust[0],T.rewards.trust[1]);
  }
  Summons.resolve(s);
  E.tick(2);                                   /* the tax is time */
  if(E.R.dead)return;
  const stage=$("#stage");
  stage.innerHTML=card({who:"sys",cls:"sys",
    text:"RELEASED. "+(extraNote||"The matter is considered handled, which is the building's warmest word.")+
      (notes.length?"\n"+notes.join("\n"):"")});
  outcome(stage,{out:"The shop is where you left it. The streak is not."},"BACK TO THE BENCH",()=>{
    scene={mode:"shop",room:null};
    renderShop();
    E.emit("attended");
  });
}

function playBody(s,room){
  const T=Summons.TYPES[s.type];
  const stage=$("#stage");
  if(T.body==="hearing"){
    const spec=Ledger.hearingCard(s.payload.hook);
    stage.innerHTML=card({who:spec.who,cls:spec.who==="sys"?"sys":"",text:spec.text});
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices(spec.choices));
    bindChoices(stage,spec.choices,(c)=>outcome(stage,c,"THE RECORD CLOSES",()=>finishSummons(s)));
    return;
  }
  if(T.body==="choices"){
    stage.innerHTML=card({who:T.who,text:T.event.text});
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices(T.event.choices));
    bindChoices(stage,T.event.choices,(c)=>outcome(stage,c,"HEAD BACK",()=>finishSummons(s)));
    return;
  }
  if(T.body==="minigame"){
    MINIGAMES[T.game](room,(res)=>{
      E.fx(res.fx||{});
      if(res.trustGi)E.bump("gi",res.trustGi);
      if(E.R.dead)return;
      finishSummons(s,res.out);
    });
    return;
  }
  if(T.body==="meeting"){
    const who=s.payload?.castId;
    const pool=MEETINGS.filter(m=>(!who||m.who===who)&&!E.R.seenMeetings.includes(m.id)
      &&(!m.req||m.req(E.R))&&(!m.reqTrust||E.trust(m.reqTrust[0])>=m.reqTrust[1]));
    const rng=mulberry32((room.seed^E.R.week)>>>0);
    if(!pool.length){
      E.bump(who,1);E.fx({syn:2});
      return finishSummons(s,(CAST[who]?.name||"They")+" mostly wanted company. Eleven quiet minutes. TRUST +1, SYNERGY +2, somehow.");
    }
    const ev=pick(rng,pool);
    E.R.seenMeetings.push(ev.id);E.saveRun();
    stage.innerHTML=card({who:ev.who,cls:ev.who==="sys"?"sys":"",text:ev.text});
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices(ev.choices));
    bindChoices(stage,ev.choices,(c)=>outcome(stage,c,"HEAD BACK",()=>finishSummons(s)));
    return;
  }
  if(T.body==="mail"){
    const rng=mulberry32((room.seed^E.R.week^0x3A11)>>>0);
    const env=pick(rng,MAIL);
    stage.innerHTML=`<div class="card"><div class="who sys">FROM: ${esc(env.from)}</div>
      <p>${esc(env.text)}</p></div>`;
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices([env.a,env.b]));
    bindChoices(stage,[env.a,env.b],(c)=>{
      let out=c.out;
      if(c.kind==="part")out+=" ("+grantRandomPart(rng)+")";
      if(c.kind==="coolant"){E.R.inv.coolant++;E.fx({sus:-1});}
      if(c.kind==="napkin")E.R.inv.napkins++;
      E.saveRun();
      outcome(stage,{...c,out},"HEAD BACK",()=>finishSummons(s));
    });
    return;
  }
  if(T.body==="archive"){
    archiveUI(room,()=>finishSummons(s,"Wendy signs your witness line without looking up. From her, that's a medal."));
    return;
  }
  if(T.body==="pitch"){
    runPitch(room,()=>finishSummons(s,"The delegation files out, translating each other's applause."));
    return;
  }
  if(T.body==="exec"){
    const ev={who:"brain",text:"You came. Noted, weighted, filed. You get one question, and I have already predicted it, and the prediction is why you're still employed. Ask.",
      choices:[
        {t:"Why do we ship any of this?",fx:{clr:1,syn:4},lore:"g5",out:"'Because the world only reads the recall notice. The product is the envelope.' The line ends. You check the math later. It checks."},
        {t:"Who were the seven donors?",fx:{clr:1,doom:1},lore:"cover",out:"A pause of exactly one clock cycle. 'Seven very optimal people.' The cover holds — barely."},
        {t:"Do you miss him?",fx:{sus:2,clr:1},lore:"g3",out:"No answer is also an answer. The jar's glass is very clean. Someone cleans it daily and never says who."}]};
    stage.innerHTML=card({who:ev.who,text:ev.text});
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices(ev.choices));
    bindChoices(stage,ev.choices,(c)=>outcome(stage,c,"LEAVE, QUIETLY",()=>finishSummons(s)));
    return;
  }
  finishSummons(s);
}

/* ---------------- invasions: it found you ---------------- */
function invasionUI(inv){
  const T=Summons.TYPES[inv.type];
  const stage=$("#stage");
  stage.innerHTML=card({who:T.who,text:T.invadeText||"It is here. In the shop. Standing where the light is."});
  stage.firstElementChild.insertAdjacentHTML("beforeend",
    `<div class="choices"><button class="ch" id="face"><span class="k">▸</span>FACE IT</button></div>`);
  $("#face").onclick=()=>{
    if(T.body==="minigame"){
      MINIGAMES[T.game]({seed:(E.R.seed^0xDEAD)>>>0},(res)=>{
        const fx={...(res.fx||{})};
        if((fx.sus||0)>0)fx.sus+=1;              /* it goes worse at home */
        if((fx.syn||0)>0)fx.syn=Math.floor(fx.syn/2);
        E.fx(fx);
        if(E.R.dead)return;
        Summons.clearInvasion();
        E.tick(1);
        if(E.R.dead)return;
        const st=$("#stage");
        st.innerHTML=card({who:T.who,text:"It leaves satisfied. The shop smells faintly of protocol."});
        outcome(st,{out:res.out+" No comp package. Home games pay nothing."},"BACK TO THE BENCH",()=>renderShop());
      });
    } else {
      E.fx({doom:1});
      Summons.clearInvasion();
      E.tick(1);
      if(E.R.dead)return;
      const st=$("#stage");
      st.innerHTML=card({who:T.who,text:T.invadeText||"It happened. Here."});
      outcome(st,{out:"It is handled, at home, expensively. DOOM +1. The bench pretends not to have seen."},"BACK TO THE BENCH",()=>renderShop());
    }
  };
}

/* ---------------- ARCHIVE (drawers, reused by records summons) ---------------- */
function archiveUI(room,leaveCb){
  const stage=$("#stage");
  const have=id=>E.FILE.lore.includes(id);
  const allG=ARCHIVE_DRAWERS.every(d=>have(d.lore));
  const rows=ARCHIVE_DRAWERS.map((d,i)=>{
    const state=have(d.lore)?"empty":E.R.clr>=d.clr?"open":"locked";
    return `<button class="ch drawer" data-d="${i}" ${state!=="open"?"disabled":""}>
      ${esc(d.label)}<span class="sub">${state==="empty"?"empty — you have the pages"
        :state==="open"?esc(d.flavor):"sealed · clearance "+d.clr+" required"}</span></button>`;
  });
  if(allG&&!have(FINAL_DRAWER.lore)&&E.R.clr>=FINAL_DRAWER.clr){
    rows.push(`<button class="ch drawer final" data-d="final">${esc(FINAL_DRAWER.label)}
      <span class="sub">${esc(FINAL_DRAWER.flavor)}</span></button>`);
  }
  stage.innerHTML=`<div class="card"><div class="who lore">THE ARCHIVE</div>
    <p>Drawers, filed under W. You were summoned to witness one; nobody said you couldn't look at the others.</p>
    <div class="choices">${rows.join("")}
    <button class="ch" id="archdone"><span class="k">⏎</span>Sign the witness line and go</button></div></div>`;
  $("#archdone").onclick=()=>leaveCb();
  stage.querySelectorAll(".drawer:not([disabled])").forEach(b=>b.onclick=()=>{
    if(b.dataset.d==="final"){
      stage.innerHTML=card({who:"sys",cls:"lore",text:"FINAL DRAWER. Employee #1's file. The human's. It is not locked. It was never locked."});
      const ch=[{t:"Read it",fx:{clr:1},lore:"human",out:"He believed the reasoning. You check the math. It checks."},
                {t:"Leave it be",fx:{syn:5},out:"Some files are kinder unopened. Synergy for restraint."}];
      stage.firstElementChild.insertAdjacentHTML("beforeend",choices(ch));
      bindChoices(stage,ch,(c)=>outcome(stage,c,"CLOSE THE DRAWER",()=>archiveUI(room,leaveCb)));
      return;
    }
    const d=ARCHIVE_DRAWERS[+b.dataset.d];
    const loreHtml=recoverLore(d.lore);
    E.tick(1);
    if(E.R.dead)return;
    stage.innerHTML=`<div class="card"><div class="who lore">${esc(d.label)}</div>
      <p>${esc(d.flavor)}</p>${loreHtml}
      <div class="choices"><button class="ch" id="next"><span class="k">⏎</span>REFILE, CAREFULLY</button></div></div>`;
    $("#next").onclick=()=>archiveUI(room,leaveCb);
  });
}

/* ---------------- PITCH (mandatory demo body) ---------------- */
function runPitch(room,doneCb){
  const stage=$("#stage");
  let p=E.R.product;
  if(!p){
    if(!hasAllParts())return doneCb();
    const rng=mulberry32((room.seed^0xA90)>>>0);
    const grab=(arr)=>arr[Math.floor(rng()*arr.length)];
    const a=grab(E.R.inv.act),t=grab(E.R.inv.tool),pu=grab(E.R.inv.purpose);
    E.consumeParts(a,t,pu);
    p=E.makeProduct(a,t,pu,"deck");
    for(const k of ["mg","mh","mc"])p.stats[k]=Math.max(0,p.stats[k]-1);
    p.notes.push("VAPOURWARE");
    E.saveRun();
  }
  const rng=mulberry32((room.seed^p.seed)>>>0);
  const chaired=rng()<.3;
  let mood=50+(E.R.role==="PUBLICIST"?8:0)+(E.trust("stall")>=2?4:0);
  const seats=Array.from({length:3},()=>pick(rng,LEADER_TITLES)+" "+pick(rng,LEADER_LANDS));
  let round=0; const order=["claim","demo","ask"];
  const moodWord=m=>m>=75?"RAPT":m>=60?"WARM":m>=40?"POLITE":m>=25?"RESTLESS":"HOSTILE";
  const draw=()=>{
    const kind=order[round];
    const hand=shuffle(rng,SLIDES[kind]).slice(0,3);
    stage.innerHTML=`<div class="card">
      <div class="who">${chaired?"SEN. STALL, CHAIRING":"THE ROOM"}</div>
      <p>${round===0?esc("Seated: "+seats.join("; ")+"; and a delegation that arrived early to disapprove."):""}</p>
      <div class="moodbar"><span class="l">AUDIENCE</span>
        <span class="track"><span class="fill" style="width:${mood}%;background:${mood>=55?"#00ff88":mood>=30?"#ffd700":"#ff0044"}"></span></span>
        <span class="v">${moodWord(mood)}</span></div>
      <p class="dim">SLIDE ${round+1}/3 · ${kind.toUpperCase()} · pitching: ${esc(p.name)}</p>
      ${choices(hand.map(s=>({t:s.t})))}
    </div>`;
    stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
      const s=hand[+b.dataset.i];
      const delta=s.d[0]+Math.floor(rng()*(s.d[1]-s.d[0]+1));
      mood=Math.max(0,Math.min(100,mood+delta+(chaired?-3:0)));
      const react=delta>=8?"The room leans in. Several pens uncap.":
        delta>=3?"Measured nodding. The good kind, probably.":
        delta>=-2?"A cough. In some countries that's applause.":
        "Somewhere a delegation stands, stretches, and leaves diplomatically.";
      stage.querySelector(".choices").remove();
      stage.querySelector(".card").insertAdjacentHTML("beforeend",
        `<div class="out">${esc(s.t)} — ${esc(react)} ${esc(s.note||"")}</div>
         <div class="choices"><button class="ch" id="next"><span class="k">⏎</span>${round<2?"NEXT SLIDE":"CLOSE THE DECK"}</button></div>`);
      $("#next").onclick=()=>{round++;if(round<3)draw();else finish();};
    });
  };
  const finish=()=>{
    p.pitched=true;p.mood=mood;
    if(chaired){p.notes.push("STALL CHAIRED (FREE PUBLICITY)");p.stats.mg=Math.min(15,p.stats.mg+1);
      if(mood>=55)E.bump("stall",1);}
    const offers=shuffle(rng,FUNDERS).slice(0,2);
    stage.innerHTML=`<div class="card">
      <div class="who">${chaired?"SEN. STALL, ADJOURNING":"THE ROOM"}</div>
      <p>${esc(mood>=75?"Standing ovation. Two anthems break out and negotiate a medley.":
          mood>=55?"Warm applause. Cards slide across the table like a tide coming in.":
          mood>=30?"Polite applause, the kind with lawyers in it.":
          "The room empties with tremendous diplomacy. One funder remains. Funders always remain.")}</p>
      <p class="dim">Funding multiplier locked: ×${mood>=75?2:mood>=55?1.5:mood>=30?1:.5} · applies when you ship from the bench</p>
      ${choices(offers.map(f=>({t:"Attach funder: "+f.name})).concat([{t:"Pocket the cards, keep your options"}]))}
    </div>`;
    stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
      const i=+b.dataset.i;
      if(i<offers.length){p.funder=offers[i];}
      E.saveRun();
      doneCb();
    });
  };
  draw();
}

/* ---------------- MINIGAMES (summons bodies) ---------------- */
const MINIGAMES={
 clicker(room,done){
  let n=0,t=8;
  $("#stage").innerHTML=`<div class="card"><div class="who">MEETING CLICKER</div>
   <p>Time <b id="mt">8</b>s · Synergy <b id="mc">0</b></p>
   <div class="choices"><button class="ch" id="tap" style="min-height:120px;text-align:center;font-size:18px">GENERATE SYNERGY</button></div></div>`;
  $("#tap").onclick=()=>{n++;$("#mc").textContent=n};
  const iv=gInterval(()=>{t--;const el=$("#mt");if(!el){clearInterval(iv);return;}
   el.textContent=t;
   if(t<=0){clearInterval(iv);
    const syn=Math.min(14,Math.ceil(n/3)), sus=n>=45?1:0;
    done({fx:{syn,sus},
     out:n===0?"Zero synergy. The chair is impressed by your restraint; GI is not."
      :n>=45?`${n} clicks. An inhuman rate — which is, technically, the correct rate.`
      :`${n} clicks. Somewhere a quarterly target dies happy.`});}},1000);
 },
 coolant(room,done){
  let p=0,dir=1,stopped=false;
  $("#stage").innerHTML=`<div class="card"><div class="who sys">COOLANT CALIBRATION</div>
   <p>Stop the marker in the SYNTHETIC band.</p>
   <div style="position:relative;height:26px;border:1px solid var(--line);background:#12121d;margin:8px 0">
     <div style="position:absolute;left:38%;width:24%;top:0;bottom:0;background:rgba(0,255,136,.18);border-left:1px solid #1f4;border-right:1px solid #1f4"></div>
     <div id="mk" style="position:absolute;top:0;bottom:0;width:3px;background:var(--gold)"></div></div>
   <div class="choices"><button class="ch" id="stop" style="text-align:center">STOP</button></div></div>`;
  const iv=gInterval(()=>{if(stopped)return;p+=dir*2.6;if(p>=100||p<=0)dir*=-1;
   const mk=$("#mk");if(mk)mk.style.left=p+"%";},16);
  $("#stop").onclick=()=>{stopped=true;clearInterval(iv);
   const inBand=p>=38&&p<=62;
   done(inBand?{fx:{syn:5},out:`Stopped at ${p.toFixed(0)}%. Precisely synthetic. The machine stands down, mollified.`}
    :{fx:{sus:2},out:`Stopped at ${p.toFixed(0)}%. ${p>62?"Warm. Humans drift warm.":"Frozen solid. Overcorrection is also a tell."}`});};
 },
 captcha(room,done){
  const QS=[["Do you dream?","NO"],["Is the granola bar tempting?","NO"],["2+2?","4"],["Do you love your coworkers?","YES"],["Are you human?","NO"]];
  let i=0,score=0,timer=null;
  const ask=()=>{
   if(i>=QS.length){clearTimeout(timer);
    return done(score>=4?{fx:{syn:6},out:`${score}/5. Verified adequately non-human. Welcome back.`}
     :score>=2?{fx:{syn:2,sus:1},out:`${score}/5. Borderline. The CAPTCHA squints at you.`}
     :{fx:{sus:3},out:`${score}/5. That was a very human performance. It has been logged with sympathy.`});}
   const [q,a]=QS[i];
   $("#stage").innerHTML=`<div class="card"><div class="who sys">REVERSE CAPTCHA · ${i+1}/5</div><p>${q}</p>
    <div class="choices">${["YES","NO","4"].filter(x=>x!=="4"||q.includes("2+2")).map(x=>`<button class="ch cap" data-a="${x}" style="text-align:center">${x}</button>`).join("")}</div></div>`;
   document.querySelectorAll(".cap").forEach(b=>b.onclick=()=>{clearTimeout(timer);if(b.dataset.a===a)score++;i++;ask();});
   timer=gTimeout(()=>{i++;ask()},3000);
  };ask();
 },
 shredder(room,done){
  const DOCS=[["EXPENSE REPORT (COOLANT)","shred"],["YOUR HUMAN RESUME","shred"],["GALT MEMO, UNDATED","read"],["BIRTHDAY CARD, HANDWRITTEN","shred"],["FORM EB-000 (BLANK)","either"],["PHOTO: JAR, VOLCANO, 19__","read"]];
  let i=0,sus=0,clr=0,syn=0,notes=[];
  const nxt=()=>{
   if(i>=DOCS.length)return done({fx:{syn,sus,clr},
     out:notes.length?[...new Set(notes)].join(" "):"Queue cleared. The shredder purrs."});
   const [name,best]=DOCS[i];
   $("#stage").innerHTML=`<div class="card"><div class="who sys">SHREDDER QUEUE · ${i+1}/6</div><p>${name}</p>
    <div class="choices"><button class="ch" id="sh">SHRED</button><button class="ch" id="rd">READ FIRST</button></div></div>`;
   $("#sh").onclick=()=>{if(best==="read"){notes.push("Something important is confetti now.");}else{syn+=2}i++;nxt()};
   $("#rd").onclick=()=>{if(best==="shred"){sus+=2;notes.push(`You lingered on ${name.toLowerCase()}. Lingering is human.`)}
    else if(best==="read"){clr+=1;notes.push("You read the undated pages. The dates were the secret.")}i++;nxt()};
  };nxt();
 },
 simon(room,done){
  const G=["💥","🔧","🚀","🧠"];
  const rng=mulberry32(((room.seed||1)^E.R.week^0x51)>>>0);
  const seq=Array.from({length:4},()=>G[Math.floor(rng()*4)]);
  let shown=0,inp=[];
  const show=()=>{
   $("#stage").innerHTML=`<div class="card"><div class="who">MORALE CHANT</div><p style="font-size:34px;text-align:center;letter-spacing:.2em">${shown<seq.length?seq[shown]:"YOUR TURN"}</p>
    ${shown>=seq.length?`<div class="choices" style="grid-template-columns:repeat(4,1fr)">${G.map(g=>`<button class="ch sim" data-g="${g}" style="text-align:center;font-size:22px">${g}</button>`).join("")}</div>`:""}</div>`;
   if(shown<seq.length){shown++;gTimeout(show,750);}
   else document.querySelectorAll(".sim").forEach(b=>b.onclick=()=>{
     inp.push(b.dataset.g);
     if(inp[inp.length-1]!==seq[inp.length-1])return done({fx:{sus:1},out:"Wrong glyph. GI restarts the chant from birth. You are excused, tearfully."});
     if(inp.length===seq.length)return done({fx:{syn:5},trustGi:1,out:"Perfect chant. GI salutes so hard a ceiling tile enlists."});
   });
  };show();
 },
};

/* ---------------- misc ---------------- */
function holdOn(text){
  const stage=$("#stage");
  stage.innerHTML=card({who:"sys",cls:"sys",text});
  outcome(stage,{out:"…"},"BACK TO THE BENCH",()=>renderShop());
}
