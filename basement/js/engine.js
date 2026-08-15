/* ============================================================ engine.js
   v5 — THE ASSEMBLY. Every chapter, one game. Inventing is free,
   always, from anywhere (THE POINT, unbroken). Around that free core:
   doom and suspicion put stakes back on the clock, synergy pays for
   garnish, owned parts are a crafting layer that enriches and never
   gates, streaks reward the grind, and attrition ends employments
   while the FILE remembers everything. Tension is the design.
================================================================ */
import {mulberry32,hash32,roomAt as genRoom} from "./gen.js";
import {ACTS,TOOLS,PURPOSES,MODS,productName,productSubtitle,computeVerdict} from "./data.js";

export const FILE_KEY="ebl-basement-file";
const RUN_KEY="ebl-basement-run5";

export const byId=(arr)=>Object.fromEntries(arr.map(o=>[o.id,o]));
export const ACT_BY=byId(ACTS), TOOL_BY=byId(TOOLS), PURP_BY=byId(PURPOSES), MOD_BY=byId(MODS);
export const PART_KIND=(id)=>ACT_BY[id]?"act":TOOL_BY[id]?"tool":PURP_BY[id]?"purpose":null;
export const PART_OF=(id)=>ACT_BY[id]||TOOL_BY[id]||PURP_BY[id]||null;

/* ---------------- the permanent file ---------------- */
export let FILE={
  runs:0,bestDay:0,bestSyn:0,lore:[],trust:{},roles:["TRAINEE"],deaths:{},
  v:5, shipsTotal:0, cyclesTotal:0, ledger:[], echoes:[], bestStreak:0,
};
try{FILE={...FILE,...JSON.parse(localStorage.getItem(FILE_KEY)||"{}")}}catch(_){}
FILE.v=5; FILE.bestStreak??=0;
export const saveFile=()=>{try{localStorage.setItem(FILE_KEY,JSON.stringify(FILE))}catch(_){}};
export const trust=h=>FILE.trust[h]||0;
export const bump=(h,n)=>{if(!h)return;
  FILE.trust[h]=Math.max(-5,Math.min(9,trust(h)+n));saveFile();};

/* The archive opens for inventors; the ARCHIVIST arrives pre-known. */
export const shipsClearance=()=>Math.min(6,
  Math.floor(((FILE.shipsTotal||0)+(R?.role==="ARCHIVIST"?2:0))/2));

/* ---------------- events ---------------- */
const subs={};
export const on=(ev,fn)=>{(subs[ev]??=[]).push(fn);};
export const emit=(ev,...a)=>{for(const fn of subs[ev]||[])fn(...a);};

/* ---------------- the run (Run = Employment, again) ---------------- */
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
    if(!r||r.dead||!r.seed||!Array.isArray(r.scenes)||!("doom" in r))return false;
    R=r; rng=mulberry32((R.seed^(R.log.length*2654435761))>>>0);
    return true;
  }catch(_){return false;}
}

export function newRun(role,seedOverride){
  const seed=(seedOverride ?? ((Date.now()^(Math.random()*1e9))>>>0))>>>0;
  rng=mulberry32(seed);
  try{history.replaceState(null,"","#"+seed)}catch(_){}
  R={
    seed, role:role||"TRAINEE",
    week:1, shift:0, syn:0, sus:0, doom:0,
    ships:0, cycles:0, streak:0, shipsSinceAttend:0, ducked:0, summonsServed:0,
    summons:[], subpoenas:0, invasion:null,
    owned:{},                        /* partId → count: the crafting garnish */
    coolant:0, extUsed:0,
    scenes:[], visited:{"0,0":1}, inspiration:null,
    invent:{act:null,tool:null,purpose:null,mod:null,premium:{}},
    hooks:[], news:[], board:[], wire:[], replyQueue:[], postedThisWeek:0,
    seenMeetings:[], spent:{}, log:[], dead:false, certified:false, echoedIn:false,
  };
  if(R.role==="PROCUREMENT")R.syn=15;
  if(R.role==="BODY DOUBLE")R.sus=-2;
  if(R.role==="FACILITIES"){
    const kit=mulberry32(seed^0xBEEF);
    for(let i=0;i<3;i++){
      const pool=[ACTS,TOOLS,PURPOSES][i].filter(p=>!p.rare);
      const part=pool[Math.floor(kit()*pool.length)];
      R.owned[part.id]=(R.owned[part.id]||0)+1;
    }
  }
  FILE.runs++;saveFile();saveRun();
  emit("newrun");
  return R;
}

export const roomAt=(x,y)=>genRoom(R.seed,x,y);

/* ---------------- meters + clock (the stakes) ---------------- */
export function fx(d={}){
  R.syn+=d.syn||0; R.sus+=d.sus||0; R.doom+=d.doom||0;
  if(R.syn<0)R.syn=0;
  emit("meters");
  checkAttrition();
}
export function spend(n){ if(R.syn<n)return false; R.syn-=n; emit("meters"); return true; }
export function grantPart(id,n=1){R.owned[id]=(R.owned[id]||0)+n;saveRun();emit("meters");}

