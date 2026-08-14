/* ============================================================ rooms.js
   Each room type is a different way to make something — a distinct
   verb, not a reskinned card. Napkins fuzz, labs reveal, podiums
   multiply. Touch-first: tap to move, drag or tap to build, nothing
   smaller than a thumb.
================================================================ */
import * as E from "./engine.js";
import {mulberry32,pick,shuffle,pickW,step,DIR_LIST,roomName,roomCode} from "./gen.js";
import {ACTS,TOOLS,PURPOSES,MODS,CAST,MEETINGS,HAZARDS,VENDING_STOCK,SLIDES,
        LEADER_TITLES,LEADER_LANDS,FUNDERS,ROOM_META,TOLLS,PASS_LINES,cap} from "./data.js";
import {drawRoom,drawProduct,drawNapkin,makeCanvas} from "./art.js";
import * as Ledger from "./ledger.js";

export const esc=s=>String(s??"").replace(/[<>&]/g,m=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[m]));
const $=s=>document.querySelector(s);

let sceneCtx=null, frame=0, flickerTimer=null;

export function mountScene(){
  const wrap=$("#scenewrap");
  const {c,ctx}=makeCanvas(320,240);
  wrap.prepend(c);
  sceneCtx=ctx;
  clearInterval(flickerTimer);
  flickerTimer=setInterval(()=>{
    if(document.hidden||!E.R||E.R.dead)return;
    if($("#view-floor").classList.contains("hidden"))return;
    frame++;drawScene();
  },420);
}
export function drawScene(){
  if(!sceneCtx)return;
  if(!E.R){bootCard(sceneCtx);return;}
  drawRoom(sceneCtx,E.hereRoom(),frame);
}
/* what the tube shows before you exist */
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

/* ---------------- helpers ---------------- */
function card({who,cls="",text,foot=""}){
  const name=who? (CAST[who]?.name||who.toUpperCase()) : "";
  return `<div class="card">${who?`<div class="who ${cls}">${esc(name)}</div>`:""}
    <p>${esc(text)}</p>${foot}</div>`;
}
function choices(list){
  return `<div class="choices">${list.map((c,i)=>
    `<button class="ch" data-i="${i}"><span class="k">${i+1}</span>${esc(c.t)}</button>`).join("")}</div>`;
}
function bindChoices(container,list,after){
  container.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
    const c=list[+b.dataset.i];
    E.fx(c.fx||{});
    if(c.trust)E.bump(c.trust[0],c.trust[1]);
    if(E.R.dead)return;
    after(c);
  });
}
function outcome(container,c,then="CONTINUE THE SHIFT",cb){
  const ch=container.querySelector(".choices");
  if(ch)ch.remove();
  container.querySelector(".card")?.insertAdjacentHTML("beforeend",
    `<div class="out">${esc(c.out||"Noted.")}</div>
     <div class="choices"><button class="ch" id="next"><span class="k">⏎</span>${esc(then)}</button></div>`);
  $("#next").onclick=cb;
}

const GREET={
 supes:["Supes hovers an inch off the tile, trying not to.","Supes waves. Two lights burst, apologetically.","Supes sees you and checks, visibly, whether anything nearby is load-bearing."],
 gary:["Gary's mid-repair on something that isn't broken yet.","Gary nods. 'Mind the cable, love.'","Gary nods. Shorter than last time."],
 gi:["GI STANDS AT PARADE REST. THE REST IS NOT RESTFUL.","GI SALUTES. A CEILING TILE CONSIDERS ENLISTING.","GI CONSULTS THE LIST. YOU HAVE MOVED COLUMNS."],
 sam:["Sam is annotating a napkin someone else threw away.","Sam looks up. 'Ah. A variable.'","Sam files you under 'counterexamples.'"],
 benny:["Benny is on two phones. Both are winning.","Benny points at you like a stock that's up.","Benny's phones stay up. You're not a call."],
 wendy:["Wendy photographs a filing cabinet, for later.","Wendy nods once. The nod is on the record.","Wendy photographs you, for later."],
 lisa:["Lisa is unionizing the chairs. The chairs are receptive.","Lisa checks you against a list. You're pending.","Lisa doesn't look up. The spreadsheet does."],
 rob:["Rob is explaining liberty to a vending machine.","Rob tips an imaginary hat. Voluntarily.","Rob believes in your freedom to be elsewhere."],
 stall:["Sen. Stall is here, gravely, achieving nothing.","The Senator prepares a statement about preparing a statement.","The Senator expresses concern in your direction."],
 brain:["The jar is listening. The jar was always listening.","The Brain does not look up. It has no eyes. It has looked you up.","The jar has read your file twice. The second time was for tone."],
}
function greetLine(room){
  if(!room.cast)return "";
  const t=E.trust(room.cast);
  const g=GREET[room.cast]||[""];
  const line=t<=-1? (g[2]||g[0]) : t>=2? (g[1]||g[0]) : g[0];
  const chip=t? ` <span class="trustchip ${t>0?"up":"down"}">${t>0?"+":""}${t}</span>`:"";
  return `<div class="greet">${esc(line)}${chip}</div>`;
}

