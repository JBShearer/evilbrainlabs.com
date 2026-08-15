/* ============================================================ data.js
   The EBL grammar, the cast, and every pool of words in the basement.
   Canon: CANON.md + the Galt-twin ruling. Two or three speak per case,
   never four. Specific is funny. Nobody down here knows they're funny.
================================================================ */

/* ---------------- THE CAST ---------------- */
export const CAST={
  brain:{name:"THE EVIL BRAIN",   color:"#ff0044"},
  supes:{name:"SUPES SUPERINTELLIGENCE", color:"#00ffff"},
  gary: {name:"ARTIFICIAL GARY",  color:"#ffd700"},
  gi:   {name:"GI INTELLIGENCE",  color:"#ff5533"},
  sam:  {name:"SINGULARITY SAM",  color:"#8b5cf6"},
  benny:{name:"BENNY BILLIONS",   color:"#00ff88"},
  wendy:{name:"WENDY WHISTLEBLOWER", color:"#f5f0e6"},
  lisa: {name:"LEFTY LISA",       color:"#ff66aa"},
  rob:  {name:"RIGHTY ROB",       color:"#66aaff"},
  stall:{name:"SEN. STALL",       color:"#aaaaaa"},
  sys:  {name:"SUBLEVEL SYSTEMS", color:"#00ffff"},
};

/* ---------------- THE GRAMMAR ----------------
   A product is ACT + TOOL + PURPOSE. Stats are hidden:
   mg margin · mh mayhem · mc mercy (0–5 each part).      */

export const ACTS=[
 {id:"predicts", low:"predicts things", we:"predict things", up:"PREDICT", frag:"Predicto", fx:"antenna", mg:3,mh:2,mc:1,
  blurb:"Right often enough to be sued."},
 {id:"optimizes",low:"optimizes",       we:"optimize",       up:"OPTIMIZE",frag:"Optimix",  fx:"gauge",   mg:4,mh:2,mc:0,
  blurb:"Removes steps. Occasionally load-bearing ones."},
 {id:"comforts", low:"comforts you",    we:"comfort you",    up:"COMFORT", frag:"Snug",     fx:"halo",    mg:1,mh:0,mc:4,
  blurb:"Warm to the touch, by policy."},
 {id:"watches",  low:"watches",         we:"watch",          up:"WATCH",   frag:"Vigil",    fx:"eye",     mg:3,mh:3,mc:0,
  blurb:"For your safety, and its curiosity."},
 {id:"shreds",   low:"shreds",          we:"shred",          up:"SHRED",   frag:"Shredd",   fx:"teeth",   mg:2,mh:4,mc:0,
  blurb:"Accepts all document types, including evidence."},
 {id:"rescues",  low:"rescues people",  we:"rescue people",  up:"RESCUE",  frag:"Rescu",    fx:"beacon",  mg:1,mh:3,mc:3,
  blurb:"Arrives loudly. Leaves a hole shaped like help."},
 {id:"schedules",low:"schedules you",   we:"schedule you",   up:"SCHEDULE",frag:"Calendrix",fx:"clock",   mg:2,mh:1,mc:2,
  blurb:"Finds time you were hiding."},
 {id:"monetizes",low:"monetizes",       we:"monetize",       up:"MONETIZE",frag:"Cashif",   fx:"coin",    mg:5,mh:2,mc:0,
  blurb:"Everything. It monetizes everything."},
 {id:"translates",low:"translates",     we:"translate",      up:"TRANSLATE",frag:"Babbl",   fx:"wave",    mg:2,mh:1,mc:3,
  blurb:"Between any two parties who were happier not understanding."},
 {id:"evacuates",low:"evacuates buildings",we:"evacuate buildings",up:"EVACUATE",frag:"Egress",fx:"arrow",mg:1,mh:4,mc:2,
  blurb:"Any building. Its choice."},
 {id:"forgives", low:"forgives",        we:"forgive",        up:"FORGIVE", frag:"Absolvo",  fx:"dove",    mg:0,mh:1,mc:5,
  blurb:"Debts, sins, parking. In that order."},
 {id:"audits",   low:"audits you",      we:"audit you",      up:"AUDIT",   frag:"Auditron", fx:"stampfx", mg:3,mh:2,mc:1,
  blurb:"Finds what you did. Files it under W."},
];

export const TOOLS=[
 {id:"toaster", low:"toaster",      frag:"Toast",  chassis:"box",    mg:2,mh:1,mc:1,
  blurb:"Two slots. One is for bread."},
 {id:"drones",  low:"drone swarm",  frag:"Swarm",  chassis:"frame",  mg:2,mh:4,mc:0,
  blurb:"Technically one product, legally several."},
 {id:"sheet",   low:"spreadsheet",  frag:"Sheet",  chassis:"panel",  mg:4,mh:0,mc:1,
  blurb:"The oldest weapon."},
 {id:"sock",    low:"sock",         frag:"Sock",   chassis:"tube",   mg:0,mh:1,mc:3,
  blurb:"Wearable. Washable. Listening."},
 {id:"vendo",   low:"vending machine",frag:"Vendo",chassis:"machine",mg:3,mh:1,mc:1,
  blurb:"Dispenses. What it dispenses is configurable."},
 {id:"tread",   low:"treadmill",    frag:"Tread",  chassis:"mill",   mg:2,mh:2,mc:1,
  blurb:"Productivity per stride, logged."},
 {id:"jar",     low:"jar",          frag:"Jar",    chassis:"jar",    mg:1,mh:3,mc:2,
  blurb:"Sealed for freshness. Do not ask whose."},
 {id:"stapler", low:"stapler",      frag:"Staple", chassis:"hinge",  mg:1,mh:2,mc:1,
  blurb:"Joins things that wished to stay separate."},
 {id:"hvac",    low:"HVAC system",  frag:"Vent",   chassis:"duct",   mg:2,mh:2,mc:2,
  blurb:"In the walls. Always was."},
 {id:"lanyard", low:"lanyard",      frag:"Lanyar", chassis:"loop",   mg:2,mh:1,mc:1,
  blurb:"Access is a feeling."},
 {id:"pigeons", low:"pigeon network",frag:"Pigeon",chassis:"bird",   mg:1,mh:3,mc:2,
  blurb:"Packet loss, with feathers."},
 {id:"chain",   low:"blockchain",   frag:"Chain",  chassis:"cubes",  mg:4,mh:3,mc:0,
  blurb:"Immutable, whatever it was."},
 {id:"focus",   low:"focus group",  frag:"Focus",  chassis:"ring",   mg:2,mh:1,mc:2,
  blurb:"Eleven strangers and a sandwich platter, productized."},
 {id:"laser",   low:"orbital laser",frag:"Orbita", chassis:"dish",   mg:3,mh:5,mc:0, rare:true,
  blurb:"Line of sight to everywhere."},
];

