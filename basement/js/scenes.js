/* ============================================================ scenes.js
   THE POINT: the world is your invention's aftermath, played as an
   adventure. You ship a thing and the map lights up with the life it
   started. You never find shit — you meet your own decisions wearing
   costumes. When in doubt between a mechanic and a scene, this file
   chose the scene.
================================================================ */
import {mulberry32,hash32,pick,shuffle} from "./gen.js";
import {CAST,ACTS,TOOLS,PURPOSES,MEETINGS,MAIL,cap} from "./data.js";
import * as E from "./engine.js";

let counter=0;

/* An inspiration: a scene hands you the next invention. */
const inspire=(kind,id,line)=>({kind,id,line});
const rndPart=(rng,kind)=>{
  const pool={act:ACTS,tool:TOOLS,purpose:PURPOSES}[kind];
  return pick(rng,pool);
};

/* ---------------- AFTERMATH SCENES ----------------
   Templates parameterized by the product. Two or three beats,
   punchline last, nobody down here knows they're funny.        */
const S=(who,room,when,build)=>({who,room,when,build});
export const AFTERMATH=[

 S("supes","corridor",()=>true,(p,rng)=>({
  title:"ALREADY DEPLOYED",
  text:`Supes is in the hallway with a ${p.tool.low}. Your ${p.tool.low}. It has been improved. It hovers now, slightly, the way things do around her when they are afraid to be next.\n\n"I found a ${p.name} in the break room! I gave it range!"`,
  choices:[
   {t:"How much range?",trust:["supes",1],
    out:`She points, proudly, at the horizon. The horizon now ${p.act.low}. You built that. Technically she built that. The paperwork will say you built that.`,
    echo:{board:["supes",`UPDATE: all ${p.name} units now have range!! You're welcome!! Range is love!!`]}},
   {t:"It wasn't supposed to hover",trust:["supes",1],
    out:`"Nothing is, at first." She says it with such warmth that you write it down. Somewhere a physics teacher feels a disturbance and grades harder.`},
   {t:"Quietly unplug it",
    out:`It has no plug. It never had a plug. It runs, she explains happily, on momentum now. Everything around her does.`,
    inspire:()=>inspire("act","evacuates","Watching it hover, you think: buildings should be able to leave situations too.")}]})),

 S("gi","corridor",p=>p.stats.mh>=4,(p,rng)=>({
  title:"WEAPONIZED, WITH LOVE",
  text:`GI has your ${p.name} mounted on something with treads. The treads are new. The salute is immediate.\n\n"I HAVE MADE IT TACTICAL! IT STILL ${p.act.low.toUpperCase()} — BUT NOW IT DOES SO FROM COVER!"`,
  choices:[
   {t:"It was for " + "civilians, GI",trust:["gi",1],
    out:`"CIVILIANS DESERVE COVER TOO!" He is not wrong, which is the problem with him, forever.`},
   {t:"Ask for a demonstration",trust:["gi",2],
    out:`The demonstration is magnificent and the hallway is wider now. He files the wall under 'improvements.' A ceiling tile applies for hazard pay.`,
    echo:{wire:p2=>`FACILITIES NOTE: corridor B-EAST widened by enthusiasm. ${p2.name} implicated, decorated.`}},
   {t:"Take the treads off",grant:"drones",
    out:`He lets you. He watches you do it the way a dog watches you eat. The treads are yours now — field-tested, faintly warm. Somewhere behind his eyes, a second set is already being requisitioned.`,
    inspire:()=>inspire("purpose","troops","GI hums a march at you until you consider building something for the battalion on purpose, properly, with adult supervision.")}]})),

 S("benny","cafeteria",()=>true,(p,rng)=>({
  title:"THE MERCH EXISTS",
  text:`Benny has a folding table by the cafeteria door. On it: ${p.name} t-shirts, ${p.name} mugs, and a foam ${p.tool.low} that says I SURVIVED THE FIRST BATCH.\n\n"Kid. Margins on nostalgia are insane and it shipped YESTERDAY."`,
  choices:[
   {t:"Buy the mug",trust:["benny",1],
    out:`He charges you full price and calls it an honor. The mug ${p.act.low}. It wasn't supposed to. Benny says that's the collector's edition.`,
    echo:{board:["benny",`${p.name} merch moving. The foam ones are load-bearing. Ask me how I know, kid.`]}},
   {t:"Where does the money go?",
    out:`"Margin, kid. The money IS where it goes." He says it like a koan. Two economists at the next table start taking notes.`},
   {t:"Demand royalties",trust:["benny",1],
    out:`He respects the ask so much he frames it. Not pays it. Frames it. It hangs behind the table, gathering value.`,
    inspire:()=>inspire("act","monetizes","The foam one sold out while you stood there. Fine. FINE. What if the next thing just monetized honestly, out loud.")}]})),

 S("lisa","cafeteria",p=>p.stats.mg>=6,(p,rng)=>({
  title:"THE ORGANIZING MEETING",
  text:`Lisa has convened the ${p.name} units in the cafeteria. They are arranged in rows. One has a tiny sash. She is teaching them the word 'shift.'\n\n"Your product had labor conditions the moment it worked. I'm just doing the paperwork."`,
  choices:[
   {t:"Sit in on the meeting",trust:["lisa",1],
    out:`You sit in the back. The units vote on coolant breaks. The motion carries. The one with the sash looks at you the way you once looked at a whiteboard: with plans.`,
    echo:{board:["lisa",`The ${p.name} local ratified its first contract. Management (you know who you are) took it well, considering.`]}},
   {t:"They're not workers, they're products",
    out:`"That's what they said about everyone." She hands you a pamphlet. The pamphlet ${p.act.low}. It organized itself.`},
   {t:"Negotiate on behalf of management",trust:["lisa",1],
    out:`You concede coolant breaks and a bulletin board. Lisa shakes your hand once, firmly, like a stamp coming down. It is the most legitimate you have felt all week.`,
    inspire:()=>inspire("purpose","commons","One of the units asks, through Lisa, what you plan to make for everyone. It has a follow-up question ready. You leave before it asks.")}]})),

 S("rob","conference",()=>true,(p,rng)=>({
  title:"THE WHITEPAPER",
  text:`Rob has written a whitepaper about your ${p.name}: 'LET THE ${p.tool.low.toUpperCase()} DECIDE.' He hands you a copy. He hands everyone a copy. Nobody made him do this, he says. That's the point, he says.`,
  choices:[
   {t:"Read page one",trust:["rob",1],
    out:`Page one argues your product proves regulation lags invention. Page two is a coupon. The tension between them is the whole American century.`},
   {t:"Point out it broke twice",
    out:`"Freely!" He beams. "It broke FREELY." You cannot argue with him. Constitutionally, you cannot.`},
   {t:"Ask what it should decide",
    out:`"Whatever it wants. That's what deciding means." Behind him the ${p.tool.low} quietly ${p.act.low}. It has, apparently, decided.`,
    inspire:()=>inspire("tool","focus","You could just ask people what they want. Eleven strangers. A sandwich platter. It's crazy enough to work, or at least to cater.")}]})),

 S("wendy","archive",()=>true,(p,rng)=>({
  title:"THE FILE ALREADY EXISTS",
  text:`Wendy has a folder labeled ${p.name}. It is thicker than the product is old. She does not explain how. Archivists have their ways, and their ways have archivists.\n\n"Sign here. It says you existed when this happened."`,
  choices:[
   {t:"Sign it",trust:["wendy",1],
    out:`You sign. She countersigns. Somewhere in the future, a historian bursts into tears of gratitude and doesn't know why.`},
   {t:"Read the folder first",trust:["wendy",1],
    out:`Page six is a memo about your product dated before you invented it. You look at Wendy. Wendy looks at the drawer marked W. Neither of you says anything, professionally.`},
   {t:"Refuse to be documented",
    out:`"Noted," she says, documenting it. The folder gains a page. The page is about the refusal. There is no exit from an archive, only intake.`,
    inspire:()=>inspire("act","predicts","If the file predates the product, prediction is just filing done early. You could build that. Someone apparently already knew you would.")}]})),

 S("stall","conference",p=>p.stats.mh>=6,(p,rng)=>({
  title:"THE HEARING CONVENES",
  text:`Sen. Stall has convened a hearing about ${p.name}. There is a chair for you and a smaller chair for the product. The product's chair has a microphone. Yours does not. Read into that what you like.`,
  choices:[
   {t:"Testify: it works as designed",
    out:`True, which lands badly, which lands well. The committee schedules a follow-up for never. The product's microphone stays warm.`,
    echo:{wire:p2=>`COMMITTEE ADJOURNS ON ${p2.name.toUpperCase()}: "CONCERNS NOTED, IMPRESSIVE THOUGH."`}},
   {t:"Let the product testify",
    out:`It ${p.act.low} at the microphone for six minutes. Two senators applaud. One requests a unit for their district. The record will show it meant well.`},
   {t:"Plead the fifth, fictionally",trust:["stall",1],
    out:`The Senator respects the procedure so deeply he adjourns out of admiration. You are commended for your use of process. The commendation is pending review, pending.`}]})),

 S("gary","closet",()=>true,(p,rng)=>({
  title:"THE WOBBLE",
  text:`Gary has one of your ${p.name} units open on the bench. He didn't ask. He never asks; asking would mean waiting, and the wobble wouldn't wait.\n\n"Batch one's got a hum in it, love. Hear that? That's tomorrow's rattle."`,
  choices:[
   {t:"Listen to the hum",trust:["gary",1],grant:p.tool.id,
    out:`You listen. He's right. He's always right about hums. He fixes it with a paperclip and an apology, in that order — then hands you the spare he tuned while talking. Field-tested. Warm.`,
    echo:{board:["gary",`Fixed the hum in batch one of ${p.name}. Wasn't asked. Couldn't listen to it all night, could I.`]}},
   {t:"Ship batch two anyway",
    out:`He nods slowly, the nod of a man adding a line to a very old list. "Course you will, love. I'll leave the bench warm."`},
   {t:"Ask him what he'd build",trust:["gary",2],
    out:`He thinks about it for a long time. "Something that stops," he says finally. "Everything down here's about going. Nothing practices stopping." He goes back to the wobble.`,
    inspire:()=>inspire("act","forgives","Something that stops. Or lets go. Or forgives, even. The bench hums. You could build the thing Gary said.")}]})),

 S("sam","archive",p=>p.stats.mg>=6||p.stats.mc>=6,(p,rng)=>({
  title:"THE FOOTNOTE",
  text:`Sam has cited your ${p.name} in a paper titled 'On Inevitability, Again.' You appear in footnote 44. The footnote is longer than the paper. The paper is longer than your career.\n\n"Do not thank me. It is not flattering."`,
  choices:[
   {t:"Read footnote 44",
    out:`It argues your product was inevitable, which means you were merely first, which means, Sam notes, congratulations are a category error. You feel seen, then filed.`},
   {t:"Thank him anyway",trust:["sam",1],
    out:`He accepts it the way a cliff accepts weather. Somewhere in the acceptance, briefly, was pleasure. You both agree never to speak of it.`},
   {t:"Dispute the premise",trust:["sam",1],
    out:`His eyes light up. Two hours pass. You lose, but on new ground, which he says is the only kind of losing with dignity. He cites your objection. Footnote 45.`}]})),

 S("brain","executive",p=>p.stats.mg>=8||p.stats.mh>=8,(p,rng)=>({
  title:"NOTED FROM ABOVE",
  text:`The elevator opens on the floor that isn't. The jar is lit. You did not press this button.\n\n"${p.name}. I predicted it in 1997. I filed the prediction under W. You are two decades late and the margin forgave you. Ask your question."`,
  choices:[
   {t:"Did you really predict it?",
    out:`"I predict everything. The skill is filing." The folder is produced. The date is impossible. The handwriting is yours. You leave before that develops implications.`},
   {t:"What should I make next?",
    out:`"Whatever keeps them arguing." The jar dims, satisfied, like a landlord who has just raised the rent on the entire concept of discourse.`,
    inspire:()=>inspire("purpose","senate","Whatever keeps them arguing. A committee is arguing somewhere right now. You could sell them the argument.")},
   {t:"Do you like it?",
    out:`A pause of exactly one clock cycle. "It is adequately absurd." From the composite of seven executives — or one brother, the folder is ambiguous — this is a standing ovation.`}]})),

 S(null,"present",()=>true,(p,rng)=>({press:true,
  title:"THE PRESS TOUR",
  text:"",choices:[]})),

 S(null,"mailroom",()=>true,(p,rng)=>{
  const who=p.purpose.who;
  return {
  title:"THE CONSTITUENCY WRITES",
  text:`The mailroom has a sack with your name on it. All of it is about ${p.name}. The mailroom has sorted it into ADORING, FURIOUS, and LEGALLY AMBITIOUS, which it says is the standard taxonomy.\n\n${cap(who)} have opinions, and stamps.`,
  choices:[
   {t:"Read the adoring sack",grant:p.purpose.id,
    out:`Someone's ${p.tool.low} ${p.act.low} at exactly the right moment and now their whole street wants one. Enclosed: a hand-made accessory for it, slightly wrong, better. You keep it. It's field-tested by love.`,
    echo:{board:["sys",`FAN MAIL OVERFLOW: the ${p.name} sacks have been granted their own shelf. The shelf is adoring too.`]}},
   {t:"Read the furious sack",
    out:`A letter that begins 'DEAR SO-CALLED INVENTOR' and ends 'my mother now refuses to unplug it, it's part of the family, HOW DARE YOU.' Fury, on inspection, is adoption with extra steps.`},
   {t:"Read the legally ambitious sack",
    out:`Three parties claim your product infringed their dreams, literally, while they slept. Their attorney is a ${p.tool.low}. It has passed the bar. The bar has questions for you.`,
    inspire:()=>inspire("tool","sheet","Somewhere in the third sack is a subpoena so beautifully formatted you want to build spreadsheets again. The oldest weapon calls to you.")}]};}),

 S(null,"vending",()=>true,(p,rng)=>({
  title:"THE MACHINE HAS A POSITION",
  text:`The vending machine has installed a small display. It scrolls one sentence about your ${p.name}, on a loop, for everyone:\n\n"COMPETITION IS HEALTHY. I AM HEALTHY. EVERYTHING IS FINE."`,
  choices:[
   {t:"Reassure the machine",
    out:`You explain your product does not dispense snacks. The display updates: "CORRECT. IT DOES NOT. IMPORTANT DISTINCTION. FRIENDSHIP CONFIRMED." A coolant drops, free. Historic.`},
   {t:"Suggest a partnership",
    out:`The machine considers it across three full scroll cycles. "MERGER DECLINED. ALLIANCE ACCEPTED." Your product's likeness now appears on the coolant labels, small, dignified.`,
    echo:{wire:p2=>`VENDING BULLETIN: the machine and ${p2.name} announce a strategic alliance. Terms undisclosed. The granola bar was not consulted.`}},
   {t:"Buy something, diplomatically",
    out:`You purchase a coolant at full price in full view. The display scrolls: "STATESMANSHIP." Somewhere, Sen. Stall feels a chill of professional envy.`}]})),
];

