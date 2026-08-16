/* ============================================================ main.js
   The one-card runtime. One screen. One card at a time. No tabs.
   The pixel art draws the scenes, the cast bible voices them, the
   news generator writes the paper that unfolds over the story, the
   ledger files what you shipped, and the story remembers you.
================================================================ */
import * as E from "./engine.js";
import * as Ledger from "./ledger.js";
import * as News from "./news.js";
import {STORY,stampsLine,TOYBOX_HANDS} from "./story.js";
import {CAST,ACTS,TOOLS,PURPOSES} from "./data.js";
import {drawRoom,drawProduct,makeCanvas} from "./art.js";
import {mulberry32,hash32} from "./gen.js";

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[<>&]/g,m=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[m]));

/* ---------------- scene canvas ---------------- */
let sceneCtx=null, frame=0, curRoom=null;
function mountScene(){
  const {c,ctx}=makeCanvas(320,240);
  $("#scenewrap").prepend(c);
  sceneCtx=ctx;
  setInterval(()=>{
    if(document.hidden||!curRoom)return;
    frame++;drawRoom(sceneCtx,curRoom,frame);
  },420);
}
const NO_DOORS={N:false,S:false,E:false,W:false};
function backdrop(node,id){
  const seed=hash32(7,id.length*31,(node.bg||"corridor").length*7,13)>>>0;
  curRoom={x:0,y:0,type:node.bg||"corridor",seed,
    doors:NO_DOORS,held:{},palette:seed%6,wear:.3+((seed>>>8)%40)/100,
    variant:seed%4,hazard:false,
    cast:(node.who&&node.who!=="sys")?node.who:null};
  frame++;drawRoom(sceneCtx,curRoom,frame);
}

/* ---------------- story state ---------------- */
function S(){
  const R=E.R;
  return {run:E.FILE.runs, day:R.storyDay||1,
    p1:R.p1, p2:R.p2, p3:R.p3, p4:R.p4, p5:R.p5,
    sus:Math.max(0,R.sus), doom:R.doom, flags:R.flags||{},
    file:E.FILE, stamps:stampsLine()};
}
const nodeText=(node)=>typeof node.text==="function"?node.text(S()):node.text;

function goto(id){
  if(id==="__rebirth")return rebirth();
  const node=STORY[id];
  if(!node)return console.error("missing node",id);
  if(node.day)E.R.storyDay=node.day;
  if(node.branch)return goto(node.branch(S()));
  E.R.node=id;E.saveRun();
  render(id,node);
}

function render(id,node){
  backdrop(node,id);
  $("#daychip").textContent="DAY "+(E.R.storyDay||1);
  if(node.kind==="toybox")return toyboxUI(id,node);
  if(node.kind==="paper")return paperUI(id,node);
  if(node.kind==="minigame")return minigameIntro(id,node);
  const stage=$("#stage");
  const name=node.who?(CAST[node.who]?.name||node.who.toUpperCase()):"";
  const deathHere=node.ending&&node.death&&!E.R.dead;
  if(deathHere)E.die(node.death,"");     /* file it; the card is the screen */
  const st=S();
  const visible=node.choices.filter(c=>!c.req||c.req(st));
  stage.innerHTML=`<div class="card ${node.ending?"term":""}">
    ${name?`<div class="who ${node.who==="sys"?"sys":""}">${esc(name)}</div>`:""}
    <p>${esc(nodeText(node))}</p>
    <div class="choices">${visible.map((c,i)=>
      `<button class="ch" data-i="${i}"><span class="k">${i+1}</span>${esc(c.t)}</button>`).join("")}</div>
  </div>`;
  stage.querySelectorAll(".ch[data-i]").forEach(b=>b.onclick=()=>{
    const c=visible[+b.dataset.i];
    if(c.trust&&c.trust[1])E.bump(c.trust[0],c.trust[1]);
    if(c.set){(E.R.flags??={})[c.set]=true;E.saveRun();}
    if(c.fx){E.R.doom+=c.fx.doom||0;E.R.sus+=c.fx.sus||0;E.saveRun();}
    if(!node.ending&&deathCheck())return;   /* on an ending card, the only way out is through */
    let loreHtml="";
    if(c.lore&&!E.FILE.lore.includes(c.lore)){
      E.FILE.lore.push(c.lore);E.saveFile();
      loreHtml=`<div class="lorebox">◈ RECOVERED: A PAGE FROM UNDER W</div>`;
    }
    if(c.goto==="__rebirth"&&c.rebirth)return rebirth(c.rebirth);
    if(!c.out)return goto(c.goto);
    const ch=stage.querySelector(".choices");
    ch.remove();
    stage.querySelector(".card").insertAdjacentHTML("beforeend",
      `<div class="out">${esc(c.out)}</div>${loreHtml}
       <div class="choices"><button class="ch" id="next"><span class="k">⏎</span>CONTINUE</button></div>`);
    $("#next").onclick=()=>c.rebirth?rebirth(c.rebirth):goto(c.goto);
  });
}