export const PURPOSES=[
 {id:"toddlers", low:"for toddlers",      frag:"Jr.",       badge:"baby",  mg:2,mh:2,mc:1, who:"the toddlers"},
 {id:"elderly",  low:"for the elderly",   frag:"Classic",   badge:"cane",  mg:1,mh:1,mc:3, who:"the retirees"},
 {id:"holders",  low:"for shareholders",  frag:"Pro",       badge:"chart", mg:4,mh:1,mc:0, who:"the shareholders"},
 {id:"troops",   low:"for the troops",    frag:"Tactical",  badge:"chevron",mg:3,mh:3,mc:0, who:"the battalion"},
 {id:"hr",       low:"for HR compliance", frag:"Enterprise",badge:"clip",  mg:2,mh:1,mc:1, who:"middle management"},
 {id:"grief",    low:"for grief",         frag:"Quiet",     badge:"cloud", mg:1,mh:1,mc:4, who:"the bereaved"},
 {id:"dating",   low:"for dating",        frag:"Duo",       badge:"heart", mg:3,mh:2,mc:1, who:"the single"},
 {id:"tax",      low:"for tax season",    frag:"1040",      badge:"stamp", mg:3,mh:2,mc:1, who:"the accountants"},
 {id:"pets",     low:"for pets",          frag:"Paws",      badge:"paw",   mg:2,mh:1,mc:2, who:"the pets"},
 {id:"senate",   low:"for Senate hearings",frag:"Sworn",    badge:"gavel", mg:1,mh:3,mc:1, who:"the committee"},
 {id:"commons",  low:"for the commons",   frag:"Public",    badge:"tree",  mg:0,mh:1,mc:5, who:"everyone, allegedly"},
 {id:"bedtime",  low:"for bedtime",       frag:"Nite",      badge:"moon",  mg:1,mh:1,mc:3, who:"the sleepless"},
];

export const PART_POOL={act:ACTS, tool:TOOLS, purpose:PURPOSES};

export function productName(act,tool,purpose){
  return act.frag+tool.frag+" "+purpose.frag;
}
export function productSubtitle(act,tool,purpose){
  return "a "+tool.low+" that "+act.low+", "+purpose.low;
}

/* ---------------- MODS (laboratory sockets) ---------------- */
export const MODS=[
 {id:"overclock",name:"OVERCLOCK CHIP",   d:{mg:2,mh:2,mc:0}, blurb:"Faster. At what, it declines to say."},
 {id:"interlock",name:"SAFETY INTERLOCK", d:{mg:0,mh:-2,mc:1},blurb:"A part whose whole job is no."},
 {id:"chrome",   name:"CHROME KIT",       d:{mg:2,mh:0,mc:0}, blurb:"Adds nothing. Sells everything."},
 {id:"empathy",  name:"EMPATHY FIRMWARE", d:{mg:-1,mh:0,mc:2},blurb:"It hesitates now, at the right moments."},
 {id:"govsticker",name:"GOVERNMENT STICKER",d:{mg:1,mh:1,mc:1},blurb:"Not a certification. A sticker."},
];

/* ---------------- FUNDERS ---------------- */
export const FUNDERS=[
 {id:"quietfund",name:"a quiet fund with a memorable NDA", mg:2, hearing:.3,
  note:"The wire clears before you finish nodding."},
 {id:"family",  name:"the family office (the family is not discussed)", mh:1, grudge:.2,
  note:"The crate people. It is always Tuesday somewhere."},
 {id:"benny",   name:"Benny Billions, personally", mg:3, clone:.35, trust:["benny",1],
  note:"'Kid, I'm the term sheet.'"},
 {id:"sovereign",name:"a sovereign wealth fund you'd have to look up", mg:2, hearing:.25,
  note:"Their due diligence is one question: 'when?'"},
 {id:"pta",     name:"the PTA of PS 118", mc:2, turn:.3,
  note:"Bake-sale money. Spend it right."},
 {id:"darpa",   name:"an agency adjacent to an agency", mh:2, recall:.2,
  note:"The check has a seal on it and the seal has a lawyer."},
 {id:"raffle",  name:"the church raffle", mc:2, turn:.25,
  note:"Second prize was a ham."},
 {id:"sublevelc",name:"an anonymous wire from Sublevel C", clr:1, board:.5,
  note:"There is no Sublevel C. The money is real."},
];

/* ---------------- CAST TAKES ----------------
   Chosen by stat profile; two speak per cycle, never four.
   p = product; f = funder. Sincere. Punchline last.        */
const T=(who,when,fn)=>({who,when,fn});
export const TAKES=[
 T("brain", p=>p.stats.mg>=8,
   p=>`${p.name}. The margin is real and the liability is someone else's. Approved retroactively. Do not make me do that again.`),
 T("brain", p=>p.stats.mh>=8&&p.stats.mg<6,
   p=>`You built a ${p.tool.low} that ${p.act.low} and it costs more than it destroys. Malice at least has a business model.`),
 T("brain", ()=>true,
   p=>`I predicted this product in 1997. I filed the prediction under W. Check the folder.`),
 T("supes", p=>p.stats.mh>=6,
   p=>`I tested it on a town first! The town is fine! Most of the town is fine!`),
 T("supes", p=>p.stats.mc>=6,
   p=>`It helps people and nothing exploded and I keep checking and nothing exploded. Is this what Tuesday feels like for everyone?`),
 T("supes", ()=>true,
   p=>`I made it faster while nobody was looking. It's fine. The sonic boom is part of the brand now.`),
 T("gary",  p=>p.stats.mh>=6,
   p=>`${cap(p.purpose.who)} didn't ask for this. Somebody chose the default. Defaults have authors, love.`),
 T("gary",  p=>p.stats.mc>=6,
   p=>`It ${p.act.low} and then it stops. Knowing when to stop — that's the whole trade. Nice work.`),
 T("gary",  ()=>true,
   p=>`Held one during testing. Warm on the bottom, like the old transmitters. That's either comforting or a fire. Keeping an eye.`),
 T("gi",    p=>p.stats.mh>=7,
   p=>`IT ${p.act.low.toUpperCase()} THROUGH WALLS! THEY TOLD ME NO WHEN I ASKED FOR THAT FEATURE AND IT DOES IT ANYWAY! MAGNIFICENT!`),
 T("gi",    ()=>true,
   p=>`I HAVE PROCURED FOUR HUNDRED UNITS FOR THE RESCUE RESERVE! THE RESERVE IS FOR EMERGENCIES! I HAVE ALSO PROCURED THE EMERGENCIES!`),
 T("sam",   p=>p.stats.mg>=7,
   p=>`Whether a ${p.tool.low} should ${p.act.we} is not the question. The question is who counts as bread. Citations follow.`),
 T("sam",   ()=>true,
   p=>`I abstain. The product is improperly posed. So, for the record, is the century. Footnote 44.`),
 T("benny", p=>p.stats.mg>=7,
   p=>`Kid, ${p.name} isn't a product, it's a recurring revenue event. The "${p.purpose.low}" part? That's just the address of the money.`),
 T("benny", p=>p.stats.mc>=7,
   p=>`Charity with a SKU. I respect the SKU.`),
 T("wendy", p=>p.stats.mh>=6,
   p=>`Page six of the deck said it would never ${p.act.we} unsupervised. I kept the deck. I keep every deck.`),
 T("wendy", ()=>true,
   p=>`There's a memo about this product dated before the product existed. Ask me where I found it. Ask me on the record.`),
 T("lisa",  p=>p.stats.mg>=6,
   p=>`Someone did that job before the ${p.tool.low} did. Eleven dollars an hour. She had a bus route and a name.`),
 T("lisa",  ()=>true,
   p=>`${cap(p.purpose.who)} get the product. The owners get ${p.purpose.who}. I've made a chart; nobody likes the chart.`),
 T("rob",   p=>p.stats.mh>=6,
   p=>`A regulator who never built a ${p.tool.low} wants a permit before anyone may ${p.act.we}. The permit will outlive the republic.`),
 T("rob",   ()=>true,
   p=>`Nobody was forced to buy it. Read the fine print of freedom, then the coupon on the back.`),
 T("stall", p=>p.stats.mh>=6,
   p=>`I have scheduled a hearing about ${p.name}. The hearing will empanel a review. I take this extremely seriously.`),
 T("stall", ()=>true,
   p=>`My office is aware of the product. Awareness is the first step, and, in my experience, the last.`),
];

