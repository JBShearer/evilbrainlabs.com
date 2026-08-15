/* ============================================================ summons.js
   THE SUMMONS is the antagonist. You are never wandering; you are
   being taken. Shipping heats you up; heat knocks on the shutter.
   Attending costs shop time. Ignoring costs trust, suspicion, doom —
   and some summons escalate when ducked: the hearing becomes a
   subpoena, and the drill comes to YOU.
================================================================ */
import {CAST} from "./data.js";
import * as E from "./engine.js";

const pickRnd=arr=>arr[Math.floor(E.rng()*arr.length)];

let counter=0;

/* ---------------- the types ---------------- */
export const TYPES={
 hearing:{
  who:"stall", room:"conference", body:"hearing",
  arrive:s=>`SUMMONS · HEARING RE: ${s.payload?.product?.name??"YOUR PRODUCT"}. Sen. Stall chairs. There is a chair for you, and a smaller chair for the product.`,
  ignoreFx:{doom:1}, ignoreOut:"The hearing convenes without you. The empty chair testifies. It is more convincing than you would have been.",
  escalate:"subpoena",
  rewards:{clr:1},
 },
 drill:{
  who:"gi", room:"corridor", body:"minigame", game:"simon",
  arrive:()=>"SUMMONS · MANDATORY DRILL! GI HAS COMPOSED A CHANT AND A CONTINGENCY AND A SECOND CONTINGENCY FOR THE FIRST!",
  ignoreFx:{sus:1}, ignoreTrust:["gi",-1],
  ignoreOut:"The drill proceeds without you. Your name is chanted in absentia, sadly.",
  escalate:"invasion",
  invadeText:"THE DRILL HAS COME TO YOU. GI is in the shop. The shop is now a drill site. There was never a version of this where the drill did not find you.",
  rewards:{part:true, trust:["gi",1]},
 },
 emergency:{
  who:"supes", room:"lab", body:"choices",
  arrive:()=>"SUMMONS · SUPES EMERGENCY. 'I fixed the annealer! It's better now! It's... it's pointing at things. Can you come look at what it's pointing at.'",
  event:{text:"The annealer is pointing at the load-bearing wall, then at you, then back at the wall, in the manner of a dog with a theory.",
   choices:[
    {t:"Unplug it together",fx:{syn:3},trust:["supes",1],out:"You unplug it as a team. Supes holds the plug like a defused bomb. The wall relaxes."},
    {t:"Let it finish its thought",fx:{clr:1,doom:1},out:"It points at the wall until the wall confesses to something. Clearance rises. So does the estimate."},
    {t:"Praise the workmanship",fx:{syn:1},trust:["supes",2],out:"'It IS better!' she says, glowing. The annealer, encouraged, anneals nothing menacingly for a week."}]},
  ignoreFx:{doom:1}, ignoreTrust:["supes",-1],
  ignoreOut:"She fixes it unsupervised. It is now the fastest annealer in the hemisphere. It did not need to be.",
  escalate:"invasion",
  invadeText:"SUPES HAS BROUGHT THE ANNEALER TO THE SHOP. 'It missed you!' It is pointing at your bench.",
  rewards:{trust:["supes",1]},
 },
 audit:{
  who:"sys", room:"hr", body:"minigame", game:"captcha",
  arrive:()=>"SUMMONS · SPOT SYNTHETICITY AUDIT. Report to HR to verify you remain adequately non-human. Bring your reflexes, or ideally, don't.",
  ignoreFx:{sus:2},
  ignoreOut:"The audit marks you 'UNVERIFIED.' The word follows you through the ventilation.",
  escalate:"invasion",
  invadeText:"FIELD AUDIT. The auditor is in the shop, holding the reverse CAPTCHA like a warrant. It is, technically, a warrant.",
  rewards:{sus:-2},
 },
 demo:{
  who:"benny", room:"present", body:"pitch",
  arrive:()=>"SUMMONS · MANDATORY DEMO. A delegation is seated and expects to be shown something. Benny booked the room and the anthem.",
  ignoreFx:{}, ignoreTrust:["benny",-1],
  ignoreOut:"The delegation is shown an empty podium. Benny monetizes the awkwardness, but he remembers.",
  escalate:"fizzle",
  rewards:{},
 },
 lunch:{
  who:null, room:"cafeteria", body:"meeting",
  arrive:s=>`SUMMONS · LUNCH ORDER. ${CAST[s.payload?.castId]?.name??"Someone"} is holding a table and the opinion that you never leave the shop.`,
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
  rewards:{},
 },
 records:{
  who:"wendy", room:"archive", body:"archive",
  arrive:()=>"SUMMONS · RECORDS REQUEST. The archive requires a warm body to witness a drawer. Wendy specified you, by name, which she never does.",
  ignoreFx:{}, ignoreTrust:["wendy",-1],
  ignoreOut:"The drawer is witnessed by someone less careful. Wendy files your absence under A.",
  escalate:"fizzle",
  rewards:{clr:1},
 },
 incident:{
  who:"sys", room:"vending", body:"minigame", game:"coolant",
  arrive:()=>"SUMMONS · VENDING INCIDENT. The machine has barricaded itself behind its own snacks and is demanding a calibrated negotiator.",
  ignoreFx:{sus:1},
  ignoreOut:"The machine resolves the standoff alone, and remembers who did not come. Prices feel it.",
  escalate:"fizzle",
  rewards:{coolant:true},
 },
 theword:{
  who:"brain", room:"executive", body:"exec",
  arrive:()=>"SUMMONS · THE FLOOR THAT ISN'T. No memo. No time given. The elevator is already waiting, which is how you know.",
  ignoreFx:{doom:1},
  ignoreOut:"You don't go. Nothing happens, in a way that is worse than something.",
  escalate:"fizzle",
  rewards:{clr:1},
 },
};