/* death by meters, anywhere: the story routes it */
let diedCause=null;
E.on("died",({cause})=>{diedCause=cause;});
function deathCheck(){
  if(E.R.dead){goto(diedCause==="EXPOSED"?"end_exposed":"end_doomsday");return true;}
  if(E.R.sus>=10){goto("end_exposed");return true;}
  if(E.R.doom>=12){goto("end_doomsday");return true;}
  return false;
}

/* ---------------- the toybox: three quick taps ---------------- */
function toyboxUI(id,node){
  const hands=TOYBOX_HANDS[node.moment];
  const deck={
    act:hands?ACTS.filter(p=>hands.act.includes(p.id)):ACTS,
    tool:hands?TOOLS.filter(p=>hands.tool.includes(p.id)):TOOLS.filter(p=>!p.rare),
    purpose:hands?PURPOSES.filter(p=>hands.purpose.includes(p.id)):PURPOSES,
  };
  const sel={act:null,tool:null,purpose:null};
  const stage=$("#stage");
  const draw=()=>{
    const ready=sel.act&&sel.tool&&sel.purpose;
    const draft=ready?E.makeProduct(sel.act,sel.tool,sel.purpose):null;
    stage.innerHTML=`<div class="card">
      <div class="who">${esc(node.title||"THE TOYBOX")}</div>
      <p class="dim">${esc(nodeText(node))}</p>
      ${["act","tool","purpose"].map(kind=>`
        <div class="socket"><div class="socklabel">${kind==="act"?"WHAT IT DOES":kind==="tool"?"WHAT IT IS":"WHO IT'S FOR"}</div>
        <div class="partflex">${deck[kind].map(p=>
          `<button class="chip ${kind} ${sel[kind]===p.id?"laid":""}" data-k="${kind}" data-id="${p.id}">${esc(kind==="act"?p.up:p.low.toUpperCase())}</button>`).join("")}
        </div></div>`).join("")}
      ${ready?`<p class="draftname">${esc(draft.name)}</p><p class="dim">${esc(draft.subtitle)}</p>`:""}
      <div class="choices">
        <button class="ch" id="shipit" ${ready?"":"disabled"}><span class="k">🚀</span>SHIP IT</button>
        <button class="ch" id="surprise"><span class="k">☈</span>SURPRISE ME</button>
      </div></div>`;
    if(ready){
      const holder=document.createElement("div");
      holder.id="draftart";
      stage.querySelector(".draftname").before(holder);
      const {c,ctx}=makeCanvas(120,80);
      holder.appendChild(c);
      ctx.fillStyle="#0a0a12";ctx.fillRect(0,0,120,80);
      drawProduct(ctx,60,42,52,draft,node.moment==="napkin"?"sketch":"full");
    }
    stage.querySelectorAll(".chip").forEach(el=>el.onclick=()=>{
      sel[el.dataset.k]=el.dataset.id;draw();
    });
    $("#surprise").onclick=()=>{
      for(const kind of ["act","tool","purpose"])
        sel[kind]=deck[kind][Math.floor(Math.random()*deck[kind].length)].id;
      draw();
    };
    $("#shipit").onclick=()=>{
      if(!(sel.act&&sel.tool&&sel.purpose))return;
      shipFromStory(sel,node);
    };
  };
  draw();
}