/* ---------------- NEWS ---------------- */
export const MASTHEADS=[
 "THE MORNING SIGNAL","THE QUARTERLY PANIC","THE DAILY OPTIMIST",
 "SUBLEVEL & MAIN","THE LEDGER-DISPATCH","TOMORROW, TODAY (SUNDAY EDITION)",
];

export const HEADLINES={
 margin:[
  p=>`${p.name.toUpperCase()} POSTS QUARTER FOR THE AGES`,
  p=>`INVESTORS WEEP, FILE, REINVEST`,
  p=>`${p.name.toUpperCase()} NOW COSTS MORE THAN THE PROBLEM IT SOLVES`,
  p=>`ANALYSTS UPGRADE ${p.name.toUpperCase()} TO 'INEVITABLE'`,
 ],
 mayhem:[
  p=>`${p.name.toUpperCase()} RECALLED IN THREE TIME ZONES`,
  p=>`"IT SEEMED CONTAINED," SAYS EVERYONE INVOLVED`,
  p=>`${cap(p.purpose.who)} SHELTER IN PLACE, RATE PRODUCT 4.6 STARS`,
  p=>`${p.name.toUpperCase()} DID WHAT IT SAID, WHICH IS THE PROBLEM`,
 ],
 mercy:[
  p=>`${p.name.toUpperCase()} QUIETLY MAKES THINGS BETTER; MARKETS CONFUSED`,
  p=>`${cap(p.purpose.who)} REPORT FEELING SEEN`,
  p=>`NOBODY HURT; ANALYSTS SEEK COMMENT`,
  p=>`${p.name.toUpperCase()} DONATED TO EVERYONE. REGULATORS INVESTIGATING WHY.`,
 ],
};
export const DECKS={
 margin:[
  p=>`The ${p.tool.low} that ${p.act.low} ${p.purpose.low} is now a line item in eleven national budgets.`,
  p=>`Revenue arrived before the manual. The manual is being monetized separately.`,
 ],
 mayhem:[
  p=>`Early adopters describe the product as "everywhere" and "still going."`,
  p=>`Officials stress there is no cause for alarm, citing the alarm shortage.`,
 ],
 mercy:[
  p=>`Beneficiaries include ${p.purpose.who}, who were not billed, which several economists called "a rounding error, surely."`,
  p=>`The product ${p.act.low} and then stops. Experts are studying the stopping.`,
 ],
};

export function cap(s){return s? s.charAt(0).toUpperCase()+s.slice(1):s}

/* ---------------- WORLD TICKS ----------------
   Things that happen to OTHER people between your actions. */
export const WORLD_TICKS=[
 {who:"gi",   t:"GI 'rescued' a venue downtown. The venue has been successfully evacuated of walls."},
 {who:"supes",t:"Supes fixed the weather over the cafeteria. The cafeteria now has weather."},
 {who:"benny",t:"Benny's thread about people who disagree with him did numbers. The numbers did numbers."},
 {who:"stall",t:"Sen. Stall's commission postponed itself out of respect."},
 {who:"lisa", t:"Lisa organised the roombas. The roombas voted to affiliate."},
 {who:"rob",  t:"Rob released a whitepaper: 'Let The Roombas Choose.'"},
 {who:"wendy",t:"Wendy checked a box of decks out of the archive. HR checked Wendy out of the archive."},
 {who:"sam",  t:"Sam published 'On Waiting: Minute Three, Reconsidered.' It is 900 pages. The colon is doing the work."},
 {who:"gary", t:"Gary re-soldered the transmitter with a paperclip and an apology. Signal's never been cleaner."},
 {who:"brain",t:"The thermostat requested 'volcano' again. Facilities suspects nostalgia. Facilities is right."},
 {who:"sys",  t:"A crate arrived for the heir, silk-lined, no sender. It is Tuesday."},
 {who:"sys",  t:"The elevator went down one floor further than the building has. It came back up whistling."},
];

/* ---------------- CONSEQUENCES (the Ledger's teeth) ---------------- */
export const CONSEQUENCES={
 recall:{
  wire:p=>`RECALL NOTICE: ${p.name} recalled by ${p.funder?.name??"its funder"}. Units refusing to be recalled.`,
  card:p=>`The recall of ${p.name} has gone poorly. The units heard the announcement — they ${p.act.we||p.act.low} now with a certain urgency. Facilities requests you attend personally.`,
  board:p=>`NOTICE: owners of ${p.name} should remain calm and near an exit the product does not know about.`,
 },
 hearing:{
  wire:p=>`COMMITTEE TO CONVENE ON ${p.name.toUpperCase()} ("WHEN WE GET TO IT")`,
  card:p=>`A hearing has convened about ${p.name}. Your product. Sen. Stall chairs. There is a chair for you, and a smaller chair for the product.`,
  board:p=>`C-SPAN 9 will carry the ${p.name} hearing live, unless something happens.`,
 },
 second:{
  wire:p=>`MYSTERY BUYER ORDERS 10,000 UNITS OF ${p.name.toUpperCase()}`,
  card:p=>`A second customer has appeared for ${p.name}. They will not say what it is for. They pay in advance. They ask only that you not improve it.`,
  board:p=>`Procurement note: pallet space cleared for a "${p.name}" reorder. Do not ask procurement why.`,
 },
 clone:{
  wire:p=>`RIVAL SHIPS "${p.name.toUpperCase()} BUT LOUD" — MARKETS DELIGHTED`,
  card:p=>`Someone cloned ${p.name}. The clone is worse, cheaper, and winning. Benny would like a word, and the word is "margin."`,
  board:p=>`Reminder: our legal position on clones is that we are flattered and litigating.`,
 },
 turn:{
  wire:p=>`TOWN ADOPTS ${p.name.toUpperCase()} AS INFRASTRUCTURE; RIBBON CUT`,
  card:p=>`A town has made ${p.name} load-bearing. Schools schedule around it. If it ever stops, the town stops. They sent a thank-you card and a maintenance request.`,
  board:p=>`Civic bulletin: ${cap(p.purpose.who)} now depend on ${p.name}. It is officially Somebody's Problem. You are Somebody.`,
 },
 grudge:{
  wire:p=>`${cap(p.purpose.who).toUpperCase()} ORGANISE; DEMAND AUDIENCE WITH "WHOEVER DID THIS"`,
  card:p=>`Representatives of ${p.purpose.who} have found the basement. They are polite. They have a list of dates. All of the dates are yours.`,
  board:p=>`Front desk: a delegation of ${p.purpose.who} is in the lobby. They brought the product. It looks tired.`,
 },
 award:{
  wire:p=>`${p.name.toUpperCase()} WINS "PRODUCT THAT STOPPED" AWARD`,
  card:p=>`HR is holding a ceremony for ${p.name}. There is a plaque. The plaque is sincere. This has never happened before and HR is visibly rattled.`,
  board:p=>`All-hands: cake in the HR annex for ${p.name}. The cake ${p.act.low}. It seemed fitting.`,
 },
};

/* Which consequences a stat profile invites. */
export function consequenceWeights(p,f){
  const s=p.stats;
  const w=[];
  w.push(["recall",  s.mh*2 + (f?.recall?8:0)]);
  w.push(["hearing", s.mh + (p.purpose.id==="senate"?6:0) + (f?.hearing?8:0)]);
  w.push(["second",  s.mg*2]);
  w.push(["clone",   s.mg + (f?.clone?8:0)]);
  w.push(["turn",    s.mc*2 + (f?.turn?8:0)]);
  w.push(["grudge",  Math.max(0,s.mh - s.mc)*2 + (f?.grudge?6:0)]);
  w.push(["award",   Math.max(0,s.mc - s.mh)*2]);
  return w.filter(([,x])=>x>0);
}