/* ---------------- scheduling ----------------
   Chance a ship draws a knock, by ships-since-last-attendance:
   calm start, wall by the fourth. Pending consequence hooks add
   pressure; two summons can wait at once, no more.               */
const CURVE=[0,.05,.15,.30,.75,.90];

export function afterShip(){
  const R=E.R;
  /* expire ducked-by-neglect first */
  for(const s of R.summons.filter(s=>s.ttl<=0&&!s.resolved))duck(s,true);
  R.summons=R.summons.filter(s=>!s.resolved);
  if(R.summons.length>=2)return null;
  const s=Math.min(R.shipsSinceAttend,5);
  /* PITY TIMER: probability curves can cold-streak. Four uninterrupted
     ships means the company arrives, no dice involved — per GAME_LOOP v2,
     "dragged out every few ships" is a promise, not an average. */
  if(s>=4)return spawn();
  let p=CURVE[s]+(dueHooks().length?0.35:0)+R.ducked*0.08;
  if(E.rng()>=Math.min(.95,p))return null;
  return spawn();
}

/* the company is needy, but only nags people who look interruptible —
   deep grind gets interrupted by the ship curve, not by lunch */
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
  /* consequences of your own products first — overwork feeds the interruptions */
  const hooks=dueHooks();
  if(hooks.length&&(!allowed||allowed.includes("hearing"))){
    const h=hooks[0];h.summoned=true;
    return push("hearing",{hook:h,product:h.product});
  }
  let pool=allowed||["drill","emergency","audit","demo","lunch","signature","records","incident","theword"];
  pool=pool.filter(t=>{
    if(t==="demo")return !!R.product||R.inv.act.length&&R.inv.tool.length&&R.inv.purpose.length;
    if(t==="records")return R.clr>=1;
    if(t==="theword")return R.clr>=3&&E.rng()<.3;
    return true;
  });
  if(!pool.length)pool=["lunch"];
  const type=pickRnd(pool);
  const payload={};
  if(type==="lunch")payload.castId=pickRnd(["gary","lisa","rob","sam","benny","wendy","gi","supes"]);
  return push(type,payload);
}

function push(type,payload){
  const R=E.R;
  const s={id:"s"+(++counter)+"-"+R.seed.toString(36), n:R.summonsServed+R.summons.length+counter,
    type, payload, ducked:0, ttl:1, week:R.week, resolved:false};
  R.summons.push(s);
  E.saveRun();
  E.emit("summons",s);
  return s;
}

export const arriveText=(s)=>TYPES[s.type].arrive(s);

/* ---------------- ignoring ---------------- */
export function duck(s,silent=false){
  const R=E.R;
  const T=TYPES[s.type];
  s.ducked++;R.ducked++;
  E.fx(T.ignoreFx||{});
  if(T.ignoreTrust)E.bump(T.ignoreTrust[0],T.ignoreTrust[1]);
  if(T.ignoreTrustDyn&&s.payload?.castId)E.bump(s.payload.castId,-1);
  let out=T.ignoreOut;
  if(s.ducked>=2){
    if(T.escalate==="subpoena"){
      R.subpoena=s.id;s.resolved=false;
      out+=" A SUBPOENA is nailed to the shutter. Shipping is suspended until you answer for the product.";
    } else if(T.escalate==="invasion"){
      R.invasion={type:s.type};s.resolved=true;
      out+=" You hear it coming down the corridor, cheerfully.";
    } else {
      s.resolved=true;
      if(T.who)E.bump(T.who,-2);
      out+=" They stop asking. Around here, that is worse.";
    }
  } else if(s.ttl<=0){
    s.resolved=true;
  }
  R.summons=R.summons.filter(x=>!x.resolved||x.id===R.subpoena);
  E.saveRun();
  return {out,escalated:s.ducked>=2?TYPES[s.type].escalate:null,silent};
}

/* ---------------- attending ---------------- */
export function resolve(s){
  const R=E.R;
  s.resolved=true;
  R.summons=R.summons.filter(x=>x!==s);
  if(R.subpoena===s.id)R.subpoena=false;
  if(s.payload?.hook)s.payload.hook.summoned=true;
  E.attendReset();
  E.saveRun();
}
export const isSubpoenaed=s=>E.R.subpoena===s.id;
export function clearInvasion(){E.R.invasion=null;E.saveRun();}
