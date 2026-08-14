/* ============================================================ board.js
   The in-world work forum, now interactive. Cast posts, HR notices,
   trade offers, replies to your ships — and your own posts, which have
   consequences, because everything here does. Defenders defend and
   detractors dunk, according to how the floor feels about you.
================================================================ */
import {mulberry32,pick} from "./gen.js";
import {DEFENDS,DUNKS,TRADES,POST_OPTIONS,ACTS,TOOLS} from "./data.js";
import * as E from "./engine.js";

export function post(p){
  E.R.board.unshift({week:E.R.week,...p});
  E.R.board=E.R.board.slice(0,40);
  E.saveRun();
}
const say=(who,text,re)=>post({who,text,re});

const NEUTRAL=[
 ["gi",   p=>`FOUR HUNDRED UNITS OF ${p.name.toUpperCase()} REQUISITIONED FOR THE RESERVE! NO FURTHER QUESTIONS! I HAVE ANSWERED THEM ALL IN ADVANCE!`],
 ["benny",p=>`${p.name}: margin's honest, kid. That's rarer than you'd think down here.`],
 ["lisa", p=>`Adding ${p.name} to the spreadsheet. The spreadsheet has a waiting list now.`],
 ["rob",  p=>`Bought two ${p.name}. Nobody made me. That's the whole point.`],
 ["supes",p=>`I upgraded one ${p.name} on my lunch break!! It can fly now. It could NOT fly before, I checked.`],
 ["gary", p=>`Fixed a wobble in the first batch of ${p.name}. Wasn't asked to. Couldn't listen to it all night, could I.`],
 ["wendy",p=>`Filed a copy of the ${p.name} launch deck. For the archive. The archive and I have an understanding.`],
 ["sam",  p=>`On ${p.name}: see my forthcoming paper. On the paper: see my forthcoming paper.`],
 ["stall",p=>`My office has been made aware of ${p.name}. A statement is being scheduled. The schedule is being drafted.`],
];

const HR_NOTICES=[
 "NOTICE: the stairwell between B and C does not exist. Employees report using it anyway. Stop arriving early.",
 "REMINDER: coolant is a beverage, a coping mechanism, and a fire suppressant. Please use responsibly in that order.",
 "POLICY UPDATE §7.12B remains in effect. The one human position remains filled. He is doing fine. Stop asking if he is doing fine.",
 "LOST & FOUND: one nameplate, previous employee, filed under 'natural attrition.' Claim at HR. Bring a reason.",
 "WELLNESS: the breathing exercise is mandatory. Synthetic employees may simulate. Convincingly, this time.",
];

const BRAIN_ANON=[
 "ANONYMOUS: the vending machine's margins are the only honest numbers in this building. This is not the Brain.",
 "ANONYMOUS: whoever keeps fixing things ahead of schedule — noted. Not by the Brain. By someone else who notices everything.",
 "ANONYMOUS: the seven-donor story is airtight. No follow-up questions are necessary. Signed, a regular employee with a body.",
 "ANONYMOUS: productivity is love made measurable. A normal coworker told me that. I am also a normal coworker.",
];

/* Ships get replies by standing: detractors first (grudges are prompt),
   then defenders, then the ambient crowd. */
export function onShip(product){
  const rng=mulberry32(product.seed^0xB0A2D);
  const cast=Object.keys(DEFENDS);
  const detractors=cast.filter(c=>E.trust(c)<=-1);
  const defenders=cast.filter(c=>E.trust(c)>=2);
  if(detractors.length&&rng()<.85){
    const c=pick(rng,detractors);
    say(c,DUNKS[c](product),product.name);
  }
  if(defenders.length&&rng()<.85){
    const c=pick(rng,defenders.filter(c=>!detractors.includes(c)));
    if(c)say(c,DEFENDS[c](product),product.name);
  }
  const [who,fn]=pick(rng,NEUTRAL);
  if(E.trust(who)>-1)say(who,fn(product),product.name);
  if(rng()<.3)say("sys",pick(rng,HR_NOTICES));
  if(rng()<.25)say("anon",pick(rng,BRAIN_ANON));
}