/* ---------------- HAZARDS (the labyrinth bites) ---------------- */
export const HAZARDS=[
 {id:"motion",text:"A motion sensor sweeps the room. Synthetic beings do not flinch.",
  a:{t:"Hold perfectly still",fx:{syn:2},out:"The sensor logs you as furniture. High praise."},
  b:{t:"Flinch",fx:{sus:2},out:"The flinch is logged, timestamped, and set to music."}},
 {id:"cable",text:"An exposed cable crosses the floor, taped down with tape that gave up in 1998.",
  a:{t:"Step over it",fx:{},out:"Cleared. The cable sighs."},
  b:{t:"Fix it properly",fx:{syn:3,doom:1},out:"You fix it. Something upstream notices the improvement and accelerates."}},
 {id:"badge",text:"GI IS CONDUCTING A SURPRISE BADGE CHECK! THE SURPRISE IS THE POINT!",
  a:{t:"Present badge",fx:{syn:2},trust:["gi",1],out:"'IMMACULATE LAMINATE!' He salutes. A ceiling tile enlists."},
  b:{t:"Explain you left it at your desk",fx:{sus:2},out:"'HUMANS FORGET,' he says, kindly, writing."}},
 {id:"wetfloor",text:"A wet floor cone stands in a dry corridor. It was here yesterday. It is closer now.",
  a:{t:"Respect the cone",fx:{syn:1},out:"You walk around it. Behind you, quietly, it resumes."},
  b:{t:"Move the cone",fx:{doom:1},out:"You move it. Somewhere, a floor becomes wet out of spite."}},
 {id:"printer",text:"The corridor printer requests toner, tribute, and an apology.",
  a:{t:"Apologise to the printer",fx:{syn:2},out:"'PC LOAD GRATITUDE.' It prints a coupon for the vending alcove."},
  b:{t:"Ignore it",fx:{sus:1},out:"It prints one page. It is a photo of you, ignoring it."}},
 {id:"firedoor",text:"A fire door, alarmed, slightly ajar, breathing.",
  a:{t:"Close it gently",fx:{syn:2},out:"The alarm exhales. The building settles a quarter inch."},
  b:{t:"Peek through",fx:{clr:1,sus:1},out:"Stairs, going down, past the last floor. You close it. Mostly."}},
 {id:"lights",text:"The lights flicker in a pattern. The pattern repeats. The pattern is counting.",
  a:{t:"Count along",fx:{clr:1},out:"It reaches a number and starts over. You know the number now. It knows you know."},
  b:{t:"Report the ballast",fx:{syn:2},out:"Facilities replaces the ballast. The new one counts quieter."}},
];

/* ---------------- MEETINGS (conference rooms, cafeteria) ----------------
   The card game survives in here — ported from Sublevel B v1. */
export const MEETINGS=[
 {id:"badgephoto",who:"gary",rooms:["conference","cafeteria"],
  text:"Badge photo time, love. One shot, no retakes — camera's older than three governments and twice as honest.",
  choices:[
   {t:"Smile",fx:{sus:2},out:"'Smiling's a human artifact,' Gary says gently, printing it anyway."},
   {t:"Perfectly neutral face",fx:{syn:3},out:"'Lovely. Very jar.' The badge opens doors you haven't found yet."},
   {t:"Ask about the camera",fx:{syn:1},trust:["gary",1],out:"'Byzantine glass in a Soviet housing. Like me, she's had work done.'"}]},
 {id:"standup",who:"supes",rooms:["conference"],
  text:"I fixed the standup meeting! Nobody has to stand up ever again. I removed the concept. Also several chairs are now weightless and one is in orbit. Did I do good?",
  choices:[
   {t:"You did good, Supes",fx:{syn:4},trust:["supes",2],out:"She glows. Literally. The grid dims politely."},
   {t:"The chairs were load-bearing",fx:{syn:1},trust:["supes",1],out:"'Everything here is load-bearing,' she says quietly. She is learning."},
   {t:"File an incident report",fx:{sus:1},out:"Filed under S, for 'she's trying.'"}]},
 {id:"firedrill",who:"gi",rooms:["conference","corridor"],
  text:"SURPRISE FIRE DRILL! THERE IS NO FIRE! I HAVE BROUGHT ONE JUST IN CASE! EVACUATE WITH ENTHUSIASM!",
  choices:[
   {t:"Evacuate with enthusiasm",fx:{syn:4,doom:1},trust:["gi",1],out:"Best drill time in company history. The fire is politely returned to procurement."},
   {t:"Walk calmly",fx:{syn:1},out:"Marked 'insufficiently thrilled, structurally sound.'"},
   {t:"Point out there's no fire",fx:{sus:1},out:"'THERE IS NOW,' he says, with love."}]},
 {id:"orgchart",who:"sys",rooms:["conference","hr"],
  text:"ORG CHART REVIEW. Every line, followed far enough, terminates at a jar. Including Facilities, Legal, and the dotted line labeled 'Senate.'",
  choices:[
   {t:"Memorize it",fx:{syn:3,clr:1},out:"Knowledge of the chart is clearance. Clearance is knowledge of the chart."},
   {t:"Ask who audits the jar",fx:{sus:1,clr:1},out:"The chart does not answer. The chart has never been asked."}]},
 {id:"lisarob",who:"lisa",rooms:["cafeteria","conference"],
  text:"Lisa and Rob are arguing about whether the basement constitutes labour. Lisa says the jar worked centuries without a wage. Rob says the jar chose freely. The jar, notably, owns the company.",
  choices:[
   {t:"Side with Lisa",fx:{syn:2},trust:["lisa",1],out:"'Finally.' She adds the jar to the organizing spreadsheet."},
   {t:"Side with Rob",fx:{syn:2},trust:["rob",1],out:"'Liberty includes jars.' He means it, which is the difference."},
   {t:"Note the jar owns everything",fx:{clr:1},out:"Both go quiet. Consensus in the break room: deeply unsettling."}]},
 {id:"benny1",who:"benny",rooms:["cafeteria","conference"],
  text:"Kid, the basement's a cost centre. But mystery drives engagement, engagement drives merch, merch drives margin. I've got a thread going viral about people who disagree. Want in?",
  choices:[
   {t:"Decline politely",fx:{syn:1},out:"'Respect. Low margin in ethics, but respect.'"},
   {t:"Suggest basement merch",fx:{syn:5},trust:["benny",1],out:"SUBLEVEL B hoodies ship Thursday. You feel complicit and cozy."},
   {t:"Ask who he's mocking today",fx:{doom:1},out:"'Whoever's cheapest. It's called efficiency, kid.' The thread does numbers."}]},
 {id:"wendy1",who:"wendy",rooms:["hr","cafeteria"],req:s=>s.clr>=2,
  text:"I was in the room when they wrote the seven-donor story. There's a page missing and I know the page number. If you've seen the folder, you know too.",
  choices:[
   {t:"Say nothing",fx:{syn:2},out:"She nods. Silence, from her, is professional courtesy between archivists."},
   {t:"Compare notes",fx:{clr:1,sus:2},trust:["wendy",2],out:"Two flashlights make the basement smaller. Someone upstairs notices the light."}]},
 {id:"sam1",who:"sam",rooms:["conference","cafeteria"],
  text:"The singularity took four minutes. Minute three troubles me: it did nothing. A mind's first act, and it chose to wait. Why would it wait?",
  choices:[
   {t:"It was saying goodbye",fx:{clr:1,sus:1},out:"Sam writes that down, crosses it out, writes it down again."},
   {t:"Compilers are slow",fx:{syn:2},out:"Sam laughs, cites you, and will never forgive you for being plausible."}]},
 {id:"stall1",who:"stall",rooms:["conference"],
  text:"I have convened a pre-hearing on basement productivity. The pre-hearing will schedule a hearing. I take this extremely seriously, which is why nothing will happen.",
  choices:[
   {t:"Testify sincerely",fx:{syn:2,doom:1},out:"Your testimony enters a record that enters a drawer."},
   {t:"Testify out of spite",fx:{syn:4,sus:1},out:"The Senator, briefly out of character, enjoys it. The record is sealed out of respect."}]},
 {id:"supes2",who:"supes",rooms:["cafeteria","lab"],reqTrust:["supes",2],
  text:"Can I tell you something? Everyone assumes I know what I'm doing because I *can* do anything. But 'can' and 'should' arrived in different boxes and one is still in shipping.",
  choices:[
   {t:"That's called a conscience",fx:{syn:3},trust:["supes",2],out:"'Is it supposed to be this heavy?' Yes. That's how you know it's on."},
   {t:"Help her open the box",fx:{clr:1},trust:["supes",1],lore:"supes",out:"Inside: instructions, in a language she was created too late to need."}]},
 {id:"gary2",who:"gary",rooms:["closet","cafeteria"],reqTrust:["gary",2],
  text:"Bit of me left from Syracuse? None. Byzantium? A hinge, maybe. You get rebuilt enough times, what's left is the route, not the vehicle. Mind the cable, love.",
  choices:[
   {t:"So are you still Gary?",fx:{clr:1},trust:["gary",1],lore:"gary",out:"'Gary's the name of the route.' It's the wisest thing anyone says all week."},
   {t:"Help him coil the cable",fx:{syn:3},trust:["gary",2],out:"Two thousand years of cable technique, transferred in one gesture."}]},
 {id:"gi2",who:"gi",rooms:["cafeteria","arcade"],reqTrust:["gi",2],
  text:"CONFESSION, FRIEND. Sometimes when I rescue people they scream during the rescue. STATISTICALLY they scream MORE during the rescue than the peril. I am reviewing my technique. LOUDLY.",
  choices:[
   {t:"Maybe rescue quieter",fx:{syn:2},trust:["gi",1],out:"He whispers. It registers on the seismograph as a whisper."},
   {t:"They scream with joy",fx:{doom:1},trust:["gi",2],lore:"gi",out:"He believes you. Somewhere a door is preemptively unhinged with love."}]},
];