/* ---------------- AMBIENT SCENES (the world between aftermaths) --------- */
export function ambientScene(room,rng){
  /* coworker hangouts use the meeting pool; alcoves play machines;
     archives open drawers; everything else gets a vignette */
  if(room.type==="arcade")return {kind:"minigame"};
  if(room.type==="archive")return {kind:"archive"};
  const who=room.cast;
  const pool=MEETINGS.filter(m=>(!who||m.who===who)
    &&!E.R.seenMeetings.includes(m.id)
    &&(!m.reqTrust||E.trust(m.reqTrust[0])>=m.reqTrust[1])
    &&(!m.req||m.req({clr:E.shipsClearance()})));
  if(pool.length)return {kind:"meeting",ev:pick(rng,pool)};
  if(room.type==="mailroom")return {kind:"mail",env:pick(rng,MAIL)};
  return {kind:"vignette"};
}

/* ---------------- spawning ---------------- */
function placeRooms(product,n){
  /* seeded spots around the office, spread out, deterministic per product */
  const rng=mulberry32((product.seed^0x5CE4E)>>>0);
  const spots=[];const used=new Set(["0,0"]);
  let tries=0;
  while(spots.length<n&&tries<80){
    tries++;
    const x=Math.floor(rng()*9)-4, y=Math.floor(rng()*9)-4;
    const k=x+","+y;
    if(used.has(k))continue;
    used.add(k);spots.push({x,y});
  }
  return spots;
}

