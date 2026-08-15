/* ============================================================ engine.js
   Run = Employment. v3, per COURSE CORRECTION v2: the SHOP is home,
   shipping is the point, and the streak compounds — right up until
   the shutter rattles. Attrition is permanent; the Personnel File is
   not. Reads and extends the old save: lore stays found, trust stays
   earned, roles stay unlocked. Pre-shop mid-run saves are retired
   with severance (discarded); the FILE carries on.
================================================================ */
import {mulberry32,hash32,roomAt as genRoom} from "./gen.js";
import {ACTS,TOOLS,PURPOSES,MODS,productName,productSubtitle,computeVerdict} from "./data.js";

export const FILE_KEY="ebl-basement-file";
const RUN_KEY="ebl-basement-run3";

export const byId=(arr)=>Object.fromEntries(arr.map(o=>[o.id,o]));
export const ACT_BY=byId(ACTS), TOOL_BY=byId(TOOLS), PURP_BY=byId(PURPOSES), MOD_BY=byId(MODS);

/* ---------------- the permanent file ---------------- */
export let FILE={
  runs:0,bestDay:0,bestSyn:0,lore:[],trust:{},roles:["TRAINEE"],deaths:{},
  v:3, shipsTotal:0, cyclesTotal:0, ledger:[], echoes:[], bestStreak:0,
};
try{FILE={...FILE,...JSON.parse(localStorage.getItem(FILE_KEY)||"{}")}}catch(_){}
FILE.v=3; FILE.bestStreak??=0;
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
    if(!("heat" in r))return false;      /* pre-shop save: retire it */
    R=r; rng=mulberry32((R.seed^(R.log.length*2654435761))>>>0);
    R.inv.act=R.inv.act.filter(id=>ACT_BY[id]);
    R.inv.tool=R.inv.tool.filter(id=>TOOL_BY[id]);
    R.inv.purpose=R.inv.purpose.filter(id=>PURP_BY[id]);
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
    heat:0, streak:0, shipsSinceAttend:0,
    summons:[], subpoena:false, invasion:null, summonsServed:0, ducked:0,
    inv:{act:[],tool:[],purpose:[],mods:[],coolant:0,napkins:1},
    product:null, builds:0, ships:0, cycles:0, extUsed:0,
    verdicts:{GOOD:0,EVIL:0,REVIEW:0},
    hooks:[], news:[], board:[], wire:[], replyQueue:[], postedThisWeek:0,
    seenMeetings:[], spent:{}, log:[], dead:false, certified:false,
    echoedIn:false, chuteBought:0,
  };
  if(R.role==="ARCHIVIST")R.clr=1;
  if(R.role==="PROCUREMENT")R.syn=15;
  if(R.role==="BODY DOUBLE")R.sus=-2;
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

/* Destination rooms for summons: still the labyrinth generator, still
   seeded — you just don't walk there. You are taken. */
export const roomAt=(x,y)=>genRoom(R.seed,x,y);
export function roomForSummons(s){
  const h=hash32(R.seed,s.n,7,13);
  return {x:(h%23)-11, y:((h>>>8)%23)-11};
}

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
      if(R.week%6===0){R.doom++;emit("quarter",R.week);}  /* the quarter closes */
      emit("week", R.week);
    }
  }
  saveRun();
  emit("meters");
  checkAttrition();
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
    for(const k of ["mg","mh","mc"])stats[k]+=Math.floor(prng()*5)-2;
    stats.mh+=2;
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

/* Streak multiplier: grinding compounds. */
export const streakMult=(streak)=>1+0.15*Math.min(Math.max(0,streak-1),6);

/* Ship from the bench. The docket stamps it; the heat remembers it. */
export function ship(funder){
  const p=R.product;
  if(!p||R.subpoena)return null;
  p.funder=funder||null;
  if(funder?.trust)bump(funder.trust[0],funder.trust[1]);
  if(funder?.clr)R.clr+=funder.clr;
  R.streak++;
  R.shipsSinceAttend++;
  R.heat=R.shipsSinceAttend+R.ducked*0.5;
  const sMult=streakMult(R.streak+(R.role==="SHIPWRIGHT"?1:0));
  const moodMult=p.pitched? (p.mood>=75?2:p.mood>=55?1.5:p.mood>=30?1:.5) : 1;
  const revenue=Math.round(((p.stats.mg*2+4)*moodMult + (funder?.mg||0)*2)*sMult);
  R.syn+=revenue;
  R.ships++; FILE.shipsTotal++;
  FILE.bestStreak=Math.max(FILE.bestStreak,R.streak);
  R.doom+=1 + (p.stats.mh>=9?1:0);
  const verdict=computeVerdict(p,funder,FILE.trust);
  R.verdicts[verdict.stamp]=(R.verdicts[verdict.stamp]||0)+1;
  /* offcuts: the shop floor keeps a spare from every build */
  const orng=mulberry32((p.seed^0x0FC7)>>>0);
  const okind=["act","tool","purpose"][Math.floor(orng()*3)];
  const opool={act:ACTS,tool:TOOLS,purpose:PURPOSES}[okind].filter(x=>!x.rare);
  const opart=opool[Math.floor(orng()*opool.length)];
  R.inv[okind].push(opart.id);
  const offcut={kind:okind,id:opart.id};
  R.product=null;
  R.log.push("ship:"+p.name);
  /* summons TTLs count in ships */
  for(const s of R.summons)s.ttl--;
  saveFile();
  tick(1);
  emit("shipped",{product:p,funder,revenue,verdict,streak:R.streak,mult:sMult,offcut});
  return {product:p,funder,revenue,verdict,streak:R.streak,mult:sMult,offcut};
}

/* The tax is time. Attending resets the grind. */
export function attendReset(){
  R.streak=0;
  R.shipsSinceAttend=0;
  R.heat=Math.max(0,R.ducked*0.5);
  R.summonsServed++;
  saveRun();
}

/* ---------------- attrition + the permanent record ---------------- */
export function die(cause,text){
  if(R.dead)return;
  R.dead=true;
  FILE.bestDay=Math.max(FILE.bestDay,R.week);
  FILE.bestSyn=Math.max(FILE.bestSyn,R.syn);
  FILE.deaths[cause]=(FILE.deaths[cause]||0)+1;
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
  if(FILE.bestStreak>=5)unlock("SHIPWRIGHT","ROLE UNLOCKED: SHIPWRIGHT (streaks warm one ship sooner)");
  saveFile();saveRun();
  emit("died",{cause,text,unlocks});
}

export function resign(){
  if(!R||R.dead)return;
  R.sus+=2;saveRun();
  emit("resigned");
  checkAttrition();
}