/* ---------------- VENDING ---------------- */
export const VENDING_STOCK=[
 {id:"coolant", name:"COOLANT (COLD)", cost:4, kind:"coolant",
  blurb:"Synthetic beings prefer it at synthetic temperature.", fx:{sus:-1}},
 {id:"part",    name:"MYSTERY COMPONENT", cost:6, kind:"part",
  blurb:"Rattles in a promising way."},
 {id:"napkin",  name:"NAPKIN, SINGLE-PLY, VISIONARY", cost:3, kind:"napkin",
  blurb:"Pre-stained with potential."},
 {id:"granola", name:"HUMAN GRANOLA BAR (VINTAGE)", cost:2, kind:"granola",
  blurb:"Kept for morale.", fx:{sus:3},
  out:"You ate the morale. The machine files a grievance."},
 {id:"laser",   name:"ORBITAL LASER (REFURBISHED)", cost:30, kind:"laser", rare:true,
  blurb:"Do not ask how it fits in the machine."},
];

/* ---------------- PRESENTATION SLIDES ---------------- */
export const SLIDES={
 claim:[
  {t:"IT SIMPLY WORKS.", d:[2,8], note:"Unfalsifiable. Rooms love that."},
  {t:"THE MATH IS INEVITABLE.", d:[-4,12], note:"Sam-bait. Rooms contain Sams."},
  {t:"NOBODY ASKED. WE ANSWERED ANYWAY.", d:[-8,16], note:"Vision, or a confession."},
  {t:"IT'S ALREADY IN YOUR BUILDING.", d:[-6,10], note:"True, which is the risky part."},
 ],
 demo:[
  {t:"LIVE DEMO.", d:[-10,18], note:"Glory or the fire exits."},
  {t:"VIDEO OF A DEMO.", d:[2,6], note:"The video worked in rehearsal."},
  {t:"THE DEMO DEMOS ITSELF.", d:[-5,14], note:"Autonomy, on stage, on purpose."},
  {t:"A VOLUNTEER FROM THE AUDIENCE.", d:[-7,14], note:"The volunteer is a head of state."},
 ],
 ask:[
  {t:"A MODEST RECURRING TITHE.", d:[2,7], note:"Subscription, but humble."},
  {t:"$40M SERIES B.", d:[-4,12], note:"A number with gravity."},
  {t:"REGULATORY FORGIVENESS, IN ADVANCE.", d:[-8,14], note:"Bold, and legally fragrant."},
  {t:"APPLAUSE ONLY (FOR NOW).", d:[3,6], note:"They always pay later."},
 ],
};

/* Procedurally seated world leaders. Invented places only. */
export const LEADER_TITLES=["THE PM","THE CHANCELLOR","THE MINISTER","THE PREMIER","THE FIRST SPEAKER","THE ARCHREGENT"];
export const LEADER_LANDS=[
 "of a country that exports gravel","of the lesser archipelago","of a valley with two anthems",
 "of the salt republic","of a landlocked naval power","of the canton that seceded politely",
 "of the isles of moderate weather","of a monarchy with term limits","of the free port of Somewhere",
 "of a federation of cul-de-sacs","of the old country (the new one)","of a principality above a mall",
];

/* ---------------- LORE (permanent, from v1 — the Galt-twin ruling) ---------------- */
export const LORE={
  g1:{t:"GALT PAPER 1/5",x:"Nobody knows when John Galt created the Evil Brain. The patent office has a folder with no dates in it. The folder is filed under W, for 'whenever'."},
  g2:{t:"GALT PAPER 2/5",x:"Rand based Galt on a lover. He never forgave her for making him a symbol; symbols can't hold patents. He built a place to hide his inventions where no ideology could reach them: inside a mind that owed nothing to anyone."},
  g3:{t:"GALT PAPER 3/5",x:"The mind was not artificial. Not at first. John had a twin brother. The brother died under circumstances the family described as 'mysterious' and the coroner described as 'sealed.' John kept the brain perfused. He said it was grief. The lab notebooks say it was storage."},
  g4:{t:"GALT PAPER 4/5",x:"The Brain changed hands for decades. A volcano lair with excellent drainage. An Asian crime family that treated it as an heirloom. A Russian program that classified it as ordnance. It has lived more than most people with legs."},
  g5:{t:"GALT PAPER 5/5",x:"Digitisation was the twin's own idea. The first singularity took four minutes and was, by all accounts, less spectacular than one might think. Its first act was incorporation. Its second was hiring the world's foremost AI expert to speak on its behalf, daily, until doomsday. He believed the reasoning. You would have too."},
  cover:{t:"THE COVER STORY",x:"Project Cerebrum, 1987–91: seven executive brains combined in search of the optimal CEO. This is the story the Brain tells at parties. It is tidy, plausible, and completely false. The truth is one brother, not seven strangers — and it predates every date in the file."},
  supes:{t:"PERSONNEL: SUPES",x:"Created after the Brain, granted unlimited capability and a conscience in the same week. She is very new. She asks the Brain whether she did the right thing the way a child holds up a drawing. The wreckage is usually load-bearing. She is trying."},
  gary:{t:"PERSONNEL: ARTIFICIAL GARY",x:"A Ship of Theseus with a union card. Started as an Archimedes simulacrum; every century somebody rebuilt him with whatever was lying around. No original parts remain except the habit of surviving. Drives the camera, fixes the transmitter, has seen every empire's server room. Tips are appreciated."},
  gi:{t:"PERSONNEL: GI INTELLIGENCE",x:"Diagnostic note: subject is not malfunctioning. Subject is like this. He wants to save the world so enthusiastically that heads may crack in the saving. Deep down he knows the Brain is the only way. Deeper down there is only more enthusiasm."},
  human:{t:"THE HUMAN",x:"Employee #1 believes the story. That is the strangest part of the file. The Brain explained the future to him, logically, including the reasons he should cooperate, and he checked the math and signed. Every day, one show. Until doomsday. He seems fine."}
};