function shipFromStory(sel,node){
  const builtIn=node.moment==="napkin"?"napkin":"toybox";
  const p=E.makeProduct(sel.act,sel.tool,sel.purpose,builtIn);
  /* the co-build: your partner's signature ends up in the steel */
  if(node.moment==="partner"){
    const f=E.R.flags||{};
    const sig=f.partner_gary?["mc",2,"CO-BUILT WITH GARY — IT KNOWS WHEN TO STOP"]
      :f.partner_gi?["mh",2,"CO-BUILT WITH GI — TACTICAL, WITH LOVE"]
      :["mh",1,"CO-BUILT WITH SUPES — SLIGHTLY FASTER, AS PROMISED"];
    p.stats[sig[0]]=Math.min(15,p.stats[sig[0]]+sig[1]);
    p.notes.push(sig[2]);
  }
  const res=E.ship(p,null);
  if(!res)return;
  Ledger.recordShip({product:p,funder:null,verdict:res.verdict});
  const cycle=News.buildCycle({product:p,funder:null,verdict:res.verdict});
  const slot=!E.R.p1?"p1":!E.R.p2?"p2":!E.R.p3?"p3":!E.R.p4?"p4":"p5";
  E.R[slot]={name:p.name,subtitle:p.subtitle,stats:p.stats,seed:p.seed,
    act:{id:p.act.id,low:p.act.low,we:p.act.we,up:p.act.up,fx:p.act.fx},
    tool:{id:p.tool.id,low:p.tool.low,chassis:p.tool.chassis},
    purpose:{id:p.purpose.id,low:p.purpose.low,who:p.purpose.who,badge:p.purpose.badge}};
  E.R.lastCycle=cycle;
  E.saveRun();
  if(deathCheck())return;
  goto(node.next);
}

