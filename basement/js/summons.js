/* ============================================================ summons.js
   v5 — restored per THE ASSEMBLY, tuned per THE POINT. The summons
   drags you out when you overwork: heat rises with the streak, the
   shutter knocks, escalations have teeth. But nothing here ever
   gates inventing — a subpoena rides your launches with doom instead
   of blocking them, and every destination is a scene, because the
   world stopped being a punishment and stayed an adventure.
================================================================ */
import {CAST} from "./data.js";
import * as E from "./engine.js";

const pickRnd=arr=>arr[Math.floor(E.rng()*arr.length)];
let counter=0;

/* ---------------- the types ---------------- */
export const TYPES={
 hearing:{
  who:"stall", room:"conference", body:"hearing",
  arrive:s=>`SUMMONS · HEARING RE: ${s.payload?.hook?.product?.name??"YOUR PRODUCT"}. Sen. Stall chairs. There is a chair for you, and a smaller chair for the product.`,
  ignoreFx:{doom:1},
  ignoreOut:"The hearing convenes without you. The empty chair testifies. It is more convincing than you would have been.",
  escalate:"subpoena",
  rewards:{trust:["stall",1]},
 },
 drill:{
  who:"gi", room:"corridor", body:"minigame", game:"simon",
  arrive:()=>"SUMMONS · MANDATORY DRILL! GI HAS COMPOSED A CHANT AND A CONTINGENCY AND A SECOND CONTINGENCY FOR THE FIRST!",
  ignoreFx:{sus:1}, ignoreTrust:["gi",-1],
  ignoreOut:"The drill proceeds without you. Your name is chanted in absentia, sadly.",
  escalate:"invasion",
  invadeText:"THE DRILL HAS COME TO YOU. GI is at your desk. Your desk is now a drill site. There was never a version of this where the drill did not find you.",
  rewards:{part:true, trust:["gi",1]},
 },
 emergency:{
  who:"supes", room:"lab", body:"choices",
  arrive:()=>"SUMMONS · SUPES EMERGENCY. 'I fixed the annealer! It's better now! It's... it's pointing at things. Can you come look at what it's pointing at.'",
  event:{text:"The annealer is pointing at the load-bearing wall, then at you, then back at the wall, in the manner of a dog with a theory.",
   choices:[
    {t:"Unplug it together",fx:{syn:3},trust:["supes",1],out:"You unplug it as a team. Supes holds the plug like a defused bomb. The wall relaxes."},
    {t:"Let it finish its thought",fx:{doom:1},out:"It points at the wall until the wall confesses to something. The estimate rises with your respect."},
    {t:"Praise the workmanship",fx:{syn:1},trust:["supes",2],out:"'It IS better!' she says, glowing. The annealer, encouraged, anneals nothing menacingly for a week."}]},
  ignoreFx:{doom:1}, ignoreTrust:["supes",-1],
  ignoreOut:"She fixes it unsupervised. It is now the fastest annealer in the hemisphere. It did not need to be.",
  escalate:"invasion",
  invadeText:"SUPES HAS BROUGHT THE ANNEALER TO YOUR DESK. 'It missed you!' It is pointing at your toybox.",
  rewards:{trust:["supes",1]},
 },
 audit:{
  who:"sys", room:"hr", body:"minigame", game:"captcha",
  arrive:()=>"SUMMONS · SPOT SYNTHETICITY AUDIT. Report to HR to verify you remain adequately non-human. Bring your reflexes, or ideally, don't.",
  ignoreFx:{sus:2},
  ignoreOut:"The audit marks you 'UNVERIFIED.' The word follows you through the ventilation.",
  escalate:"invasion",
  invadeText:"FIELD AUDIT. The auditor is at your desk, holding the reverse CAPTCHA like a warrant. It is, technically, a warrant.",
  rewards:{sus:-2},
 },
 lunch:{
  who:null, room:"cafeteria", body:"meeting",
  arrive:s=>`SUMMONS · LUNCH ORDER. ${CAST[s.payload?.castId]?.name??"Someone"} is holding a table and the opinion that you never leave the desk.`,
  ignoreFx:{}, ignoreTrustDyn:true,
  ignoreOut:"The table is released back into the cafeteria. The opinion hardens into a fact.",
  escalate:"fizzle",
  rewards:{},
 },
 signature:{
  who:"sys", room:"mailroom", body:"mail",
  arrive:()=>"SUMMONS · SIGNATURE REQUIRED. A package is refusing to be left. The mailroom describes it as 'patient, for now.'",
  ignoreFx:{},
  ignoreOut:"RETURNED TO SENDER. Whatever it was, it is someone else's now. The mailroom logs your regret pre-emptively.",
  escalate:"fizzle",
  rewards:{part:true},
 },
 incident:{
  who:"sys", room:"vending", body:"minigame", game:"coolant",
  arrive:()=>"SUMMONS · VENDING INCIDENT. The machine has barricaded itself behind its own snacks and is demanding a calibrated negotiator.",
  ignoreFx:{sus:1},
  ignoreOut:"The machine resolves the standoff alone, and remembers who did not come. Prices feel it.",
  escalate:"fizzle",
  rewards:{coolant:true},
 },
};