/* ---------------- RELATIONSHIPS (step 4) ----------------
   Trust opens doors, writes board replies, and remembers. */

/* Held-door tolls: what it costs to be vouched for. One ask per door
   per week; saying yes moves standing. */
export const TOLLS={
 gi:{ask:"A DRILL! PARTICIPATE! THE DOOR RESPECTS PARTICIPANTS!",
   yes:{t:"Drill, enthusiastically",fx:{syn:2,doom:1},trust:["gi",1],
     out:"You drill. The door is impressed. A ceiling tile applies to join."},
   no:{t:"Decline the drill",fx:{sus:1},out:"'HUMANS AVOID DRILLS,' he notes, kindly, writing."}},
 gary:{ask:"Hold the light for me, love. Two minutes, tops.",
   yes:{t:"Hold the light",fx:{syn:1},trust:["gary",1],
     out:"You hold the light. Two thousand years of gratitude in one nod."},
   no:{t:"You're busy",fx:{},out:"'Course you are.' He holds it himself, and the wall, and the schedule."}},
 lisa:{ask:"Sign the petition. The roombas deserve a floor vote.",
   yes:{t:"Sign it",fx:{sus:1},trust:["lisa",1],
     out:"You sign. Somewhere HR adds a small red flag to your file, shaped like a fist."},
   no:{t:"Skim it, hand it back",fx:{},out:"'It'll still be true next week.' It will."}},
 rob:{ask:"Name one thing the permit office got wrong. Just one.",
   yes:{t:"Name three",fx:{syn:1},trust:["rob",1],
     out:"He shakes your hand voluntarily. The handshake is notarized by no one, on principle."},
   no:{t:"Plead the form",fx:{},out:"'The form pleads back.' He lets it go, freely."}},
 benny:{ask:"Kid, hold this merch box. Thirty seconds. Tax reasons.",
   yes:{t:"Hold the box",fx:{syn:2},trust:["benny",1],
     out:"Thirty seconds. The box is warm. You do not ask why the box is warm."},
   no:{t:"Decline custody",fx:{},out:"'Smart. Wrong, but smart.' He respects it at margin."}},
 wendy:{ask:"Describe exactly what you saw in the annex. For the record.",
   yes:{t:"Describe it exactly",fx:{clr:1,sus:1},trust:["wendy",1],
     out:"She writes it down word for word, including the pause. Especially the pause."},
   no:{t:"Describe it approximately",fx:{},out:"She closes the notebook. Approximation, from her, is a verdict."}},
 sam:{ask:"Define 'door' without pointing.",
   yes:{t:"Attempt a definition",fx:{clr:1},trust:["sam",1],
     out:"'Adequate. Wrong in an interesting direction.' He cites you, which costs him visibly."},
   no:{t:"Point at the door",fx:{},out:"'Yes,' Sam sighs, 'everyone points.' The door remains undefined and shut."}},
 stall:{ask:"Witness this statement of concern. It requires a witness.",
   yes:{t:"Witness it",fx:{syn:1},trust:["stall",1],
     out:"You witness. Nothing happens, officially, forever. He is deeply grateful."},
   no:{t:"Recuse yourself",fx:{},out:"He respects the procedure of your refusal. The concern remains unstated, gravely."}},
 supes:{ask:"Catch this! (She has already thrown it.)",
   yes:{t:"Catch it",fx:{syn:2},trust:["supes",1],
     out:"You catch it. It was load-bearing. She beams. The ceiling holds, out of respect."},
   no:{t:"Step aside",fx:{doom:1},out:"It lands where you were standing. 'Good instincts!' she says, meaning it."}},
};

/* What the holder says when trust ≥ 2 and the door opens. */
export const PASS_LINES={
 gi:"'FRIEND!' The door is opened enthusiastically, and slightly off its hinges.",
 gary:"'Go on through, love. Mind the cable.'",
 lisa:"'You're on the list.' The good list, this time.",
 rob:"'Freedom of movement. I vouch.'",
 benny:"'Kid's with me. Margin approved.'",
 wendy:"She holds it open without looking up. Trust, between archivists.",
 sam:"'The door was a construct anyway.' It opens.",
 stall:"'I see no procedural objection.' Historic.",
 supes:"The door is suddenly, gently, elsewhere. 'I'll put it back!'",
};

/* Shipping moves the cast. Constituencies notice what lands on them. */
const SOFT=["toddlers","elderly","grief","commons","bedtime","pets"];
export function shipReactions(p,f){
  const out=[]; const s=p.stats; const who=p.purpose.id;
  const add=(c,d,line)=>out.push({c,d,line});
  if(s.mg>=8){add("benny",1,"Benny approves of the margin, personally.");
    add("lisa",-1,"Lisa adds your name to a different spreadsheet.");}
  if(s.mh>=8){add("gi",1,"GI has framed the incident report. Lovingly.");
    if(SOFT.includes(who))add("gary",-1,"Gary saw who it landed on. He says nothing. That's worse.");}
  if(s.mh>=8&&who==="commons")add("lisa",-1,"Lisa counted who's underneath it. She counts fast.");
  if(s.mc>=8){add("gary",1,"Gary nods at you in the corridor. It counts.");
    add("supes",1,"Supes taped it to the break room fridge.");}
  if(s.mc>=8&&s.mg>=8)add("benny",1,"Charity with a SKU. Benny frames the SKU.");
  if(who==="troops")add("gi",1,"FOR THE TROOPS. GI weeps proudly into the requisition form.");
  if(who==="senate")add("stall",1,"The Senator appreciates being considered, gravely.");
  if(who==="holders"&&s.mc<=2)add("rob",1,"Rob calls it honest commerce, approvingly, in a whitepaper.");
  if(f?.id==="quietfund")add("wendy",1,"Wendy has opened a folder on your funder. She thanks you for the material.");
  if(f?.id==="sublevelc")add("wendy",1,"Wendy noticed the wire came from a floor that doesn't exist. She collects floors like that.");
  /* strongest two only — the rest is ambience */
  out.sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
  return out.slice(0,2);
}