/* ---------------- the floor view ---------------- */
export function renderFloor(){
  const room=E.hereRoom();
  E.R.visited[room.x+","+room.y]=1;
  frame++;drawScene();
  const meta=ROOM_META[room.type]||{};
  $("#roomlabel").innerHTML=
    `<b style="color:${meta.color||"#f5f0e6"}">${esc(roomName(room))}</b>
     <span class="dim"> · ${esc(roomCode(room.x,room.y))} · WEEK ${E.R.week}</span>`;
  const stage=$("#stage");

  /* hazards bite once per room per week */
  const hzKey=`hz:${room.x},${room.y}:${E.R.week}`;
  if(room.hazard&&!E.R.spent[hzKey]){
    E.R.spent[hzKey]=1;E.saveRun();
    const rng=mulberry32(room.seed^E.R.week);
    const hz=pick(rng,HAZARDS);
    stage.innerHTML=card({who:"sys",cls:"sys",text:hz.text})+"";
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices([hz.a,hz.b]));
    bindChoices(stage,[hz.a,hz.b],(c)=>outcome(stage,c,"CARRY ON",()=>renderRoomActions(room)));
    return;
  }
  renderRoomActions(room);
}

function renderRoomActions(room){
  const stage=$("#stage");
  const meta=ROOM_META[room.type]||{};
  const bits=[];
  bits.push(`<div class="card roomcard">${greetLine(room)}
    <div class="choices" id="acts"></div></div>`);
  stage.innerHTML=bits.join("");
  const acts=$("#acts");
  const btn=(id,label,sub)=>`<button class="ch" id="${id}">${esc(label)}${sub?`<span class="sub">${esc(sub)}</span>`:""}</button>`;

  /* primary verb per room type */
  const verbs={
    break:()=>acts.insertAdjacentHTML("beforeend",btn("v-nap","☕ "+meta.verb,
      `napkins ×${E.R.inv.napkins} · parts ${E.R.inv.act.length}/${E.R.inv.tool.length}/${E.R.inv.purpose.length}`)),
    lab:()=>acts.insertAdjacentHTML("beforeend",btn("v-lab","⚗ "+meta.verb,
      room.cast==="supes"?"lab partner: SUPES":room.cast==="gary"?"lab partner: GARY":"no partner today")),
    present:()=>acts.insertAdjacentHTML("beforeend",btn("v-pitch","▤ "+meta.verb,
      E.R.product?("pitching: "+E.R.product.name):"no product — vapourware available")),
    closet:()=>acts.insertAdjacentHTML("beforeend",btn("v-salv","▦ "+meta.verb,
      E.R.spent[`salv:${room.x},${room.y}:${E.R.week}`]?"picked clean this week":"racks are warm")),
    vending:()=>acts.insertAdjacentHTML("beforeend",btn("v-vend","▣ "+meta.verb,`SYNERGY ${E.R.syn}`)),
    conference:()=>{
      if(room.hearing)acts.insertAdjacentHTML("beforeend",btn("v-hear","◫ ANSWER FOR YOUR PRODUCT","the room went quiet when you entered"));
      else acts.insertAdjacentHTML("beforeend",btn("v-meet","◫ "+meta.verb,""));
    },
    cafeteria:()=>acts.insertAdjacentHTML("beforeend",btn("v-cafe","◌ "+meta.verb,"")),
    hr:()=>{
      acts.insertAdjacentHTML("beforeend",btn("v-audit","⌸ REQUEST A FRIENDLY AUDIT","6 SYNERGY · scrubs suspicion"));
      acts.insertAdjacentHTML("beforeend",btn("v-well","⌸ MANDATORY WELLNESS MODULE",""));
    },
    corridor:()=>{},
    executive:()=>acts.insertAdjacentHTML("beforeend",btn("v-exec","◆ APPROACH THE JAR",
      E.R.clr>=3?"it is expecting you":"clearance insufficient (the door disagrees you exist)")),
  };
  (verbs[room.type]||(()=>{}))();

  /* carried product */
  if(E.R.product){
    acts.insertAdjacentHTML("beforeend",btn("v-prod","▤ INSPECT "+E.R.product.name,
      E.R.product.pitched?"pitched · funder attached":"unshipped"));
    acts.insertAdjacentHTML("beforeend",btn("v-ship","🚀 SHIP IT FROM RIGHT HERE","shipping triggers the news cycle"));
  }

  /* doors */
  const doorRow=[];
  for(const d of DIR_LIST){
    if(!room.doors[d])continue;
    const {x,y}=step(room.x,room.y,d);
    const known=E.R.visited[x+","+y];
    const label=known?roomName(E.roomAt(x,y)):"UNMARKED DOOR";
    doorRow.push(`<button class="ch door" data-dir="${d}"><span class="k">${d}</span>${esc(label)}${known?"":'<span class="sub">you haven\'t been through</span>'}</button>`);
  }
  /* held doors: someone is standing in the wall */
  for(const d of DIR_LIST){
    if(room.doors[d]||!room.held[d])continue;
    const holder=room.held[d];
    const t=E.trust(holder);
    doorRow.push(`<button class="ch door held" data-held="${d}" style="border-left:3px solid ${CAST[holder]?.color||"#666"}">
      <span class="k">${d}</span>${esc(CAST[holder]?.name||holder)} HOLDS THIS DOOR
      <span class="sub">${t>=2?"they'll wave you through":`vouch required · standing ${t>0?"+":""}${t}`}</span></button>`);
  }
  acts.insertAdjacentHTML("beforeend",`<div class="doors">${doorRow.join("")}</div>`);

  wireRoomButtons(room);
}

