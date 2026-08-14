/* ============================================================ engine.js
   Run = Employment. Attrition is permanent; the Personnel File is not.
   Reads and extends the v1 save (ebl-basement-file): lore stays found,
   trust stays earned, roles stay unlocked. The labyrinth is new; the
   filing cabinet is the same filing cabinet.
================================================================ */
import {mulberry32,hash32,roomAt as genRoom} from "./gen.js";
import {ACTS,TOOLS,PURPOSES,MODS,productName,productSubtitle} from "./data.js";

export const FILE_KEY="ebl-basement-file";
const RUN_KEY="ebl-basement-run2";

export const byId=(arr)=>Object.fromEntries(arr.map(o=>[o.id,o]));
export const ACT_BY=byId(ACTS), TOOL_BY=byId(TOOLS), PURP_BY=byId(PURPOSES), MOD_BY=byId(MODS);

/* ---------------- the permanent file ---------------- */
export let FILE={
  runs:0,bestDay:0,bestSyn:0,lore:[],trust:{},roles:["TRAINEE"],deaths:{},
  /* v2 */
  v:2, shipsTotal:0, cyclesTotal:0, ledger:[], echoes:[],
};
try{FILE={...FILE,...JSON.parse(localStorage.getItem(FILE_KEY)||"{}")}}catch(_){}
FILE.v=2;
export const saveFile=()=>{try{localStorage.setItem(FILE_KEY,JSON.stringify(FILE))}catch(_){}};
export const trust=h=>FILE.trust[h]||0;
export const bump=(h,n)=>{if(!h)return;
  FILE.trust[h]=Math.max(-5,Math.min(9,trust(h)+n));saveFile();};

/* ---------------- events ---------------- */
const subs={};
export const on=(ev,fn)=>{(subs[ev]??=[]).push(fn);};
export const emit=(ev,...a)=>{for(const fn of subs[ev]||[])fn(...a);};

/* ---------------- the run ---------------- */
export let R=null;
export let rng=Math.random;

export function saveRun(){
  if(!R||R.dead){try{localStorage.removeItem(RUN_KEY)}catch(_){ } return;}
  try{localStorage.setItem(RUN_KEY,JSON.stringify(R))}catch(_){}
}
export function resumeRun(){
  try{
    const raw=localStorage.getItem(RUN_KEY);
    if(!raw)return false;
    const r=JSON.parse(raw);
    if(!r||r.dead||!r.seed)return false;
    R=r; rng=mulberry32((R.seed^(R.log.length*2654435761))>>>0);
    R.replyQueue??=[];               /* saves from before step 4 */
    R.postedThisWeek??=0;
    return true;
  }catch(_){return false;}
}

export function newRun(role,seedOverride){
  const seed=(seedOverride ?? ((Date.now()^(Math.random()*1e9))>>>0))>>>0;
  rng=mulberry32(seed);
  try{history.replaceState(null,"","#"+seed)}catch(_){}
  R={
    seed, role:role||"TRAINEE",
    week:1, shift:0, syn:0, sus:0, clr:0, doom:0,
    pos:{x:0,y:0}, visited:{"0,0":1}, steps:0, stepsSinceTick:0,
    inv:{act:[],tool:[],purpose:[],mods:[],coolant:0,napkins:1},
    product:null, builds:0, ships:0, cycles:0,
    hooks:[], news:[], board:[], wire:[], replyQueue:[], postedThisWeek:0,
    seenMeetings:[], spent:{}, log:[], dead:false, certified:false,
    hearingQueue:[], echoedIn:false,
  };
  if(R.role==="ARCHIVIST")R.clr=1;
  if(R.role==="PROCUREMENT")R.syn=15;
  if(R.role==="BODY DOUBLE")R.sus=-2;
  /* starting kit, seeded */
  const kit=mulberry32(seed^0xBEEF);
  const deal=(arr,n)=>{const out=[];const a=arr.filter(p=>!p.rare);
    for(let i=0;i<n;i++)out.push(a[Math.floor(kit()*a.length)].id);return out;};
  const bonus=R.role==="FACILITIES"?1:0;
  R.inv.act=deal(ACTS,2+bonus);
  R.inv.tool=deal(TOOLS,2+bonus);
  R.inv.purpose=deal(PURPOSES,2+bonus);
  FILE.runs++;saveFile();saveRun();
  emit("newrun");
  return R;
}

export const roomAt=(x,y)=>{
  const room=genRoom(R.seed,x,y);
  if(R.hearingQueue.length && !R.visited[x+","+y] && room.type==="conference"){
    room.hearing=R.hearingQueue[0];
  }
  return room;
};
export const hereRoom=()=>roomAt(R.pos.x,R.pos.y);

/* ---------------- meters + clock ---------------- */
export function fx(d={}){
  R.syn+=d.syn||0; R.sus+=d.sus||0; R.clr+=d.clr||0; R.doom+=d.doom||0;
  if(R.syn<0)R.syn=0;
  emit("meters");
  checkAttrition();
}
export function spend(n){ if(R.syn<n)return false; R.syn-=n; emit("meters"); return true; }

export function tick(n=1){
  for(let i=0;i<n;i++){
    R.shift++;
    if(R.shift>=3){
      R.shift=0; R.week++;
      emit("week", R.week);
    }
  }
  saveRun();
  emit("meters");
  checkAttrition();
}
export function walkTick(){
  R.steps++; R.stepsSinceTick++;
  if(R.stepsSinceTick>=4){R.stepsSinceTick=0;tick(1);}
  else saveRun();
}