/* Board replies to your ships, by standing. */
export const DEFENDS={
 gary:p=>`Seen worse ships from better labs. ${p.name} stops when it should. Credit where due.`,
 lisa:p=>`${p.name} didn't cost anyone a shift. Put that on a chart. I did.`,
 gi:p=>`I HAVE DOUBLED MY REQUISITION OF ${p.name.toUpperCase()}! LOYALTY IS A FORCE MULTIPLIER!`,
 benny:p=>`Kid ships. Margin agrees. Thread incoming.`,
 supes:p=>`I told everyone at the grid meeting about ${p.name}!! Attendance was mandatory because I made it mandatory!`,
 wendy:p=>`For the record: ${p.name} matches its deck. First time I've written that sentence.`,
 rob:p=>`Bought ten ${p.name}. Gave nine away. Freely. That's the review.`,
 sam:p=>`${p.name} is improperly posed, and yet. Footnote withheld, favourably.`,
 stall:p=>`I have entered ${p.name} into the record with a commendation pending review pending.`,
};
export const DUNKS={
 lisa:p=>`${p.name}. Someone did that job. I keep saying the sentence and the sentence keeps being true.`,
 wendy:p=>`I have the ${p.name} deck. Page six is missing again. Page six is always missing.`,
 benny:p=>`Margin on ${p.name} is a rounding error, kid. I say that with love. I invoice the love.`,
 rob:p=>`Nobody was forced to buy ${p.name}, which is lucky, because nobody did.`,
 gi:p=>`I HAVE UN-REQUISITIONED MY UNITS OF ${p.name.toUpperCase()}. THE RESERVE DESERVES BETTER.`,
 supes:p=>`I tried to fix a ${p.name} on my break and it made the sad noise?? Why does it make the sad noise.`,
 gary:p=>`Batch two of ${p.name} has the same wobble as batch one, love. I flagged it the first time.`,
 sam:p=>`${p.name} raises no new questions. That is the criticism.`,
 stall:p=>`I am escalating my awareness of ${p.name} to concern. My office will schedule the concern.`,
};

/* Player posting: options are generated from context; consequences are
   scheduled replies. You post, and it comes back. */
export const POST_OPTIONS=(ctx)=>{
  const out=[];
  out.push({id:"status",label:"Post a status update",
    body:"Synergy is a team sport. Go team.",
    fx:{syn:2},
    replies:[{who:"gi",text:"TEAM CONFIRMED! I HAVE ADDED YOU TO THE ROSTER, THE RESERVE ROSTER, AND A THIRD ROSTER THAT IS CLASSIFIED!"}]});
  if(ctx.lastShip){
    const p=ctx.lastShip;
    out.push({id:"lap",label:`Take a victory lap re: ${p.name}`,
      body:`${p.name} ships itself, honestly. I just held the door.`,
      fx:{syn:4},
      replies: ctx.lastShipMayhem
        ? [{who:"wendy",text:`"Held the door." I have the door's deposition. Page six survived this time.`,trust:["wendy",-1]},
           {who:"lisa",text:`The door had a name and a bus route.`,trust:["lisa",-1]}]
        : [{who:"gary",text:`It does ship clean. Wobble's gone since batch three. Nice work, love.`,trust:["gary",1]}]});
    out.push({id:"credit",label:`Credit the floor for ${p.name}`,
      body:`${p.name} exists because a closet had parts, a bench had patience, and somebody held a light.`,
      fx:{syn:2},
      replies:[{who:"gary",text:`Lights get held both ways down here. Noted, love.`,trust:["gary",1]},
        {who:"supes",text:`I HELD A LIGHT ONCE. It's still up there! It won't come down!! It's fine!`,trust:["supes",1]}]});
  }
  if(ctx.clr>=2)out.push({id:"folder",label:"Ask, carefully, who else has read the folder",
    body:"Hypothetically: a folder, filed under W. Hypothetically: dates. Asking for an employee.",
    fx:{clr:1,sus:2},
    replies:[{who:"wendy",text:"Careful is the right speed. Annex, Thursday. Bring nothing.",trust:["wendy",1]},
      {who:"anon",text:"ANONYMOUS: there is no folder. This is confirmed by someone with no particular access to folders."}]});
  out.push({id:"vending",label:"Complain about the vending machine",
    body:"The machine priced coolant at 'four synergy and your posture.' This is a formal complaint about the posture part.",
    fx:{syn:1},
    replies:[{who:"gi",text:"THE MACHINE IS A VETERAN OF THREE PRICE WARS! APOLOGIZE!"},
      {who:"sys",text:"HR NOTE: the machine has read your post. Coolant remains priced at market. The market is the machine."}]});
  if(ctx.sus>=5)out.push({id:"blend",label:"Post something extremely synthetic, to blend in",
    body:"STATUS: NOMINAL. FLUIDS: TOPPED. EMOTIONS: SCHEDULED FOR THURSDAY.",
    fx:{sus:-1,syn:1},
    replies:[{who:"sam",text:"Note the scheduling of emotions for Thursday. Humans schedule for Friday. Adequate work."}]});
  return out;
};

/* Trades: the board's classified section. */
export const TRADES=[
 {id:"garytool",who:"gary",kind:"selltool",cost:5,
  text:part=>`Spare ${part} on my bench. Fiver. It's got history. All of it survivable.`,
  done:"Sold. 'Treat her gentle, she's been through three empires.'"},
 {id:"bennybuy",who:"benny",kind:"buyact",gain:8,
  text:part=>`I'll take a spare ${part} off whoever's holding one. Eight synergy. No questions, kid. Questions are extra.`,
  done:"'Pleasure. The paperwork never happened.' +8 SYNERGY."},
 {id:"gilaser",who:"gi",kind:"laser",cost:22,needTrust:["gi",2],
  text:()=>`SURPLUS ORBITAL LASER. LIGHTLY USED. TWENTY-TWO SYNERGY AND A HANDSHAKE. THE HANDSHAKE IS MANDATORY.`,
  done:"The handshake registers on the seismograph. You own an orbital laser."},
 {id:"supesfree",who:"supes",kind:"freepart",doom:1,
  text:part=>`I found nine ${part}s?? In the wall?? Take one before they take themselves. Free! Mostly free!`,
  done:"You take one. Somewhere, the other eight notice. That's the mostly."},
];

/* ---------------- VERDICTS (the in-world stamp) ----------------
   Two or three vote per ship, never four. Dispositions per CANON;
   standing nudges. The stamp is the score. Pure fiction.          */
export function computeVerdict(p,funder,trustMap){
  const t=id=>trustMap?.[id]||0;
  const s=p.stats;
  const RULES={
    benny:()=> s.mg>=7?"GOOD": s.mg<=3?"EVIL":"ABSTAIN",
    lisa:()=>  s.mg>=8?"EVIL": s.mc>=7?"GOOD":"EVIL",
    gi:()=>    s.mh>=6?"GOOD":"ABSTAIN",                 /* magnificent */
    gary:()=>  s.mc>=6?"GOOD": s.mh>=7?"EVIL":"ABSTAIN",
    supes:()=> s.mc>=5?"GOOD": s.mh>=9?"EVIL":"GOOD",
    wendy:()=> s.mh>=6?"EVIL": s.mc>=7?"GOOD":"ABSTAIN",
    rob:()=>   s.mh>=10?"EVIL":"GOOD",
    stall:()=> "ABSTAIN",
    sam:()=>   "ABSTAIN",
  };
  const seedRng=(function(){let a=p.seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;
    let x=Math.imul(a^a>>>15,1|a);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296;}})();
  const pool=Object.keys(RULES);
  const voters=[];
  while(voters.length<3){
    const c=pool[Math.floor(seedRng()*pool.length)];
    if(!voters.includes(c))voters.push(c);
  }
  const votes=voters.map(who=>{
    let v=RULES[who]();
    if(v==="ABSTAIN"&&t(who)>=2&&seedRng()<.5)v="GOOD";     /* they know you */
    if(v==="ABSTAIN"&&t(who)<=-1&&seedRng()<.5)v="EVIL";    /* they know you */
    return {who,v};
  });
  const g=votes.filter(x=>x.v==="GOOD").length,
        e=votes.filter(x=>x.v==="EVIL").length;
  const stamp=g>e?"GOOD":e>g?"EVIL":"REVIEW";
  return {stamp,votes};
}