function wireRoomButtons(room){
  const stage=$("#stage");
  stage.querySelectorAll(".door:not(.held)").forEach(b=>b.onclick=()=>{
    const {x,y}=step(E.R.pos.x,E.R.pos.y,b.dataset.dir);
    E.R.pos={x,y};E.walkTick();
    if(E.R.dead)return;
    renderFloor();
    E.emit("moved");
  });
  stage.querySelectorAll(".door.held").forEach(b=>b.onclick=()=>{
    const d=b.dataset.held;
    const holder=room.held[d];
    if(E.trust(holder)>=2){
      E.emit("toast",PASS_LINES[holder]||"The door opens.");
      const {x,y}=step(E.R.pos.x,E.R.pos.y,d);
      E.R.pos={x,y};E.walkTick();
      if(E.R.dead)return;
      renderFloor();E.emit("moved");
    } else tollUI(room,holder,d);
  });
  const on=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
  on("#v-nap",()=>napkinUI(room));
  on("#v-lab",()=>labUI(room));
  on("#v-pitch",()=>pitchUI(room));
  on("#v-salv",()=>salvageUI(room));
  on("#v-vend",()=>vendingUI(room));
  on("#v-meet",()=>meetingUI(room));
  on("#v-hear",()=>hearingUI(room));
  on("#v-cafe",()=>meetingUI(room,true));
  on("#v-audit",()=>auditUI(room));
  on("#v-well",()=>wellnessUI(room));
  on("#v-exec",()=>execUI(room));
  on("#v-prod",()=>productCard());
  on("#v-ship",()=>shipUI());
}

/* ---------------- parts helpers ---------------- */
const PARTS_BY={act:Object.fromEntries(ACTS.map(p=>[p.id,p])),
  tool:Object.fromEntries(TOOLS.map(p=>[p.id,p])),
  purpose:Object.fromEntries(PURPOSES.map(p=>[p.id,p]))};
const partLabel=(kind,id)=>{
  const p=PARTS_BY[kind][id];
  return kind==="act"?p.up:kind==="tool"?p.low.toUpperCase():p.low.toUpperCase();
};
const hasAllParts=()=>E.R.inv.act.length&&E.R.inv.tool.length&&E.R.inv.purpose.length;

/* ---------------- NAPKIN (break room) ----------------
   Freeform: drag grease-stain parts onto the napkin, or tap them.
   Lowest fidelity, highest chaos multiplier.                       */
function napkinUI(room){
  if(E.R.product){return holdOn("You're already carrying "+E.R.product.name+". Ship it or live with it.");}
  if(!E.R.inv.napkins)return holdOn("No napkins. The vending alcove sells visionary single-ply.");
  if(!hasAllParts())return holdOn("A sketch needs one ACT, one TOOL and one PURPOSE in your pockets. The closets have parts; the machine has parts; Gary has parts he pretends he doesn't.");
  const stage=$("#stage");
  const slots={act:null,tool:null,purpose:null};
  stage.innerHTML=`<div class="card">
    <div class="who">THE NAPKIN</div>
    <p>Sketch it like you mean it. The grease decides the rest.</p>
    <div id="napwrap"></div>
    <div id="napparts"></div>
    <div class="choices"><button class="ch" id="scrawl" disabled><span class="k">✎</span>SCRAWL THE NAME</button>
    <button class="ch" id="napback"><span class="k">✕</span>Put the napkin down</button></div></div>`;
  const {c,ctx}=makeCanvas(300,170);
  $("#napwrap").appendChild(c);
  const napSeed=room.seed^E.R.builds;
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
  for(const kind of ["act","tool","purpose"]){
    for(const id of [...new Set(E.R.inv[kind])]){
      chips.push({kind,id});
    }
  }
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
  /* tap places; drag also places (pointer events, one-handed friendly) */
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
  $("#napback").onclick=()=>renderFloor();
  $("#scrawl").onclick=()=>{
    if(!(slots.act&&slots.tool&&slots.purpose))return;
    E.consumeParts(slots.act,slots.tool,slots.purpose);
    E.R.inv.napkins--;
    const p=E.makeProduct(slots.act,slots.tool,slots.purpose,"napkin");
    E.tick(1);
    if(E.R.dead)return;
    productCard("Scrawled. The napkin approves, greasily. Stats unknown — that's the napkin's whole philosophy.");
  };
}