/* ---------------- scheduling: overwork feeds the interruptions -------- */
const CURVE=[0,.05,.15,.30,.75,.90];

export function afterShip(){
  const R=E.R;
  for(const s of R.summons.filter(s=>s.ttl<=0&&!s.resolved))duck(s,true);
  R.summons=R.summons.filter(s=>!s.resolved);
  if(R.summons.length>=2)return null;
  const sN=Math.min(R.shipsSinceAttend,5);
  let p=CURVE[sN]+(dueHooks().length?0.35:0)+R.ducked*0.08;
  if(E.rng()>=Math.min(.95,p))return null;
  return spawn();
}

export function onWeek(){
  const R=E.R;
  if(R.summons.length||R.invasion)return null;
  if(R.shipsSinceAttend>1)return null;
  if(E.rng()<.16)return spawn(["lunch","signature","incident"]);
  return null;
}

function dueHooks(){
  return E.R.hooks.filter(h=>h.fired&&!h.summoned&&["hearing","recall","grudge"].includes(h.type));
}

export function spawn(allowed){
  const R=E.R;
  const hooks=dueHooks();
  if(hooks.length&&(!allowed||allowed.includes("hearing"))){
    const h=hooks[0];h.summoned=true;
    return push("hearing",{hook:h});
  }
  let pool=allowed||["drill","emergency","audit","lunch","signature","incident"];
  const type=pickRnd(pool);
  const payload={};
  if(type==="lunch")payload.castId=pickRnd(["gary","lisa","rob","sam","benny","wendy","gi","supes"]);
  return push(type,payload);
}

function push(type,payload){
  const R=E.R;
  const s={id:"s"+(++counter)+"-"+R.seed.toString(36),
    type, payload, ducked:0, ttl:2, week:R.week, resolved:false, subpoenaed:false};
  R.summons.push(s);
  E.saveRun();
  E.emit("summons",s);
  return s;
}

export const arriveText=(s)=>TYPES[s.type].arrive(s);

/* ---------------- ignoring: teeth without gates ---------------- */
export function duck(s,silent=false){
  const R=E.R;
  const T=TYPES[s.type];
  s.ducked++;R.ducked++;
  E.fx(T.ignoreFx||{});
  if(R.dead)return {out:"",escalated:null,silent};
  if(T.ignoreTrust)E.bump(T.ignoreTrust[0],T.ignoreTrust[1]);
  if(T.ignoreTrustDyn&&s.payload?.castId)E.bump(s.payload.castId,-1);
  let out=T.ignoreOut;
  if(s.ducked>=2){
    if(T.escalate==="subpoena"&&!s.subpoenaed){
      s.subpoenaed=true;R.subpoenas++;
      out+=" A SUBPOENA is nailed to your desk. It rides every launch now: DOOM +1 per ship until you answer for the product.";
    } else if(T.escalate==="invasion"){
      R.invasion={type:s.type};s.resolved=true;
      out+=" You hear it coming down the corridor, cheerfully.";
    } else {
      s.resolved=true;
      if(T.who)E.bump(T.who,-2);
      out+=" They stop asking. Around here, that is worse.";
    }
  } else if(s.ttl<=0&&!s.subpoenaed){
    s.resolved=true;
  }
  R.summons=R.summons.filter(x=>!x.resolved);
  E.saveRun();
  return {out,escalated:s.ducked>=2?TYPES[s.type].escalate:null,silent};
}

/* ---------------- attending ---------------- */
export function resolve(s){
  const R=E.R;
  s.resolved=true;
  if(s.subpoenaed)R.subpoenas=Math.max(0,R.subpoenas-1);
  R.summons=R.summons.filter(x=>x!==s);
  if(s.payload?.hook)s.payload.hook.summoned=true;
  E.attendReset();
  E.saveRun();
}
export function clearInvasion(){E.R.invasion=null;E.saveRun();}