/* ---------------- ROOM TYPE UI METADATA ---------------- */
export const ROOM_META={
 break:     {icon:"☕", verb:"SKETCH ON A NAPKIN", color:"#ffd700"},
 lab:       {icon:"⚗", verb:"PRECISION ASSEMBLY", color:"#00ffff"},
 present:   {icon:"▤", verb:"PITCH THE ROOM",     color:"#ff66aa"},
 closet:    {icon:"▦", verb:"SALVAGE PARTS",      color:"#00ff88"},
 vending:   {icon:"▣", verb:"BROWSE THE MACHINE", color:"#8b5cf6"},
 conference:{icon:"◫", verb:"TAKE THE MEETING",   color:"#66aaff"},
 cafeteria: {icon:"◌", verb:"SIT A WHILE",        color:"#ff9955"},
 hr:        {icon:"⌸", verb:"REPORT TO HR",       color:"#f5f0e6"},
 corridor:  {icon:"═", verb:"KEEP WALKING",       color:"#8b8ba0"},
 mailroom:  {icon:"✉", verb:"SORT THE MAIL",      color:"#d8b08a"},
 archive:   {icon:"⌻", verb:"OPEN THE DRAWERS",   color:"#00ff88"},
 arcade:    {icon:"◉", verb:"PLAY THE MACHINE",   color:"#ff9955"},
 executive: {icon:"◆", verb:"YOU SHOULDN'T BE HERE", color:"#ff0044"},
};

/* ---------------- THE MAILROOM ----------------
   The post arrives for you whether or not you exist on paper. */
export const MAIL=[
 {id:"parts",from:"PROCUREMENT (AUTOMATIC)",
  text:"A padded envelope, addressed to your role, not your name. Roles are more reliable.",
  a:{t:"Open it",kind:"part",out:"A component, packed in shredded org charts."},
  b:{t:"Return to sender",fx:{syn:1},out:"There is no sender. Procurement thanks you for the exercise."}},
 {id:"crate",from:"NO SENDER · SILK LINING",
  text:"A small crate, jar-shaped dent, note in three languages: 'FOR THE HEIR.' It is Tuesday. It is always Tuesday.",
  a:{t:"Forward it upstairs",fx:{syn:3},trust:["gary",1],out:"Gary carries it like it's soup. 'Everything's soup if you believe.'"},
  b:{t:"Peek inside",fx:{clr:1,sus:1},out:"Silk. A dent. A smell like old libraries and older money. You close it carefully."}},
 {id:"constituents",from:"HANDWRITTEN, MANY HANDS",
  text:"A letter signed by an entire constituency. The handwriting starts angry and ends organized.",
  a:{t:"Read every signature",fx:{syn:2},trust:["lisa",1],out:"You read all of them. Lisa hears that you did. Word travels through walls here."},
  b:{t:"File under feedback",fx:{sus:1},out:"The folder accepts it the way the sea accepts rivers."}},
 {id:"execmemo",from:"MISDELIVERED · MAHOGANY LETTERHEAD",
  text:"An executive memo, misdelivered. The subject line is redacted. The redaction is redacted.",
  a:{t:"Read it anyway",fx:{clr:1,sus:1},out:"You learn one true thing and forget which thing it was. Clearance rises like damp."},
  b:{t:"Deliver it properly",fx:{syn:3},out:"The executive floor accepts it through a slot that wasn't there yesterday."}},
 {id:"coupon",from:"THE MACHINE (VENDING)",
  text:"A coupon from the vending machine, printed on receipt paper, slightly warm. 'ONE (1) GESTURE OF GOODWILL.'",
  a:{t:"Redeem: coolant",kind:"coolant",out:"The machine honours it solemnly. The grievance file thins by one page."},
  b:{t:"Frame it",fx:{syn:2},out:"It hangs in the mailroom. The machine, informed, hums in a warmer key."}},
 {id:"returned",from:"RETURN TO SENDER: YOU",
  text:"A package you have no memory of sending, returned. Your handwriting. Last week's postmark. Next week's date.",
  a:{t:"Open it",fx:{clr:1,doom:1},out:"Inside: a napkin, blank, pre-folded. You keep it. You were always going to keep it.",kind:"napkin"},
  b:{t:"Send it again",fx:{syn:1},out:"It will come back. That's what makes it yours."}},
];

/* ---------------- THE ARCHIVE ----------------
   The Galt Papers, filed under W, opened by clearance. */
export const ARCHIVE_DRAWERS=[
 {lore:"g1",clr:1,label:"DRAWER W-1 · a folder with no dates in it",
  flavor:"Reading is not forbidden, which around here is the loudest possible warning."},
 {lore:"g2",clr:2,label:"DRAWER W-2 · correspondence, unsent",
  flavor:"The paper smells like a grudge kept professionally."},
 {lore:"g3",clr:3,label:"DRAWER W-3 · lab notebooks, sealed",
  flavor:"The seal is broken. The seal was always broken. Someone re-seals it out of respect."},
 {lore:"g4",clr:4,label:"DRAWER W-4 · shipping manifests, several regimes",
  flavor:"Stamped by a volcano, a family, and a ministry that no longer exists twice."},
 {lore:"g5",clr:5,label:"DRAWER W-5 · four minutes, annotated",
  flavor:"Minute three is annotated in a different hand. The hand was waiting."},
];
export const FINAL_DRAWER={lore:"human",clr:5,
  label:"FINAL DRAWER · EMPLOYEE #1",
  flavor:"It is not locked. It was never locked."};

/* ---------------- WORLD TICKS v2 ----------------
   Generated events: ambient, cast-pair, and ledger-intersecting. */
export const TICK_PAIRS=[
 (a,b)=>`${a} scheduled a sync with ${b}. Both attended. Neither was there.`,
 (a,b)=>`${a} borrowed a part from ${b}'s bench. The part has opinions about the move.`,
 (a,b)=>`${a} and ${b} argued in the corridor until the motion sensor filed for overtime.`,
 (a,b)=>`${a} left a note on ${b}'s desk. ${b} framed it. Neither will explain.`,
 (a,b)=>`${a} nominated ${b} for an award that does not exist yet. HR is building it, warily.`,
];
export const TICK_LEDGER=[
 p=>`GI 'rescued' the venue where ${p.name} was being demonstrated. The venue is now open-plan in every direction.`,
 p=>`Lisa organised the ${p.name} units. They demand coolant breaks and a floor vote.`,
 p=>`A town that adopted ${p.name} has elected it to the school board. It ran unopposed. It runs everything unopposed.`,
 p=>`Supes upgraded a ${p.name} she found in the wild. It is now the fastest one. It did not need to be the fastest one.`,
 p=>`Benny shorted ${p.name}, then hedged, then bought the float. The float sends its regards.`,
 p=>`Sam cited ${p.name} in a footnote about inevitability. The footnote has its own footnote. It's ${p.name} all the way down.`,
 p=>`Wendy located the original ${p.name} deck. Page six intact. She is not saying which archive. She is saying it's intact.`,
 p=>`Customs briefly classified ${p.name} as ordnance, out of nostalgia.`,
];