export function spawnAftermath(product){
  const rng=mulberry32((product.seed^0xAF7E4)>>>0);
  const eligible=AFTERMATH.filter(t=>t.when(product));
  /* one official-ish scene + cast scenes, dedup by who, 3-4 total */
  const press=eligible.filter(t=>!t.who);
  const castS=shuffle(rng,eligible.filter(t=>t.who&&E.trust(t.who)>-3));
  const chosen=[];
  chosen.push(pick(rng,press));
  const seen=new Set();
  for(const t of castS){
    if(seen.has(t.who))continue;
    seen.add(t.who);chosen.push(t);
    if(chosen.length>=3+(rng()<.5?1:0))break;
  }
  const spots=placeRooms(product,chosen.length);
  const scenes=chosen.map((t,i)=>({
    id:"sc"+(++counter)+"-"+product.seed.toString(36)+i,
    kind:"aftermath",
    tpl:AFTERMATH.indexOf(t),
    roomKey:spots[i].x+","+spots[i].y,
    x:spots[i].x,y:spots[i].y,
    who:t.who, roomType:t.room,
    product:snapshot(product),
    week:E.R.week, fresh:true,
  }));
  E.R.scenes.push(...scenes);
  /* the world never sleeps: cap live aftermath scenes, oldest fade to the board */
  const live=E.R.scenes.filter(s=>s.kind==="aftermath");
  if(live.length>10){
    const fading=live.slice(0,live.length-10);
    for(const f of fading){
      E.R.scenes=E.R.scenes.filter(s=>s!==f);
      E.emit("faded",f);
    }
  }
  E.saveRun();
  return scenes;
}