export function tick(n=1){
  for(let i=0;i<n;i++){
    R.shift++;
    if(R.shift>=3){
      R.shift=0; R.week++;
      if(R.week%6===0){R.doom++;emit("quarter",R.week);}   /* time is never free */
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

/* ---------------- inventing: free core, crafted garnish ---------------- */
export const streakMult=(streak)=>1+0.15*Math.min(Math.max(0,streak-1),6);

export function makeProduct(actId,toolId,purpId,builtIn="toybox",modIds=[],premium={}){
  const act=ACT_BY[actId], tool=TOOL_BY[toolId], purpose=PURP_BY[purpId];
  const seed=hash32(R.seed,(FILE.shipsTotal||0)+R.ships+1,
    hash32(0,actId.length,toolId.length,purpId.length),5)>>>0;
  const prng=mulberry32(seed);
  const stats={mg:act.mg+tool.mg+purpose.mg, mh:act.mh+tool.mh+purpose.mh, mc:act.mc+tool.mc+purpose.mc};
  const notes=[];
  /* PREMIUM: a found copy of a part, socketed, enriches — never required.
     Consumes the owned copy: crafting, not accounting. */
  let premiumCount=0;
  for(const id of [actId,toolId,purpId]){
    if(!premium[id])continue;
    if((R.owned[id]||0)<=0)continue;
    R.owned[id]--;
    premiumCount++;
    const p=PART_OF(id);
    const dom=p.mg>=p.mh&&p.mg>=p.mc?"mg":p.mh>=p.mc?"mh":"mc";
    stats[dom]+=1;
    notes.push("FIELD-TESTED "+(PART_KIND(id)==="act"?p.up:p.low.toUpperCase()));
  }
  for(const m of modIds){const mod=MOD_BY[m];if(!mod)continue;
    stats.mg+=mod.d.mg;stats.mh+=mod.d.mh;stats.mc+=mod.d.mc;notes.push(mod.name);}
  if(builtIn==="napkin"){
    for(const k of ["mg","mh","mc"])stats[k]+=Math.floor(prng()*5)-2;
    stats.mh+=2;
    if(prng()<.18){const k=["mg","mh","mc"][Math.floor(prng()*3)];
      stats[k]+=4;notes.push("NAPKIN MIRACLE");}
  }
  for(const k of ["mg","mh","mc"])stats[k]=Math.max(0,Math.min(15,stats[k]));
  saveRun();
  return {
    id:"p"+seed.toString(36),
    name:productName(act,tool,purpose),
    subtitle:productSubtitle(act,tool,purpose),
    act,tool,purpose, stats, seed,
    builtIn, mods:modIds, notes, premiumCount,
    pitched:false, mood:null, funder:null,
    week:R.week,
  };
}

/* Ship: still the plot generator — now it also pays and heats. */
export function ship(product,funder){
  const p=product;
  if(!p)return null;
  p.funder=funder||null;
  if(funder?.trust)bump(funder.trust[0],funder.trust[1]);
  R.streak++;
  R.shipsSinceAttend++;
  const sMult=streakMult(R.streak+(R.role==="SHIPWRIGHT"?1:0));
  const moodMult=p.pitched? (p.mood>=75?2:p.mood>=55?1.5:p.mood>=30?1:.5) : 1;
  const revenue=Math.round(((p.stats.mg*2+4)*moodMult + (funder?.mg||0)*2)*sMult);
  R.syn+=revenue;
  R.ships++; FILE.shipsTotal++;
  FILE.bestStreak=Math.max(FILE.bestStreak,R.streak);
  R.doom+=1 + (p.stats.mh>=9?1:0);
  R.doom+=R.subpoenas;               /* unanswered subpoenas ride every launch */
  const verdict=computeVerdict(p,funder,FILE.trust);
  R.log.push("ship:"+p.name);
  for(const s of R.summons)s.ttl--;
  saveFile();
  tick(1);
  emit("shipped",{product:p,funder,verdict,revenue,streak:R.streak,mult:sMult});
  return {product:p,funder,verdict,revenue,streak:R.streak,mult:sMult};
}

/* Attending a summons is the tax; wandering never is. */
export function attendReset(){
  R.streak=0;
  R.shipsSinceAttend=0;
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
  const pending=R.hooks.filter(h=>!h.fired).slice(0,4).map(h=>({...h,run:FILE.runs}));
  FILE.echoes=(FILE.echoes||[]).concat(pending).slice(-6);
  const unlocks=[];
  const unlock=(role,msg)=>{if(!FILE.roles.includes(role)){FILE.roles.push(role);unlocks.push(msg);}};
  if(FILE.runs>=2)unlock("ARCHIVIST","ROLE UNLOCKED: ARCHIVIST (the drawers already know you)");
  if(FILE.bestSyn>=25)unlock("PROCUREMENT","ROLE UNLOCKED: PROCUREMENT (start with synergy)");
  if((FILE.deaths.EXPOSED||0)>=2)unlock("BODY DOUBLE","ROLE UNLOCKED: BODY DOUBLE (suspicion resistant)");
  if(FILE.shipsTotal>=5)unlock("FACILITIES","ROLE UNLOCKED: FACILITIES (start with field-tested parts)");
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