export function onConsequence(boardText){
  if(boardText)say("sys",boardText);
}

export function seedBoard(){
  const rng=mulberry32(E.R.seed^0xF0A);
  say("sys","WELCOME TO SUBLEVEL B. This board is monitored for morale, by morale.");
  say("anon",pick(rng,BRAIN_ANON));
  say("sys",pick(rng,HR_NOTICES));
}

/* ---------------- player posting ---------------- */
export function draftOptions(){
  const last=(E.FILE.ledger||[]).at(-1);
  return POST_OPTIONS({
    lastShip:last||null,
    lastShipMayhem:last? last.stats.mh>=6 : false,
    clr:E.R.clr, sus:E.R.sus,
  });
}

export function submitPost(opt){
  post({who:"you",text:opt.body});
  E.fx(opt.fx||{});
  for(const r of opt.replies||[]){
    E.R.replyQueue.push({dueWeek:E.R.week+1,who:r.who,text:r.text,
      trust:r.trust||null,re:"your post"});
  }
  E.R.postedThisWeek=E.R.week;
  E.saveRun();
  E.tick(1);                       /* posting is a shift. HR checked. */
}
export const canPost=()=>E.R.postedThisWeek!==E.R.week;

/* ---------------- week roll: replies land, trades appear ---------------- */
export function onWeek(){
  let landed=0;
  for(const r of E.R.replyQueue){
    if(r.fired||r.dueWeek>E.R.week)continue;
    r.fired=true;landed++;
    post({who:r.who,text:r.text,re:r.re});
    if(r.trust)E.bump(r.trust[0],r.trust[1]);
  }
  E.R.replyQueue=E.R.replyQueue.filter(r=>!r.fired);
  /* the classifieds */
  const rng=mulberry32((E.R.seed^(E.R.week*2654435761))>>>0);
  if(rng()<.45&&!E.R.board.some(b=>b.kind==="trade"&&!b.done)){
    const t=pick(rng,TRADES);
    const part=t.kind==="selltool"||t.kind==="freepart"
      ? pick(rng,TOOLS.filter(p=>!p.rare)) : (t.kind==="buyact"? null : null);
    post({who:t.who,kind:"trade",tradeId:t.id,partId:part?.id||null,
      text:t.text(part? part.low.toUpperCase() : (t.kind==="buyact"?"ACT":"")),done:false});
  }
  E.saveRun();
  return landed;
}

/* Accept a trade post (index into R.board). Returns a result line. */
export function acceptTrade(i){
  const b=E.R.board[i];
  if(!b||b.kind!=="trade"||b.done)return null;
  const t=TRADES.find(t=>t.id===b.tradeId);
  if(!t)return null;
  if(t.needTrust&&E.trust(t.needTrust[0])<t.needTrust[1])
    return {ok:false,line:"THE HANDSHAKE REQUIRES STANDING. Come back when you're on the roster."};
  if(t.kind==="selltool"){
    if(!E.spend(t.cost))return {ok:false,line:"Synergy insufficient. Gary nods anyway. The bench keeps the part warm."};
    E.grantPart("tool",b.partId);
  }
  if(t.kind==="buyact"){
    if(E.R.inv.act.length<2)return {ok:false,line:"You'd be selling your only ACT. Even Benny won't do that to you. Today."};
    const sold=E.R.inv.act.pop();
    E.R.syn+=t.gain;
  }
  if(t.kind==="laser"){
    if(!E.spend(t.cost))return {ok:false,line:"Twenty-two synergy. The laser waits. Lasers are patient."};
    E.grantPart("tool","laser");
  }
  if(t.kind==="freepart"){
    E.grantPart("tool",b.partId);
    E.fx({doom:t.doom||0});
  }
  b.done=true;
  E.bump(t.who,1);
  E.saveRun();
  return {ok:true,line:t.done};
}