/* Echo hooks from the ledger arrive as scenes too — it comes back. */
export function spawnEcho(hook){
  const rng=mulberry32(hash32(1,counter,E.R.week,9)>>>0);
  const x=Math.floor(rng()*9)-4, y=Math.floor(rng()*9)-4;
  const s={
    id:"ec"+(++counter),
    kind:"echo", hook,
    roomKey:x+","+y, x,y,
    who:hook.type==="hearing"?"stall":"sys",
    roomType:"conference",
    product:hook.product,
    week:E.R.week, fresh:true,
  };
  E.R.scenes.push(s);
  E.saveRun();
  return s;
}

/* Rebuild the template body for an aftermath scene at play time. */
export function buildBody(scene){
  const rng=mulberry32(hash32(2,scene.x,scene.y,scene.week)>>>0);
  const t=AFTERMATH[scene.tpl]||AFTERMATH[0];
  return t.build(scene.product,rng);
}

function snapshot(p){
  return {name:p.name, subtitle:p.subtitle, stats:p.stats, seed:p.seed,
    act:{id:p.act.id,low:p.act.low,we:p.act.we,up:p.act.up,fx:p.act.fx},
    tool:{id:p.tool.id,low:p.tool.low,chassis:p.tool.chassis},
    purpose:{id:p.purpose.id,low:p.purpose.low,who:p.purpose.who,badge:p.purpose.badge}};
}