export function checkAttrition(){
  if(!R||R.dead)return;
  if(R.sus>=10)return die("EXPOSED",
    "Your humanity was detected at a rate incompatible with employment. Policy §7.12B is enforced with regret and a commemorative mug.");
  if(R.doom>=12)return die("DOOMSDAY",
    "The clock arrived. The show went on without you. Attrition, natural as sunrise.");
}

/* ---------------- products ---------------- */
export function makeProduct(actId,toolId,purpId,builtIn,modIds=[]){
  const act=ACT_BY[actId], tool=TOOL_BY[toolId], purpose=PURP_BY[purpId];
  const seed=hash32(R.seed, R.builds+1, hash32(0,actId.length,toolId.length,purpId.length), 5)>>>0;
  const prng=mulberry32(seed);
  const stats={mg:act.mg+tool.mg+purpose.mg, mh:act.mh+tool.mh+purpose.mh, mc:act.mc+tool.mc+purpose.mc};
  const notes=[];
  for(const m of modIds){const mod=MOD_BY[m];if(!mod)continue;
    stats.mg+=mod.d.mg;stats.mh+=mod.d.mh;stats.mc+=mod.d.mc;notes.push(mod.name);}
  if(builtIn==="napkin"){
    for(const k of ["mg","mh","mc"])stats[k]+=Math.floor(prng()*5)-2;   /* the fuzz */
    stats.mh+=2;                                                        /* the chaos multiplier */
    if(prng()<.18){const k=["mg","mh","mc"][Math.floor(prng()*3)];
      stats[k]+=4;notes.push("NAPKIN MIRACLE");}
  }
  for(const k of ["mg","mh","mc"])stats[k]=Math.max(0,Math.min(15,stats[k]));
  R.builds++;
  const p={
    id:"p"+R.seed.toString(36)+"-"+R.builds,
    name:productName(act,tool,purpose),
    subtitle:productSubtitle(act,tool,purpose),
    act,tool,purpose, stats, seed,
    builtIn, mods:modIds, notes,
    revealed: builtIn==="lab",
    pitched:false, mood:null, funder:null,
    week:R.week,
  };
  R.product=p;
  saveRun();
  return p;
}
export function consumeParts(actId,toolId,purpId){
  const pull=(arr,id)=>{const i=arr.indexOf(id);if(i>=0)arr.splice(i,1);};
  pull(R.inv.act,actId);pull(R.inv.tool,toolId);pull(R.inv.purpose,purpId);
  saveRun();
}
export function grantPart(kind,id){R.inv[kind].push(id);saveRun();}

/* Ship the carried product. Consequence wiring listens on "shipped". */
export function ship(funder){
  const p=R.product;
  if(!p)return null;
  p.funder=funder||null;
  if(funder?.trust)bump(funder.trust[0],funder.trust[1]);
  if(funder?.clr)R.clr+=funder.clr;
  const mult=p.pitched? (p.mood>=80?2:p.mood>=55?1.5:p.mood>=30?1:.5) : 1;
  const revenue=Math.round((p.stats.mg*3+4)*mult + (funder?.mg||0)*2);
  R.syn+=revenue;
  R.ships++; FILE.shipsTotal++;
  R.doom+=1 + (p.stats.mh>=9?1:0);
  R.product=null;
  R.log.push("ship:"+p.name);
  saveFile();
  tick(1);
  emit("shipped",{product:p,funder,revenue});
  return {product:p,funder,revenue};
}

/* ---------------- attrition + the permanent record ---------------- */
export function die(cause,text){
  if(R.dead)return;
  R.dead=true;
  FILE.bestDay=Math.max(FILE.bestDay,R.week);
  FILE.bestSyn=Math.max(FILE.bestSyn,R.syn);
  FILE.deaths[cause]=(FILE.deaths[cause]||0)+1;
  /* unfired consequences follow you into the next employment */
  const pending=R.hooks.filter(h=>!h.fired).slice(0,4)
    .map(h=>({...h,run:FILE.runs}));
  FILE.echoes=(FILE.echoes||[]).concat(pending).slice(-6);
  const unlocks=[];
  const unlock=(role,msg)=>{if(!FILE.roles.includes(role)){FILE.roles.push(role);unlocks.push(msg);}};
  if(FILE.runs>=2)unlock("ARCHIVIST","ROLE UNLOCKED: ARCHIVIST (start with clearance)");
  if(FILE.bestSyn>=25)unlock("PROCUREMENT","ROLE UNLOCKED: PROCUREMENT (start with synergy)");
  if((FILE.deaths.EXPOSED||0)>=2)unlock("BODY DOUBLE","ROLE UNLOCKED: BODY DOUBLE (suspicion resistant)");
  if(FILE.shipsTotal>=5)unlock("FACILITIES","ROLE UNLOCKED: FACILITIES (start with extra parts)");
  if(R.cycles>=3)unlock("PUBLICIST","ROLE UNLOCKED: PUBLICIST (audiences arrive warm)");
  saveFile();saveRun();
  emit("died",{cause,text,unlocks});
}

export function resign(){
  if(!R||R.dead)return;
  R.sus+=2;saveRun();
  emit("resigned");
  checkAttrition();
}