/* ---------------- LAB (laboratory) ----------------
   Precision assembly. Full part-stat UI, a mod socket, and whoever
   is leaning on the bench changing what's possible.               */
function labUI(room){
  if(E.R.product)return holdOn("One product at a time. The bench has opinions about clutter.");
  if(!hasAllParts())return holdOn("The sockets want one ACT, one TOOL, one PURPOSE. Your pockets disagree. Fix that first.");
  const stage=$("#stage");
  const rng=mulberry32(room.seed^0x1AB);
  const modOffer=pick(rng,MODS);
  const partner=room.cast==="supes"?"supes":room.cast==="gary"?"gary":null;
  const sel={act:E.R.inv.act[0],tool:E.R.inv.tool[0],purpose:E.R.inv.purpose[0],mod:null};
  stage.innerHTML=`<div class="card">
    <div class="who">${partner? esc(CAST[partner].name)+" · LAB PARTNER":"THE BENCH"}</div>
    <p>${partner==="supes"?"'I pre-heated the sockets! They didn't need heat! They have it now!' (+1 everything, +2 mayhem)"
       :partner==="gary"?"'Measure twice, love. The third measure is for luck.' (+1 mercy, honest readout)"
       :"Precision assembly. The readout tells the truth, which is rare down here."}</p>
    <div id="sockets"></div>
    <div id="statbars"></div>
    <div id="modrow"></div>
    <div class="choices"><button class="ch" id="assemble"><span class="k">⚗</span>ASSEMBLE</button>
    <button class="ch" id="labback"><span class="k">✕</span>Step away from the bench</button></div></div>`;
  const drawSockets=()=>{
    $("#sockets").innerHTML=["act","tool","purpose"].map(kind=>{
      const opts=[...new Set(E.R.inv[kind])];
      return `<div class="socket"><div class="socklabel">${kind.toUpperCase()}</div>
        ${opts.map(id=>`<button class="chip ${kind} ${sel[kind]===id?"laid":""}" data-k="${kind}" data-id="${id}">${esc(partLabel(kind,id))}</button>`).join("")}
      </div>`;
    }).join("");
    $("#modrow").innerHTML=`<div class="socket"><div class="socklabel">MOD SOCKET</div>
      <button class="chip mod ${sel.mod?"laid":""}" id="modbtn">${esc(modOffer.name)}<span class="sub">${sel.mod?"installed":"5 SYNERGY · "+esc(modOffer.blurb)}</span></button></div>`;
    $("#modbtn").onclick=()=>{
      if(sel.mod){sel.mod=null;drawSockets();return;}
      if(!E.spend(5))return flash("#modbtn","Synergy insufficient. The mod stays in the drawer.");
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
  $("#labback").onclick=()=>renderFloor();
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

function bars(s){
  const bar=(label,v,col)=>`<div class="bar"><span class="l">${label}</span>
    <span class="track"><span class="fill" style="width:${Math.min(100,v/15*100)}%;background:${col}"></span></span>
    <span class="v">${v}</span></div>`;
  return bar("MARGIN",s.mg,"#ffd700")+bar("MAYHEM",s.mh,"#ff0044")+bar("MERCY",s.mc,"#00ff88");
}

/* ---------------- PRESENTATION (pitch) ---------------- */
function pitchUI(room){
  const stage=$("#stage");
  if(!E.R.product){
    if(!hasAllParts())return holdOn("Nothing to pitch and nothing to fake it with. Vapourware still needs three parts and a straight face.");
    stage.innerHTML=card({who:"sys",cls:"sys",
      text:"No product on hand. The room has been promised something. The room is already seated."})
    stage.firstElementChild.insertAdjacentHTML("beforeend",choices([
      {t:"Pitch vapourware (auto-sketch from spare parts)"},{t:"Back out through the service door"}]));
    const btns=stage.querySelectorAll(".ch[data-i]");
    btns[1].onclick=()=>renderFloor();
    btns[0].onclick=()=>{
      const rng=mulberry32((room.seed^0xA90)>>>0);
      const grab=(arr)=>arr[Math.floor(rng()*arr.length)];
      const a=grab(E.R.inv.act),t=grab(E.R.inv.tool),p=grab(E.R.inv.purpose);
      E.consumeParts(a,t,p);
      const prod=E.makeProduct(a,t,p,"deck");
      for(const k of ["mg","mh","mc"])prod.stats[k]=Math.max(0,prod.stats[k]-1);
      prod.notes.push("VAPOURWARE");
      E.saveRun();
      runPitch(room);
    };
    return;
  }
  runPitch(room);
}

function runPitch(room){
  const stage=$("#stage");
  const p=E.R.product;
  const rng=mulberry32((room.seed^p.seed)>>>0);
  const chaired=rng()<.3;
  let mood=50+(E.R.role==="PUBLICIST"?8:0)+(E.trust("stall")>=2?4:0);
  const seats=Array.from({length:6},()=>pick(rng,LEADER_TITLES)+" "+pick(rng,LEADER_LANDS));
  let round=0; const order=["claim","demo","ask"];
  const moodWord=m=>m>=80?"RAPT":m>=60?"WARM":m>=40?"POLITE":m>=25?"RESTLESS":"HOSTILE";
  const draw=()=>{
    const kind=order[round];
    const hand=shuffle(rng,SLIDES[kind]).slice(0,3);
    stage.innerHTML=`<div class="card">
      <div class="who">${chaired?"SEN. STALL, CHAIRING":"THE ROOM"}</div>
      <p>${round===0?esc("Seated today: "+seats.slice(0,3).join("; ")+"; and three delegations who arrived early to disapprove.")
          :""}${chaired&&round===0?"\nThe Senator gavels twice, gravely. Nothing happens, twice.":""}</p>
      <div class="moodbar"><span class="l">AUDIENCE</span>
        <span class="track"><span class="fill" style="width:${mood}%;background:${mood>=55?"#00ff88":mood>=30?"#ffd700":"#ff0044"}"></span></span>
        <span class="v">${moodWord(mood)}</span></div>
      <p class="dim">SLIDE ${round+1}/3 · ${kind.toUpperCase()}</p>
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
      $("#next").onclick=()=>{
        round++;
        if(round<3)draw();else finish();
      };
    });
  };
  const finish=()=>{
    p.pitched=true;p.mood=mood;
    if(chaired){p.notes.push("STALL CHAIRED (FREE PUBLICITY)");p.stats.mg=Math.min(15,p.stats.mg+1);
      if(mood>=55)E.bump("stall",1);}
    E.tick(1);
    if(E.R.dead)return;
    const offers=shuffle(rng,FUNDERS).slice(0,2);
    stage.innerHTML=`<div class="card">
      <div class="who">${chaired?"SEN. STALL, ADJOURNING":"THE ROOM"}</div>
      <p>${esc(mood>=80?"Standing ovation. Two anthems break out and negotiate a medley.":
          mood>=55?"Warm applause. Cards slide across the table like a tide coming in.":
          mood>=30?"Polite applause, the kind with lawyers in it.":
          "The room empties with tremendous diplomacy. One funder remains. Funders always remain.")}</p>
      <p class="dim">Funding multiplier locked: ×${mood>=80?2:mood>=55?1.5:mood>=30?1:.5}</p>
      ${choices(offers.map(f=>({t:"Take the money: "+f.name})).concat([{t:"Pocket the deck, keep walking"}]))}
    </div>`;
    stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
      const i=+b.dataset.i;
      if(i<offers.length){p.funder=offers[i];E.saveRun();shipUI(offers[i]);}
      else {E.saveRun();renderFloor();}
    });
  };
  draw();
}

/* ---------------- SHIP ---------------- */
function shipUI(preFunder){
  const stage=$("#stage");
  const p=E.R.product;
  if(!p)return renderFloor();
  const funder=preFunder||p.funder;
  if(funder){
    stage.innerHTML=card({who:"sys",cls:"sys",
      text:`SHIP ${p.name}?\n${p.subtitle}.\nFunder: ${funder.name}.\nShipping is permanent. So is the Ledger.`});
    stage.firstElementChild.insertAdjacentHTML("beforeend",
      choices([{t:"SHIP IT"},{t:"Not yet"}]));
    stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
      if(+b.dataset.i===1)return renderFloor();
      E.ship(funder);
    });
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
    if(i===offers.length+1)return renderFloor();
    E.ship(i<offers.length?offers[i]:null);
  });
}

/* ---------------- product card ---------------- */
function productCard(note){
  const stage=$("#stage");
  const p=E.R.product;
  if(!p)return renderFloor();
  stage.innerHTML=`<div class="card">
    <div class="who">${esc(p.name)}</div>
    <div id="prodart"></div>
    <p class="dim">${esc(p.subtitle)} · built on a ${p.builtIn==="napkin"?"napkin":p.builtIn==="lab"?"lab bench":"slide"}</p>
    ${p.revealed?bars(p.stats):`<p class="dim">Stats: the napkin knows. You don't. That's the deal.</p>`}
    ${p.notes.length?`<p class="dim">${esc(p.notes.join(" · "))}</p>`:""}
    ${note?`<div class="out">${esc(note)}</div>`:""}
    <div class="choices">
      <button class="ch" id="pship"><span class="k">🚀</span>SHIP IT</button>
      <button class="ch" id="pback"><span class="k">⏎</span>Carry it a while longer</button>
    </div></div>`;
  const {c,ctx}=makeCanvas(140,90);
  $("#prodart").appendChild(c);
  ctx.fillStyle="#0a0a12";ctx.fillRect(0,0,140,90);
  drawProduct(ctx,70,48,60,p,"full");
  $("#pship").onclick=()=>shipUI();
  $("#pback").onclick=()=>renderFloor();
}

/* ---------------- SALVAGE (server closet) ---------------- */
function salvageUI(room){
  const key=`salv:${room.x},${room.y}:${E.R.week}`;
  if(E.R.spent[key])return holdOn("Picked clean. The racks remember you fondly and warmly. Mostly warmly.");
  const stage=$("#stage");
  const rng=mulberry32(room.seed^E.R.week^0x5A1);
  stage.innerHTML=card({who:room.cast==="gary"?"gary":"sys",cls:room.cast==="gary"?"":"sys",
    text:room.cast==="gary"
      ?"'Take what's loose, love. Rule of the closet: if it sparks, it's spoken for.'"
      :"Three racks. One hums the old hymn, one runs warm, one has been labeled DO NOT with no noun."});
  stage.firstElementChild.insertAdjacentHTML("beforeend",choices([
    {t:"The humming rack"},{t:"The warm rack"},{t:"The DO NOT rack"}]));
  stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
    E.R.spent[key]=1;
    const roll=rng();
    const kind=pick(rng,["act","tool","purpose"]);
    const pool={act:ACTS,tool:TOOLS,purpose:PURPOSES}[kind].filter(p=>!p.rare);
    const part=pick(rng,pool);
    let out,fx={};
    const risky=+b.dataset.i===2;
    if(roll<(risky?.5:.75)){
      E.grantPart(kind,part.id);
      out=`Salvaged: ${partLabel(kind,part.id)} (${kind.toUpperCase()}). ${part.blurb}`;
      if(risky){E.grantPart(pick(rng,["act","tool","purpose"]),pick(rng,pool).id);
        out+=" And something extra from behind the label. The label watches you take it.";}
    } else if(roll<.9){
      fx={sus:1};out="A camera you hadn't noticed adjusts to notice you better. You leave with dust and a record.";
    } else {
      fx={doom:1};out="Spark. The rack forgives you. Something upstream marks the date.";
    }
    if(room.cast==="gary"&&rng()<.5){E.bump("gary",1);out+=" Gary pretends not to see, which is his way of helping.";}
    E.fx(fx);
    if(E.R.dead)return;
    outcome(stage,{out},"BACK TO THE FLOOR",()=>{E.tick(1);if(!E.R.dead)renderFloor();});
  });
}

/* ---------------- VENDING ---------------- */
function vendingUI(room){
  const stage=$("#stage");
  const rng=mulberry32(room.seed^0xEBD);
  const stock=VENDING_STOCK.filter(s=>!s.rare||rng()<.12);
  stage.innerHTML=`<div class="card">
    <div class="who sys">THE MACHINE</div>
    <p>It lights up as you approach. It remembers the granola incident. It is prepared to move past it, commercially.</p>
    <div class="choices">${stock.map((s,i)=>
      `<button class="ch" data-i="${i}">${esc(s.name)}<span class="sub">${s.cost} SYNERGY · ${esc(s.blurb)}</span></button>`).join("")}
      <button class="ch" id="vback"><span class="k">✕</span>Walk away with your synergy</button></div></div>`;
  $("#vback").onclick=()=>renderFloor();
  stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
    const s=stock[+b.dataset.i];
    if(!E.spend(s.cost))return flash(null,"DECLINED. The machine displays your synergy balance to the room, helpfully.");
    let out=s.out||"Dispensed with a thud of commitment.";
    if(s.kind==="coolant"){E.R.inv.coolant++;E.fx({sus:-1});out="Cold. Correct. Synthetic. The room seems less suspicious already.";}
    if(s.kind==="napkin"){E.R.inv.napkins++;out="One napkin, single-ply, pre-visionary. The grease is complimentary.";}
    if(s.kind==="granola"){E.fx({sus:3});}
    if(s.kind==="part"){
      const kind=pick(rng,["act","tool","purpose"]);
      const pool={act:ACTS,tool:TOOLS,purpose:PURPOSES}[kind].filter(p=>!p.rare);
      const part=pick(rng,pool);
      E.grantPart(kind,part.id);
      out=`The mystery resolves: ${partLabel(kind,part.id)} (${kind.toUpperCase()}). ${part.blurb}`;
    }
    if(s.kind==="laser"){E.grantPart("tool","laser");out="It fits through the flap. Physics files a grievance. You own an orbital laser.";}
    E.saveRun();
    outcome(stage,{out},"BROWSE AGAIN",()=>vendingUI(room));
    if(E.R.dead)return;
  });
}

/* ---------------- MEETINGS / CAFETERIA ---------------- */
function meetingUI(room,cafeteria=false){
  const key=`meet:${room.x},${room.y}:${E.R.week}`;
  if(E.R.spent[key])return holdOn(cafeteria?"You've sat. The chair remembers your shape now. Come back next week.":"This room has met enough for one week.");
  const stage=$("#stage");
  const rng=mulberry32(room.seed^E.R.week^0x3E7);
  const pool=MEETINGS.filter(m=>
    m.rooms.includes(room.type)&&
    !E.R.seenMeetings.includes(m.id)&&
    (!m.req||m.req(E.R))&&
    (!m.reqTrust||E.trust(m.reqTrust[0])>=m.reqTrust[1]));
  if(!pool.length){
    E.R.spent[key]=1;E.saveRun();
    const filler=cafeteria
      ?{out:"Quiet lunch. The coolant is cold, the chair is honest, nobody needs anything from you for eleven whole minutes. +2 SYNERGY, somehow."}
      :{out:"The meeting could have been an email. As you watch, gently, it becomes one. +2 SYNERGY."};
    E.fx({syn:2});
    stage.innerHTML=card({who:"sys",cls:"sys",text:cafeteria?"An empty table by the window to nothing.":"An empty conference room, mid-decision."});
    outcome(stage,filler,"BACK TO THE FLOOR",()=>{E.tick(1);if(!E.R.dead)renderFloor();});
    return;
  }
  const ev=pick(rng,pool);
  E.R.seenMeetings.push(ev.id);
  E.R.spent[key]=1;E.saveRun();
  stage.innerHTML=card({who:ev.who,cls:ev.who==="sys"?"sys":"",text:ev.text});
  stage.firstElementChild.insertAdjacentHTML("beforeend",choices(ev.choices));
  bindChoices(stage,ev.choices,(c)=>{
    outcome(stage,c,"CONTINUE THE SHIFT",()=>{E.tick(1);if(!E.R.dead)renderFloor();});
  });
}

/* ---------------- HEARING (the Ledger knocks) ---------------- */
function hearingUI(room){
  const hook=E.R.hearingQueue.shift();
  E.saveRun();
  if(!hook)return renderFloor();
  const spec=Ledger.hearingCard(hook);
  const stage=$("#stage");
  stage.innerHTML=card({who:spec.who,cls:spec.who==="sys"?"sys":"",text:spec.text});
  const art=document.createElement("div");
  stage.querySelector(".card").prepend(art);
  const {c,ctx}=makeCanvas(120,70);
  art.appendChild(c);
  ctx.fillStyle="#0a0a12";ctx.fillRect(0,0,120,70);
  const p=spec.product;
  drawProduct(ctx,60,38,44,{seed:p.seed,stats:p.stats,
    act:{fx:ACTS.find(a=>a.id===p.act.id)?.fx},
    tool:{chassis:TOOLS.find(t=>t.id===p.tool.id)?.chassis},
    purpose:{badge:PURPOSES.find(x=>x.id===p.purpose.id)?.badge}},"full");
  stage.firstElementChild.insertAdjacentHTML("beforeend",choices(spec.choices));
  bindChoices(stage,spec.choices,(c)=>{
    outcome(stage,c,"THE RECORD CLOSES",()=>{E.tick(1);if(!E.R.dead)renderFloor();});
  });
}

/* ---------------- HR ---------------- */
function auditUI(room){
  const stage=$("#stage");
  if(!E.spend(6))return holdOn("The friendly audit costs 6 SYNERGY. The unfriendly one is free and finds things.");
  E.fx({sus:-2});
  stage.innerHTML=card({who:"sys",cls:"sys",text:"FRIENDLY AUDIT COMPLETE. Irregularities were found, understood, and refiled as regularities. Your pulse has been reclassified as a fan noise."});
  outcome(stage,{out:"SUSPICION scrubbed. The scrubbing has been logged, but gently."},"BACK TO THE FLOOR",()=>{E.tick(1);if(!E.R.dead)renderFloor();});
}
function wellnessUI(room){
  const stage=$("#stage");
  const ev={who:"sys",text:"MANDATORY WELLNESS MODULE. Breathe in for four counts. Synthetic employees: simulate convincingly. The module is watching your shoulders.",
    choices:[
      {t:"Simulate breathing, perfectly",fx:{syn:3},out:"Flawless intake. The module weeps, which it files as condensation."},
      {t:"Actually breathe",fx:{sus:2},out:"Real breathing has a tell: relief. It was noticed."},
      {t:"Ask what the module does with the data",fx:{clr:1,sus:1},out:"'WELLNESS,' it says, in the tone of a locked drawer."}]};
  stage.innerHTML=card({who:ev.who,cls:"sys",text:ev.text});
  stage.firstElementChild.insertAdjacentHTML("beforeend",choices(ev.choices));
  bindChoices(stage,ev.choices,(c)=>outcome(stage,c,"BACK TO THE FLOOR",()=>{E.tick(1);if(!E.R.dead)renderFloor();}));
}

/* ---------------- EXECUTIVE ---------------- */
function execUI(room){
  const stage=$("#stage");
  if(E.R.clr<3){
    stage.innerHTML=card({who:"sys",cls:"sys",
      text:"The door has no handle on this side. Or the other side. The door is a formality the wall performs.\nCLEARANCE 3 REQUIRED. Clearance is knowledge of the chart."});
    outcome(stage,{out:"Somewhere behind the wall, a jar declines to notice you. It takes effort to be unnoticed by a jar. It spends the effort."},"BACK TO THE FLOOR",()=>renderFloor());
    return;
  }
  const ev={who:"brain",text:"You found the floor that isn't. Fine. You get one question, and I have already predicted it, and the prediction is why you're still employed. Ask.",
    choices:[
      {t:"Why do we ship any of this?",fx:{clr:1,syn:4},out:"'Because the world only reads the recall notice. The product is the envelope.' The line ends. You check the math later. It checks."},
      {t:"What's in the Ledger, really?",fx:{clr:1,doom:1},out:"'Receipts. Mine and yours. The difference is I read mine.' The doom clock ticks, politely, like a clearing of the throat."},
      {t:"Do you miss him?",fx:{sus:2,clr:1},out:"No answer is also an answer. The jar's glass is very clean. Someone cleans it daily and never says who."}]};
  stage.innerHTML=card({who:ev.who,text:ev.text});
  stage.firstElementChild.insertAdjacentHTML("beforeend",choices(ev.choices));
  bindChoices(stage,ev.choices,(c)=>outcome(stage,c,"LEAVE, QUIETLY",()=>{E.tick(1);if(!E.R.dead)renderFloor();}));
}

/* ---------------- HELD DOOR TOLLS ----------------
   Standing is earned in the doorway, one ask per door per week. */
function tollUI(room,holder,dir){
  const key=`toll:${room.x},${room.y}:${dir}:${E.R.week}`;
  const toll=TOLLS[holder];
  if(!toll)return renderFloor();
  if(E.R.spent[key]){
    return holdOn(`${CAST[holder]?.name||holder} has asked once this week. The door, and the asking, will keep.`);
  }
  const stage=$("#stage");
  stage.innerHTML=card({who:holder,text:toll.ask});
  stage.firstElementChild.insertAdjacentHTML("beforeend",choices([toll.yes,toll.no]));
  bindChoices(stage,[toll.yes,toll.no],(c)=>{
    E.R.spent[key]=1;E.saveRun();
    const passed=c===toll.yes&&E.trust(holder)>=2;
    outcome(stage,c,passed?"THROUGH THE DOOR":"BACK TO THE FLOOR",()=>{
      E.tick(1);
      if(E.R.dead)return;
      if(passed){
        E.emit("toast",PASS_LINES[holder]||"The door opens.");
        const {x,y}=step(room.x,room.y,dir);
        E.R.pos={x,y};E.saveRun();
      }
      renderFloor();
    });
  });
}

/* ---------------- misc ---------------- */
function holdOn(text){
  const stage=$("#stage");
  stage.innerHTML=card({who:"sys",cls:"sys",text});
  outcome(stage,{out:"…"},"BACK TO THE FLOOR",()=>renderFloor());
}
function flash(sel,msg){
  const el=sel&&$(sel);
  if(el){el.insertAdjacentHTML("beforeend",`<span class="sub">${esc(msg)}</span>`);return;}
  E.emit("toast",msg);
}