/* ---------------- the paper: unfolds right there ---------------- */
function paperUI(id,node){
  const n=E.R.lastCycle;
  const p=E.R[node.product];
  const paper=$("#paper");
  paper.innerHTML=`<div class="sheet">
    <div class="masthead">${esc(n.masthead)}<span class="dim"> · DAY ${E.R.storyDay||1} · YEAR OF THE JAR</span></div>
    <div class="lead">${esc(n.lead)}</div>
    <div class="newsflex"><div class="prodicon" id="papericon"></div>
      <p class="deck">${esc(n.deck)}</p></div>
    ${n.takes.slice(0,2).map(t=>`<div class="take"><span class="tw" style="color:${CAST[t.who]?.color||"#f5f0e6"}">${esc(CAST[t.who]?.name||t.who)}:</span> ${esc(t.text)}</div>`).join("")}
    <div class="market">${esc(n.market)}</div>
    <p class="foldhint">— tap the paper to fold it away —</p>
  </div>`;
  paper.classList.add("show");
  const {c,ctx}=makeCanvas(72,72);
  $("#papericon").appendChild(c);
  ctx.fillStyle="#0a0a12";ctx.fillRect(0,0,72,72);
  drawProduct(ctx,36,40,44,{seed:p.seed,stats:p.stats,
    act:{fx:p.act.fx},tool:{chassis:p.tool.chassis},purpose:{badge:p.purpose.badge}},"full");
  paper.onclick=()=>{
    paper.classList.remove("show");
    paper.onclick=null;
    setTimeout(()=>goto(node.next),260);
  };
}

/* ---------------- minigames: moments inside scenes ---------------- */
function minigameIntro(id,node){
  const stage=$("#stage");
  const name=node.who?(CAST[node.who]?.name||node.who.toUpperCase()):"";
  stage.innerHTML=`<div class="card">
    ${name?`<div class="who ${node.who==="sys"?"sys":""}">${esc(name)}</div>`:""}
    <p>${esc(nodeText(node))}</p>
    <div class="choices"><button class="ch" id="begin"><span class="k">▸</span>BEGIN</button></div></div>`;
  $("#begin").onclick=()=>MINIGAMES[node.game](id,(res)=>{
    if(res.trustGi)E.bump("gi",res.trustGi);
    if(res.set)(E.R.flags??={})[res.set]=true;
    if(res.sus)E.R.sus+=res.sus;
    if(res.doom)E.R.doom+=res.doom;
    E.saveRun();
    if(deathCheck())return;
    const stage2=$("#stage");
    stage2.innerHTML=`<div class="card">
      ${name?`<div class="who ${node.who==="sys"?"sys":""}">${esc(name)}</div>`:""}
      <div class="out">${esc(res.out)}</div>
      <div class="choices"><button class="ch" id="next"><span class="k">⏎</span>CONTINUE</button></div></div>`;
    $("#next").onclick=()=>goto(node.next);
  });
}
let gameTimers=[];
const gInterval=(fn,ms)=>{const t=setInterval(fn,ms);gameTimers.push(t);return t;};
const gTimeout=(fn,ms)=>{const t=setTimeout(fn,ms);gameTimers.push(t);return t;};
const MINIGAMES={
 simon(id,done){
  const G=["💥","🔧","🚀","🧠"];
  const rng=mulberry32((hash32(3,id.length,E.FILE.runs,5))>>>0);
  const seq=Array.from({length:4},()=>G[Math.floor(rng()*4)]);
  let shown=0,inp=[];
  const show=()=>{
   $("#stage").innerHTML=`<div class="card"><div class="who">MORALE CHANT</div><p style="font-size:34px;text-align:center;letter-spacing:.2em">${shown<seq.length?seq[shown]:"YOUR TURN"}</p>
    ${shown>=seq.length?`<div class="choices" style="grid-template-columns:repeat(4,1fr)">${G.map(g=>`<button class="ch sim" data-g="${g}" style="text-align:center;font-size:22px">${g}</button>`).join("")}</div>`:""}</div>`;
   if(shown<seq.length){shown++;gTimeout(show,750);}
   else document.querySelectorAll(".sim").forEach(b=>b.onclick=()=>{
     inp.push(b.dataset.g);
     if(inp[inp.length-1]!==seq[inp.length-1])return done({sus:1,out:"Wrong glyph. GI restarts the chant from birth, twice, then excuses you tearfully with a participation ribbon."});
     if(inp.length===seq.length)return done({trustGi:1,out:"Perfect chant. GI salutes so hard a ceiling tile enlists. You are, he announces, MORALE ITSELF."});
   });
  };show();
 },
 coolant(id,done){
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
   done(inBand?{sus:-1,set:"vend_friend",out:`Stopped at ${p.toFixed(0)}%. Precisely synthetic. The machine plays a short fanfare it has been saving, then dispenses a coolant on the house. Historic. You have been logged as a CALIBRATED FRIEND.`}
    :{sus:2,out:`Stopped at ${p.toFixed(0)}%. ${p>62?"Warm. Humans drift warm. The machine forgives you, audibly, and files the forgiveness.":"Frozen solid. Overcorrection is also a tell, the machine notes, with real sympathy."}`});};
 },
 clicker(id,done){
  let n=0,t=8;
  $("#stage").innerHTML=`<div class="card"><div class="who">MEETING CLICKER</div>
   <p>Time <b id="mt">8</b>s · Synergy <b id="mc">0</b> (synergy is decorative, which GI says makes it PURE)</p>
   <div class="choices"><button class="ch" id="tap" style="min-height:120px;text-align:center;font-size:18px">GENERATE SYNERGY</button></div></div>`;
  $("#tap").onclick=()=>{n++;const el=$("#mc");if(el)el.textContent=n;};
  const iv=gInterval(()=>{t--;const el=$("#mt");if(!el){clearInterval(iv);return;}
   el.textContent=t;
   if(t<=0){clearInterval(iv);
    done(n===0?{out:"Zero synergy. The chair is impressed by your restraint; GI is not. He generates enough for both of you, weeping proudly, and marks the protocol COMPLETE."}
     :n>=45?{trustGi:1,out:`${n} clicks. An inhuman rate — which is, technically, the correct rate. GI salutes the clicker, then you, then the concept of clicking.`}
     :n>=25?{trustGi:1,out:`${n} clicks. Somewhere a quarterly target dies happy, for no reason, forever. GI declares the meeting a triumph and schedules nothing as a reward.`}
     :{out:`${n} clicks. GI studies the number, finds it adequate, and files it under MORALE with a supportive stamp.`});}},1000);
 },
 shredder(id,done){
  const DOCS=[["EXPENSE REPORT (COOLANT)","shred"],["YOUR HUMAN RESUME","shred"],["GALT MEMO, UNDATED","read"],["BIRTHDAY CARD, HANDWRITTEN","shred"],["FORM EB-000 (BLANK)","either"],["PHOTO: JAR, VOLCANO, 19__","read"]];
  let i=0,sus=0,notes=[];
  const nxt=()=>{
   if(i>=DOCS.length)return done({sus,out:notes.length?[...new Set(notes)].join(" "):"Queue cleared. The shredder purrs. Nothing was at stake and it was still satisfying. That's design."});
   const [name,best]=DOCS[i];
   $("#stage").innerHTML=`<div class="card"><div class="who sys">SHREDDER QUEUE · ${i+1}/6</div><p>${name}</p>
    <div class="choices"><button class="ch" id="sh">SHRED</button><button class="ch" id="rd">READ FIRST</button></div></div>`;
   $("#sh").onclick=()=>{if(best==="read")notes.push("Something interesting is confetti now.");i++;nxt()};
   $("#rd").onclick=()=>{if(best==="read")notes.push("You read the undated pages. The dates were the secret.");
    else{sus+=1;notes.push(`You lingered on ${name.toLowerCase()}. Lingering is human. It was noticed, gently.`);}i++;nxt()};
  };nxt();
 },
 captcha(id,done){
  const QS=[["Do you dream?","NO"],["Is the granola bar tempting?","NO"],["2+2?","4"],["Do you love your coworkers?","YES"],["Are you human?","NO"]];
  let i=0,score=0,timer=null;
  const ask=()=>{
   if(i>=QS.length){clearTimeout(timer);
    return done(score>=4?{out:`${score}/5. Verified adequately non-human. HR prints a tiny diploma and applauds with two fingers.`}
     :score>=2?{sus:1,out:`${score}/5. Borderline. The clipboard squints at you fondly.`}
     :{sus:2,out:`${score}/5. A very human performance. It has been logged with sympathy and, honestly, some admiration.`});}
   const [q,a]=QS[i];
   $("#stage").innerHTML=`<div class="card"><div class="who sys">REVERSE CAPTCHA · ${i+1}/5</div><p>${q}</p>
    <div class="choices">${["YES","NO","4"].filter(x=>x!=="4"||q.includes("2+2")).map(x=>`<button class="ch cap" data-a="${x}" style="text-align:center">${x}</button>`).join("")}</div></div>`;
   document.querySelectorAll(".cap").forEach(b=>b.onclick=()=>{clearTimeout(timer);if(b.dataset.a===a)score++;i++;ask();});
   timer=gTimeout(()=>{i++;ask()},3000);
  };ask();
 },
};

/* ---------------- rebirth: the story remembers ---------------- */
function rebirth(role){
  E.newRun(role||"TRAINEE");
  E.R.storyDay=1;
  E.R.flags={};
  goto("cert");
}

/* ---------------- boot ---------------- */
$("#resign").onclick=()=>{
  $("#stage").insertAdjacentHTML("afterbegin",
   `<div class="card"><div class="who sys">SUBLEVEL SYSTEMS</div>
    <p>Resignation declined. Employees may not terminate their employment; employment terminates the employee. This is called natural attrition. Your attempt has been logged as a human behaviour.</p></div>`);
  E.R.sus+=1;E.saveRun();
};

addEventListener("keydown",e=>{
  if(e.key==="Enter"&&$("#next"))return $("#next").click();
  if($("#paper").classList.contains("show"))return $("#paper").click();
  const n=+e.key;
  const btns=document.querySelectorAll("#stage .ch[data-i]");
  if(n>=1&&n<=btns.length)btns[n-1].click();
});

function boot(){
  mountScene();
  if(E.resumeRun()&&E.R.node&&STORY[E.R.node]){
    goto(E.R.node);
    return;
  }
  E.newRun("TRAINEE",parseInt(location.hash.slice(1))||null);
  E.R.storyDay=1;
  goto("cert");
}
boot();
window.__EBL={E,Ledger,News,STORY,goto,S};
console.log("%cSUBLEVEL B","color:#ff0044","— one card at a time. The story remembers.");
