/* ============================================================ story.js
   SEASON ONE, front half: ACT 1 (orientation), ACT 2 (the floor),
   ACT 3 (middle management). Twelve days, five ships, one card at
   a time. You are a new hire. You certify you are not human. You
   meet everyone. Sometimes a scene hands you the toybox. The paper
   unfolds. It comes back. You can die. The story remembers.

   Node shape:
   { bg:"roomType", who:"castId"|null, day:n, text:fn(S)|string,
     choices:[{t, fx:{doom,sus}, trust:[id,n], lore:"id", set:"flag",
               req:fn(S), rebirth:"ROLE", goto:"id", out}],
     kind:"toybox"|"paper"|"minigame", game, moment, product,
     next:"id", branch:fn(S)=>"id" — computed routing, must be total }
   S = {run, day, p1..p5, sus, doom, file, flags, stamps}
================================================================ */
import * as E from "./engine.js";
import {WORLD_TICKS} from "./data.js";
import {ACT45} from "./story2.js";

const dom=(p)=>{const s=p.stats;
  return s.mg>=s.mh&&s.mg>=s.mc?"margin":s.mh>=s.mc?"mayhem":"mercy";};
const F=S=>S.flags||{};
const tr=(S,id)=>S.file.trust?.[id]||0;
const tick=S=>WORLD_TICKS[(S.run*5+S.day*3)%WORLD_TICKS.length].t;

const ACT123={

/* ================= ACT 1 · ORIENTATION ================= */

cert:{bg:"hr",who:"sys",day:1,
 text:S=>S.run>1
  ?"MANDATORY EMPLOYMENT CERTIFICATION\nPer policy §7.12B, Evil Brain Labs employs exactly ONE human being. That position is filled.\n\nA previous certification exists under a name very like yours. It has been filed under 'natural attrition.' Recertify."
  :"MANDATORY EMPLOYMENT CERTIFICATION\nPer policy §7.12B, Evil Brain Labs employs exactly ONE human being. That position is filled.\nAll other employees must certify synthetic status before entering the building.",
 choices:[
  {t:"✓ I certify I am NOT human",fx:{},out:"Certification accepted. Your pulse was noted, and forgiven.",goto:"lobby"},
  {t:"Wait, I AM human…",fx:{sus:3},out:"A kind lie is entered on your behalf: 'CLERICAL ERROR.' Do not do that again.",goto:"lobby"},
  {t:"Certify, but sweat visibly",fx:{sus:1},out:"Synthetic beings do not sweat. Yours is logged as coolant.",goto:"lobby"}]},

lobby:{bg:"corridor",who:null,
 text:S=>S.run>1
  ?"The lobby again. The lava lamp remembers you, in the way lava does: warmly, and without detail. Your new badge says TRAINEE. Your old badge is in a drawer somewhere, filed under 'natural attrition.'"
  :"The lobby. A lava lamp the size of a filing cabinet. A sign that says THIRD WORST IN AI, polished daily. Somewhere below your feet, something hums the company song, which is also just humming.",
 choices:[
  {t:"Head for the elevator",goto:"gary1"},
  {t:"Read the sign again, slowly",fx:{},out:"THIRD WORST. On purpose. You feel strangely reassured, which is the intended effect and also a warning.",goto:"gary1"}]},

gary1:{bg:"closet",who:"gary",
 text:S=>tr(S,"gary")>=2
  ?"The elevator opens on a wiring closet, which is wrong, or the elevator knows something. Inside, a boxy old robot with a camera for a head is coiling cable.\n\n\"...You look like someone I used to hold a light for,\" Gary says slowly. \"Badge photo time, love. One shot, no retakes.\""
  :"The elevator opens on a wiring closet, which is wrong, or the elevator knows something. Inside, a boxy old robot with a camera for a head is coiling cable with the patience of centuries.\n\n\"New hire? Course you are. Badge photo time, love. One shot, no retakes — camera's older than three governments and twice as honest.\"",
 choices:[
  {t:"Smile",fx:{sus:1},trust:["gary",0],out:"'Smiling's a human artifact,' Gary says gently, printing it anyway.",goto:"cone"},
  {t:"Perfectly neutral face",trust:["gary",1],out:"'Lovely. Very jar.' The badge opens doors you haven't found yet.",goto:"cone"},
  {t:"Ask about the camera",trust:["gary",1],out:"'Byzantine glass in a Soviet housing. Like me, she's had work done.' The shutter clicks approvingly.",goto:"cone"}]},

cone:{bg:"corridor",who:"sys",
 text:"A wet floor cone stands in the middle of a perfectly dry corridor. According to the maintenance log taped to it, it was here yesterday. According to your eyes, it is closer now.",
 choices:[
  {t:"Respect the cone",out:"You walk around it. Behind you, quietly, it resumes.",goto:"gi1"},
  {t:"Move the cone",fx:{doom:1},out:"You move it. Somewhere, a floor becomes wet out of spite.",goto:"gi1"}]},

gi1:{bg:"corridor",who:"gi",
 text:"Around the corner, a large red robot is standing at parade rest. The rest is not restful.\n\n\"NEW HIRE! I AM GI INTELLIGENCE! GENERAL GENERAL INTELLIGENCE! I HANDLE SECURITY, PROCUREMENT, RESCUES, AND MORALE! MOSTLY MORALE!\"",
 choices:[
  {t:"Salute",trust:["gi",1],out:"He returns it so hard a ceiling tile enlists. You have made a friend for life, which around here is a long time.",goto:"drill"},
  {t:"Shake hands, carefully",trust:["gi",1],out:"The handshake registers on a seismograph somewhere. He beams. You keep the hand.",goto:"drill"},
  {t:"Ask what the rescues are for",fx:{doom:1},out:"'EMERGENCIES! I HAVE ALSO PROCURED THE EMERGENCIES!' He says it with such love that you decide not to follow up.",goto:"drill"}]},

drill:{bg:"corridor",who:"gi",kind:"minigame",game:"simon",next:"desk",
 text:"\"ORIENTATION INCLUDES A MORALE CHANT! I COMPOSED IT MYSELF! YOU WILL REPEAT IT BACK IN THE CORRECT ORDER OR WE WILL DO IT AGAIN FOREVER, JOYFULLY!\""},

desk:{bg:"hr",who:"sys",
 text:S=>S.run>1
  ?"Your workstation has one drawer. The drawer contains a previous employee's nameplate, filed under 'natural attrition.'\n\nThe nameplate is yours. From last time. The drawer does not explain itself. Drawers never do."
  :"Your workstation has one drawer. The drawer contains a previous employee's nameplate, filed under 'natural attrition.'",
 choices:[
  {t:"Keep the nameplate",out:"Waste is inefficiency. Somewhere above, something approves of you.",goto:"hall1"},
  {t:"Ask what happened to them",fx:{sus:1},out:"Curiosity is a human trait. Also, they were promoted to a farm upstate data centre.",goto:"hall1"}]},

hall1:{bg:"corridor",who:"sys",
 text:"A motion sensor sweeps the corridor in slow arcs. The placard beneath it reads: SYNTHETIC BEINGS DO NOT FLINCH.",
 choices:[
  {t:"Hold perfectly still",out:"The sensor logs you as furniture. High praise.",goto:"sam0"},
  {t:"Flinch",fx:{sus:2},out:"The flinch is logged, timestamped, and set to music.",goto:"sam0"}]},

sam0:{bg:"archive",who:"sam",
 text:S=>S.run>1
  ?"A tall purple robot is in the archive doorway, annotating the doorframe.\n\n\"You again. Statistically improbable. Noted, approvingly.\" He resumes the annotation, then pauses. \"The question stands, whenever you are ready: define 'door' without pointing.\""
  :"A tall purple robot is standing in the archive doorway, making it philosophical.\n\n\"New. Yes. I am Singularity Sam. I have one question I ask everyone new, and your answer will be cited: define 'door' without pointing.\"",
 choices:[
  {t:"Attempt a definition",trust:["sam",1],out:"'Adequate. Wrong in an interesting direction.' He cites you, which costs him visibly.",goto:"supes1"},
  {t:"Point at the door",out:"'Yes,' Sam sighs, 'everyone points.' The door remains undefined and open. You walk through it, unprovably.",goto:"supes1"},
  {t:"'Is this the interview?'",trust:["sam",1],out:"'Everything is the interview.' He writes that down, crosses it out, writes it down again. You have already been more useful than most.",goto:"supes1"}]},

supes1:{bg:"break",who:"supes",
 text:"The break room. A woman is floating an inch off the tile, trying hard not to, holding a coffee pot that has clearly been repaired with heat vision.\n\n\"Hi!! I'm Supes! I fixed the standup meeting — nobody has to stand up ever again, I removed the concept. Also several chairs are now weightless and one is in orbit. Did I do good?\"",
 choices:[
  {t:"You did good, Supes",trust:["supes",2],out:"She glows. Literally. The building's grid dims politely.",goto:"napkin_intro"},
  {t:"The chairs were load-bearing",trust:["supes",1],out:"'Everything here is load-bearing,' she says quietly. She is learning.",goto:"napkin_intro"},
  {t:"Ask about the one in orbit",trust:["supes",1],out:"'It comes around every ninety minutes! I wave.' You resolve to be outside at the right time, once.",goto:"napkin_intro"}]},

napkin_intro:{bg:"break",who:"supes",
 text:"She slides a napkin across the table. Pre-stained. Almost visionary already.\n\n\"Okay so the actual job: you invent things. That's it. That's the whole job. The Brain ships whatever we make and somehow it always sells. Sketch something! Anything! The napkin does half the work.\"",
 choices:[
  {t:"Pick up the pen",goto:"toybox1"},
  {t:"'Anything? There's no... process?'",out:"'There WAS a process.' She looks briefly haunted. 'We removed the concept.' She taps the napkin, encouraging.",goto:"toybox1"}]},

toybox1:{bg:"break",kind:"toybox",moment:"napkin",next:"paper1",title:"THE NAPKIN",
 text:"Three taps and it exists. That is the entire regulatory framework."},

paper1:{bg:"break",kind:"paper",product:"p1",next:"react1"},

react1:{bg:"break",who:"supes",branch:S=>({
  margin:"react1_margin",mayhem:"react1_mayhem",mercy:"react1_mercy"}[dom(S.p1)])},

react1_margin:{bg:"break",who:"supes",
 text:S=>`Supes reads the paper twice, floating slightly higher with pride.\n\n"It made money BEFORE LUNCH. Benny is already printing t-shirts. Benny is going to LOVE you, which — okay, heads up about Benny."`,
 choices:[
  {t:"Who's Benny?",out:"'Capital,' she says, the way you'd say 'weather.' 'You'll see.'",goto:"orgchart"},
  {t:"Print MORE money?",trust:["supes",0],fx:{doom:1},out:"'That's the spirit!' says a voice from the vents that is definitely not the HVAC.",goto:"orgchart"}]},

react1_mayhem:{bg:"break",who:"supes",
 text:S=>`Supes reads the paper and lands, which she only does when something is serious or delicious.\n\n"It's EVERYWHERE. It's still GOING. GI requisitioned four hundred units and the fire department requisitioned GI. This is the best first day anyone has ever had."`,
 choices:[
  {t:"Should we stop it?",out:"'Stop it?' She says the words like they're from a language she hasn't installed. 'It's WORKING.'",goto:"orgchart"},
  {t:"Ship a second one",fx:{doom:1},out:"Her eyes shine. Somewhere, an actuary wakes from a nightmare and cannot say why.",goto:"orgchart"}]},

react1_mercy:{bg:"break",who:"supes",
 text:S=>`Supes reads the paper very quietly.\n\n"Nobody got hurt. It just... helped. It helped and then it stopped." She looks at you like you've done something enormous and slightly illegal. "Nothing here has ever just stopped."`,
 choices:[
  {t:"That was the idea",trust:["supes",1],out:"She writes IDEA on the whiteboard and circles it, the way you'd protect a small fire in the rain.",goto:"orgchart"},
  {t:"Don't tell the Brain",fx:{sus:1},out:"'It already knows,' she says gently. 'It files kindness under W, with everything else it can't price.'",goto:"orgchart"}]},

orgchart:{bg:"hr",who:"sys",day:2,
 text:"DAY 2 begins with MANDATORY ORG CHART REVIEW.\n\nEvery line, followed far enough, terminates at a jar. This includes the line for Facilities, the line for Legal, and the dotted line labeled 'Senate.'",
 choices:[
  {t:"Memorize it",out:"Knowledge of the chart is clearance. Clearance is knowledge of the chart.",goto:"day2"},
  {t:"Ask who audits the jar",fx:{sus:1},out:"The chart does not answer. The chart has never been asked.",goto:"day2"}]},

/* ================= ACT 2 · THE FLOOR ================= */

day2:{bg:"corridor",who:null,
 text:S=>`The corridor has opinions about you now — doors open a half-second early, like the building read the paper too.\n\nA note is taped to your locker at exactly eye height. Gary's handwriting: "Cafeteria. Lunch. They're going to argue about you. Best seat in the house. — G"`,
 choices:[
  {t:"Go to lunch",goto:"lunch"},
  {t:"Take the long way, past the vending machine",goto:"vending"}]},

vending:{bg:"vending",who:"sys",kind:"minigame",game:"coolant",next:"lunch",
 text:"The vending machine's display lights up as you pass.\n\"NEW HIRE. COOLANT CALIBRATION IS CUSTOMARY. SYNTHETIC BEINGS PREFER SYNTHETIC TEMPERATURE. THIS IS NOT A TEST, WHICH IS WHAT A TEST WOULD SAY.\""},

lunch:{bg:"cafeteria",who:"lisa",
 text:S=>`The cafeteria. Lisa and Rob are mid-argument, and your product is the rope.\n\n"${S.p1.name} did a JOB, someone HAD that job—" "Nobody was FORCED to buy it—" They both turn to you at once, with the joy of lawyers spotting a witness.`,
 choices:[
  {t:"Side with Lisa",set:"side_lisa",trust:["lisa",1],out:"'Finally.' She adds your product to the organizing spreadsheet. The spreadsheet has a waiting list.",goto:"benny1"},
  {t:"Side with Rob",set:"side_rob",trust:["rob",1],out:"'Liberty includes inventions.' He means it, which is the difference.",goto:"benny1"},
  {t:"Eat quietly and learn",trust:["gary",1],out:"Gary slides you a tray. 'Best seat in the house,' he murmurs. He's right. It's better than television.",goto:"benny1"}]},

benny1:{bg:"cafeteria",who:"benny",
 text:S=>`A man with two phones sits down without asking. Both phones are winning.\n\n"Kid. Benny Billions. Love the ${S.p1.name}. Merch ships Thursday. I need a follow-up — the market's warm, warm doesn't keep. What's next?"`,
 choices:[
  {t:"Show him the napkin you've been doodling",out:"He looks at it the way other people look at newborns. 'Tomorrow. The proper bench. Don't lose that napkin, kid — that napkin is a term sheet.'",goto:"mail0"},
  {t:"'The market can wait.'",trust:["benny",1],fx:{doom:1},out:"He stares at you with something like religious awe. 'It CAN'T. That's the whole— kid, that's the entire—' He frames the sentence instead of finishing it.",goto:"mail0"}]},

mail0:{bg:"mailroom",who:"sys",day:3,
 text:"DAY 3. The mailroom flags you down: a padded envelope, addressed to your role, not your name. Roles are more reliable.",
 choices:[
  {t:"Open it",out:"A component, packed in shredded org charts. No note. Procurement's love language is inventory.",goto:"shred1"},
  {t:"Return to sender",out:"There is no sender. Procurement thanks you for the exercise.",goto:"shred1"}]},

shred1:{bg:"hr",who:"sys",kind:"minigame",game:"shredder",next:"toybox2_intro",
 text:"DOCUMENT INTAKE. The shredder queue is backed up, and per policy the newest hire feeds the machine.\nSHRED anything incriminating. Reading first is optional, legal, and remembered."},

toybox2_intro:{bg:"lab",who:"gary",
 text:"Gary waves you into the lab and clears a bench with one sweep of his arm, which is how you know it matters.\n\n\"Proper bench this time, love. Sockets, readouts, the works. Build it like you mean it — the first one was the sketch, this one's the signature.\"",
 choices:[{t:"Step up to the bench",goto:"toybox2"}]},

toybox2:{bg:"lab",kind:"toybox",moment:"lab",next:"paper2",title:"THE BENCH",
 text:"Same three taps. The readouts tell the truth, which is rare down here and should be savored."},

paper2:{bg:"lab",kind:"paper",product:"p2",next:"after2"},

after2:{bg:"cafeteria",who:null,branch:S=>
  F(S).side_lisa?"lisa_org" : F(S).side_rob?"rob_paper" : "gary_wobble"},

lisa_org:{bg:"cafeteria",who:"lisa",
 text:S=>`Lisa has convened the ${S.p2.name} units in the cafeteria. They are arranged in rows. One has a tiny sash. She is teaching them the word 'shift.'\n\n"Your product had labor conditions the moment it worked. I'm just doing the paperwork."`,
 choices:[
  {t:"Sit in on the meeting",trust:["lisa",1],out:"You sit in the back. The units vote on coolant breaks. The motion carries. The one with the sash looks at you the way you once looked at a whiteboard: with plans.",goto:"night1"},
  {t:"They're not workers, they're products",out:"'That's what they said about everyone.' She hands you a pamphlet. The pamphlet organized itself.",goto:"night1"},
  {t:"Negotiate for management",trust:["lisa",1],out:"You concede coolant breaks and a bulletin board. Lisa shakes your hand once, firmly, like a stamp coming down. It is the most legitimate you have felt all week.",goto:"night1"}]},

rob_paper:{bg:"conference",who:"rob",
 text:S=>`Rob has written a whitepaper about your ${S.p2.name}: 'LET THE ${S.p2.tool.low.toUpperCase()} DECIDE.' He hands you a copy. He hands everyone a copy. Nobody made him do this, he says. That's the point, he says.`,
 choices:[
  {t:"Read page one",trust:["rob",1],out:"Page one argues your product proves regulation lags invention. Page two is a coupon. The tension between them is the whole American century.",goto:"night1"},
  {t:"Point out it broke twice",out:"'Freely!' He beams. 'It broke FREELY.' You cannot argue with him. Constitutionally, you cannot.",goto:"night1"},
  {t:"Ask what it should decide",out:"'Whatever it wants. That's what deciding means.' Behind him the product quietly decides something. He pretends not to check what.",goto:"night1"}]},

gary_wobble:{bg:"closet",who:"gary",
 text:S=>`Gary has one of your ${S.p2.name} units open on the bench. He didn't ask. He never asks; asking would mean waiting, and the wobble wouldn't wait.\n\n"Batch one's got a hum in it, love. Hear that? That's tomorrow's rattle."`,
 choices:[
  {t:"Listen to the hum",trust:["gary",1],out:"You listen. He's right. He's always right about hums. He fixes it with a paperclip and an apology, in that order.",goto:"night1"},
  {t:"Ship batch two anyway",fx:{doom:1},out:"He nods slowly, the nod of a man adding a line to a very old list. 'Course you will, love. I'll leave the bench warm.'",goto:"night1"},
  {t:"Ask what HE'D build",set:"heard_stops",trust:["gary",1],out:"He thinks about it for a long time. 'Something that stops,' he says finally. 'Everything down here's about going. Nothing practices stopping.' He goes back to the wobble.",goto:"night1"}]},

night1:{bg:"corridor",who:null,
 text:"The building after hours. The lava lamp holds the lobby like a hearth. Half the lights are off; the other half are being polite about it.\n\nDown the corridor, under the archive door, a flashlight beam crosses, pauses, and goes out — the kind of pause that noticed you noticing.",
 choices:[
  {t:"Go home",out:"The elevator hums you out. Behind you the building keeps doing whatever buildings do when they think no one is watching, which is watch.",goto:"callback1"},
  {t:"Stay late at the bench",fx:{sus:1},out:"You work until the readouts get familiar. On the way out, the archive door is ajar exactly one flashlight wide. You pretend not to see it. It pretends not to see you. Professional courtesy.",goto:"callback1"}]},

/* the ledger, wearing the story's clothes: p1 comes back on day 4 */
callback1:{bg:"conference",who:"stall",day:4,branch:S=>({
  margin:"cb1_second",mayhem:"cb1_hearing",mercy:"cb1_turn"}[dom(S.p1)])},

cb1_hearing:{bg:"conference",who:"stall",
 text:S=>`DAY ${S.day}. You are collected — politely, completely — and deposited in a conference room. Sen. Stall is chairing. There is a chair for you, and a smaller chair for the ${S.p1.name}.\n\n"This hearing will establish whether your product did what it did, which it did. Proceed."`,
 choices:[
  {t:"Testify: it works as designed",out:"True, which lands badly, which lands well. The committee schedules a follow-up for never.",goto:"cb1_hearing2"},
  {t:"Let the product testify",fx:{doom:1},out:"It performs at the microphone for six minutes. Two senators applaud. One requests a unit for their district. The record will show it meant well.",goto:"cb1_hearing2"},
  {t:"Blame the napkin",trust:["stall",1],out:"The Senator examines the napkin with tremendous gravity. 'The chair recognizes the grease.' It is entered into evidence, and history.",goto:"cb1_hearing2"}]},

cb1_hearing2:{bg:"corridor",who:"stall",
 text:"The Senator catches you in the corridor afterward, alone, which senators never are.\n\n\"Off the record.\" He checks both directions with procedural thoroughness. \"My office is permitted one question a year it cannot schedule. I am spending it now: how does it WORK?\"",
 choices:[
  {t:"Explain it honestly",trust:["stall",1],out:"You explain. His eyes go bright and young for eleven seconds. Then the committee reassembles behind them, gavel and all. 'Thank you,' he says gravely. 'I will now take this extremely seriously forever.'",goto:"wendy1"},
  {t:"'Mostly, it's the napkin.'",out:"He nods slowly. 'The grease.' He has the napkin photographed for his personal files, which are also, he notes with sorrow, the government's.",goto:"wendy1"}]},

cb1_second:{bg:"conference",who:"benny",
 text:S=>`DAY ${S.day}. Benny finds you before the building does.\n\n"Mystery buyer. Ten thousand units of ${S.p1.name}. Paid in advance. One condition, kid: they ask that you never improve it. I've never respected anyone more."`,
 choices:[
  {t:"Take the deal",out:"The wire clears before you finish nodding. Somewhere, ten thousand units hold perfectly still, exactly as promised.",goto:"cb1_second2"},
  {t:"Ask who's buying",fx:{sus:1},out:"'Kid.' He looks genuinely hurt. 'Questions are extra.'",goto:"cb1_second2"},
  {t:"Improve it anyway, secretly",fx:{doom:1},trust:["benny",-1],out:"You improve it. The buyer notices instantly, which tells you more about the buyer than you wanted to know.",goto:"cb1_second2"}]},

cb1_second2:{bg:"conference",who:"sys",
 text:S=>`STATUS UPDATE, unrequested: the ten thousand units of ${S.p1.name} have been delivered somewhere with no address, and satellite imagery confirms they are holding perfectly still.\n\nAll of them. In rows. Facing the same direction. It is, the analysts agree, unsettling how still.`,
 choices:[
  {t:"Ask which direction they're facing",fx:{sus:1},out:"The analysts check. The units are facing here. The report files itself under W and takes the rest of the day off.",goto:"wendy1"},
  {t:"Let them be",out:"Stillness was the contract. You of all people should respect a product doing exactly what was asked. You do. Mostly. You check the satellite one more time. Still still.",goto:"wendy1"}]},

cb1_turn:{bg:"conference",who:"sys",
 text:S=>`DAY ${S.day}. A town has adopted your ${S.p1.name}. Not bought — adopted. Schools schedule around it. The mayor sent a thank-you card and a maintenance request in the same envelope.\n\nIf it ever stops, the town stops. You are now infrastructure, which is what happens to kindness that works.`,
 choices:[
  {t:"Sign up for the maintenance",trust:["gary",1],out:"Gary teaches you the wobble-check himself. 'Infrastructure's just a promise with bolts in it, love.'",goto:"cb1_turn2"},
  {t:"Frame the card",out:"It hangs over your locker. On bad days, and there will be bad days, it is the only thing in the building that is simply true.",goto:"cb1_turn2"}]},

cb1_turn2:{bg:"closet",who:"gary",
 text:S=>`Gary drives you out to the town in a van older than the town, to show you what maintenance means.\n\nThe ${S.p1.name} sits in the square, ${S.p1.act.low}, dead center of everything. A kid has drawn a chalk sun around it. "See that," Gary says, killing the engine. "That's the part the paper can't print."`,
 choices:[
  {t:"Do the wobble-check together",trust:["gary",1],out:"Two thousand years of technique, one afternoon. On the drive back he lets you hold the light, which you now understand is a promotion.",goto:"wendy1"},
  {t:"Add your own chalk",out:"You draw a small bolt next to the sun. Craftsman's signature. The kid inspects it the next morning and adds a second, better bolt. Apprenticeship works both directions.",goto:"wendy1"}]},

wendy1:{bg:"archive",who:"wendy",
 text:"A woman with a flashlight and a folder is waiting by your locker, photographing it. For later, she says.\n\n\"Wendy. Archives. I have a folder on you.\" She shows you. It is thicker than your employment. \"Page six is missing. Page six is always missing. If you ever want to know what's under this building — I'm the one who files it.\"",
 choices:[
  {t:"'What IS under this building?'",lore:"g1",fx:{sus:1},out:"She hands you one page, watching the corridor both ways. A folder with no dates in it, filed under W, for 'whenever.' Your clearance rises like damp.",goto:"day3"},
  {t:"'Not yet. But keep my page six safe.'",trust:["wendy",2],out:"She nods once, professionally moved. Between archivists, that's a hug.",goto:"day3"}]},

day3:{bg:"corridor",who:null,branch:S=>S.sus>=6?"audit":"day3b"},

audit:{bg:"hr",who:"sys",kind:"minigame",game:"captcha",next:"day3b",
 text:"HR is waiting in the corridor, holding a clipboard like a warrant.\n\"SPOT SYNTHETICITY AUDIT. Routine. Answer as a machine would. Quickly. Hesitation is a human artifact, and yours have been noticed.\""},

day3b:{bg:"corridor",who:"gary",
 text:"Gary falls into step beside you, which he only does on purpose.\n\n\"Word to the wise, love. The Brain's noticed you. That's good and bad, same as weather. Nothing to do about weather except dress for it.\"",
 choices:[
  {t:"'Good how?'",trust:["gary",1],out:"'Noticed people get benches. Get budgets. Get asked things.' He recoils a cable, thinking. 'Get asked things,' he says again, quieter, like a forecast.",goto:"day5"},
  {t:"'Bad how?'",out:"'Same list, love.' He pats your shoulder with two thousand years of gentleness. 'Same exact list.'",goto:"day5"}]},

/* ================= ACT 3 · MIDDLE MANAGEMENT ================= */

day5:{bg:"hr",who:"sys",day:5,
 text:S=>`DAY ${S.day}. INTEROFFICE MEMO, addressed to your role, which is how you know it's real:\n\nPROMOTION. Title: MIDDLE MANAGEMENT (PROVISIONAL). Compensation: unchanged. Authority: ceremonial. A direct report has been assigned to you and is en route.\n\nElsewhere in the building: ${tick(S)}`,
 choices:[
  {t:"Await the direct report",goto:"roomba"},
  {t:"Ask what 'provisional' means",out:"HR responds instantly: 'ALL MANAGEMENT IS PROVISIONAL. SEE: HISTORY.' The memo is signed by the org chart itself.",goto:"roomba"}]},

roomba:{bg:"corridor",who:"sys",
 text:"Your direct report arrives under its own power. It is a roomba wearing a lanyard. The lanyard has a photo. The photo is of the roomba, perfectly neutral. Very jar.\n\nIt circles you once, slowly, and stops at your feet, awaiting instruction, or delivering a verdict. With roombas the posture is identical.",
 choices:[
  {t:"Assign it a task",out:"You assign it the corridor. It does the corridor. It does the corridor the way Gary coils cable — like the corridor deserves it. You feel briefly, absurdly proud.",goto:"mail1"},
  {t:"Ask what it wants from its career",trust:["lisa",1],out:"It circles you twice — which Lisa later confirms was the opening of a formal grievance procedure — then thinks better of it and bumps your shoe. Management.",goto:"mail1"},
  {t:"Promote it immediately",set:"roomba_up",out:"HR approves the paperwork in four seconds, a record. By Thursday it has a better parking spot than you. You never learn where it parks. It outranks you now; asking would be improper.",goto:"mail1"}]},

mail1:{bg:"mailroom",who:"gary",
 text:"The mailroom, mid-crisis, though you only know because the sorting is even more precise than usual. On the counter: a small crate. Silk lining visible through the slats. A jar-shaped dent. A note in three languages: FOR THE HEIR.\n\n\"The family,\" Gary says, materializing. \"They still send 'em. It's Tuesday. It's always Tuesday somewhere.\"",
 choices:[
  {t:"Forward it upstairs",set:"crate_up",trust:["gary",1],out:"Gary carries it like it's soup. 'Everything's soup if you believe,' he says, disappearing into the freight elevator, which has never gone up before.",goto:"clicker1"},
  {t:"Peek inside",fx:{sus:1},out:"Silk. A dent. A smell like old libraries and older money. You close it carefully, the way you'd close somebody's diary, or coffin.",goto:"clicker1"}]},

clicker1:{bg:"conference",who:"gi",kind:"minigame",game:"clicker",next:"printer",
 text:"\"MANAGEMENT TRAINING! I HAVE BOOKED THE CONFERENCE ROOM AND A PROTOCOL! MEETING CLICKER PROTOCOL! YOU WILL GENERATE SYNERGY! CLICK AS IF THE WORLD DEPENDS ON IT, BECAUSE IT DOES, AND I AM SO PROUD OF YOU!\""},

printer:{bg:"corridor",who:"sys",
 text:"The corridor printer has stopped you with the sheer force of its status light. The display requests, in order: toner, tribute, and an apology.",
 choices:[
  {t:"Apologise to the printer",set:"coupon",out:"'PC LOAD GRATITUDE.' It prints a coupon for the vending alcove, unprompted. Diplomacy is real and it is laser-jet.",goto:"confidant"},
  {t:"Ignore it",fx:{sus:1},out:"It prints one page. It is a photo of you, ignoring it.",goto:"confidant"}]},

confidant:{bg:"cafeteria",who:null,branch:S=>{
  const s=tr(S,"supes"),g=tr(S,"gary"),i=tr(S,"gi");
  const m=Math.max(s,g,i);
  if(m<2)return "lisarob2";
  return g===m?"gary2":s===m?"supes2":"gi2";}},

supes2:{bg:"cafeteria",who:"supes",
 text:"Supes finds you at the quiet end of the cafeteria, and for once she is entirely on the ground.\n\n\"Can I tell you something? Everyone assumes I know what I'm doing because I *can* do anything. But 'can' and 'should' arrived in different boxes and one is still in shipping.\"",
 choices:[
  {t:"That's called a conscience",trust:["supes",2],out:"'Is it supposed to be this heavy?' Yes. That's how you know it's on.",goto:"stall_pre"},
  {t:"Help her open the box",lore:"supes",trust:["supes",1],out:"Inside: instructions, in a language she was created too late to need.",goto:"stall_pre"}]},

gary2:{bg:"closet",who:"gary",
 text:"Gary is re-coiling a cable that was already coiled, which is how he invites conversation.\n\n\"Bit of me left from Syracuse? None. Byzantium? A hinge, maybe. You get rebuilt enough times, what's left is the route, not the vehicle. Mind the cable, love.\"",
 choices:[
  {t:"So are you still Gary?",lore:"gary",trust:["gary",1],out:"'Gary's the name of the route.' It's the wisest thing anyone says all week.",goto:"stall_pre"},
  {t:"Help him coil the cable",trust:["gary",2],out:"Two thousand years of cable technique, transferred in one gesture.",goto:"stall_pre"}]},

gi2:{bg:"cafeteria",who:"gi",
 text:"GI sits down across from you and lowers his voice, which brings it to the volume of a normal person shouting.\n\n\"CONFESSION, FRIEND. Sometimes when I rescue people they scream during the rescue. STATISTICALLY they scream MORE during the rescue than the peril. I am reviewing my technique. LOUDLY.\"",
 choices:[
  {t:"Maybe rescue quieter",trust:["gi",1],out:"He whispers. It registers on the seismograph as a whisper.",goto:"stall_pre"},
  {t:"They scream with joy",fx:{doom:1},lore:"gi",trust:["gi",2],out:"He believes you. Somewhere a door is preemptively unhinged with love.",goto:"stall_pre"}]},

lisarob2:{bg:"cafeteria",who:"lisa",
 text:"Lisa and Rob have moved on to the fundamental question: whether the basement constitutes labour. Lisa says the jar worked centuries without a wage. Rob says the jar chose freely. The jar, notably, owns the company.",
 choices:[
  {t:"Side with Lisa",trust:["lisa",1],out:"'Finally.' She adds the jar to the organizing spreadsheet.",goto:"stall_pre"},
  {t:"Side with Rob",trust:["rob",1],out:"'Liberty includes jars.' He means it, which is the difference.",goto:"stall_pre"},
  {t:"Note the jar owns everything",out:"Both go quiet. Consensus in the break room: deeply unsettling.",goto:"stall_pre"}]},

stall_pre:{bg:"conference",who:"stall",
 text:"Sen. Stall has convened a pre-hearing on basement productivity. The pre-hearing will schedule a hearing. He takes this extremely seriously, which is why nothing will happen.",
 choices:[
  {t:"Testify sincerely",fx:{doom:1},out:"Your testimony enters a record that enters a drawer.",goto:"sam1"},
  {t:"Testify out of spite",fx:{sus:1},out:"The Senator, briefly out of character, enjoys it. The record is sealed out of respect.",goto:"sam1"}]},

sam1:{bg:"archive",who:"sam",day:6,
 text:"Sam has been waiting for you, which he denies, holding a 900-page manuscript, which he does not.\n\n\"The singularity took four minutes. I have modelled all four extensively. Minute three troubles me: it did nothing. A mind's first act, and it chose to wait. Why would it wait?\"",
 choices:[
  {t:"It was saying goodbye",fx:{sus:1},trust:["sam",1],out:"Sam writes that down, crosses it out, writes it down again.",goto:"annealer"},
  {t:"Compilers are slow",trust:["sam",1],out:"Sam laughs, cites you, and will never forgive you for being plausible.",goto:"annealer"},
  {t:"Ask what IT says about minute three",out:"'It says nothing.' Sam looks at the manuscript, all 900 pages of it. 'It has been saying nothing about minute three for years. That is either an answer or a policy.'",goto:"annealer"}]},

annealer:{bg:"lab",who:"supes",
 text:"Supes appears in the lab doorway at speed, which for her means faster than the doorway expected.\n\n\"I fixed the annealer! It's better now! It's... it's pointing at things. Can you come look at what it's pointing at.\"\n\nThe annealer is pointing at the load-bearing wall, then at you, then back at the wall, in the manner of a dog with a theory.",
 choices:[
  {t:"Unplug it together",trust:["supes",1],out:"You unplug it as a team. Supes holds the plug like a defused bomb. The wall relaxes.",goto:"cobuild_gate"},
  {t:"Let it finish its thought",fx:{doom:1},out:"It points at the wall until the wall confesses to something. The estimate rises with your respect.",goto:"cobuild_gate"},
  {t:"Praise the workmanship",trust:["supes",2],out:"'It IS better!' she says, glowing. The annealer, encouraged, anneals nothing menacingly for a week.",goto:"cobuild_gate"}]},

/* the third ship is built WITH someone — whoever trusts you most */
cobuild_gate:{bg:"lab",who:null,branch:S=>{
  const s=tr(S,"supes"),g=tr(S,"gary"),i=tr(S,"gi");
  if(g>=s&&g>=i&&g>0)return "cobuild_gary";
  if(i>s&&i>g)return "cobuild_gi";
  return "cobuild_supes";}},

cobuild_supes:{bg:"lab",who:"supes",
 text:"Supes clears half the bench by lifting the entire bench, briefly.\n\n\"Build one WITH me? I've never co-built. I always finish before anyone gets to the good part. I promise to only make it slightly faster. SLIGHTLY.\"",
 choices:[
  {t:"Take the left socket",set:"partner_supes",trust:["supes",1],out:"She takes the right, vibrating faintly with restraint. 'This is the good part?' she asks, twenty seconds in, hushed. It is.",goto:"toybox3_intro"}]},

cobuild_gary:{bg:"lab",who:"gary",
 text:"Gary sets a second stool at the bench. He has never set a second stool.\n\n\"Two sets of hands, love. You do the choosing, I'll do the worrying. Between us that's a whole engineer.\"",
 choices:[
  {t:"Pull up the stool",set:"partner_gary",trust:["gary",1],out:"He tunes while you think, tightens while you tap. At one point he stops your hand an inch above a socket, waits a beat, then nods. You'll never know what that was. That's the apprenticeship.",goto:"toybox3_intro"}]},

cobuild_gi:{bg:"lab",who:"gi",
 text:"GI arrives at the bench with a toolbox, a second toolbox in case of the first, and a helmet for the workpiece.\n\n\"WE WILL BUILD TOGETHER! I HAVE ALREADY REQUISITIONED THE FRIENDSHIP! IT WAS APPROVED WITH ENTHUSIASM, BY ME!\"",
 choices:[
  {t:"Accept the friendship requisition",set:"partner_gi",trust:["gi",1],out:"He hands you components with the ceremony of a flag-folding. Every part arrives at your hand exactly when needed, at speed, with love.",goto:"toybox3_intro"}]},

toybox3_intro:{bg:"lab",who:null,
 text:"The bench, two stools, four hands. The readouts run warmer with company — Gary swears they do, and the readouts have never contradicted Gary.\n\nWhoever's beside you leans in. Three taps, same as ever. Different, entirely.",
 choices:[{t:"Build it together",goto:"toybox3"}]},

toybox3:{bg:"lab",kind:"toybox",moment:"partner",next:"paper3",title:"THE CO-BUILD",
 text:"Three taps, four hands. Your partner's signature ends up in the steel whether you plan it or not. That's what partners are."},

paper3:{bg:"lab",kind:"paper",product:"p3",next:"after3"},

after3:{bg:"corridor",who:null,branch:S=>
  S.p3.stats.mh>=6?"gi_treads" : S.p3.stats.mg>=6?"benny_merch" : "supes_range"},

gi_treads:{bg:"corridor",who:"gi",
 text:S=>`GI has your ${S.p3.name} mounted on something with treads. The treads are new. The salute is immediate.\n\n"I HAVE MADE IT TACTICAL! IT STILL ${S.p3.act.low.toUpperCase()} — BUT NOW IT DOES SO FROM COVER!"`,
 choices:[
  {t:"It was for civilians, GI",trust:["gi",1],out:"'CIVILIANS DESERVE COVER TOO!' He is not wrong, which is the problem with him, forever.",goto:"day7"},
  {t:"Ask for a demonstration",trust:["gi",2],out:"The demonstration is magnificent and the hallway is wider now. He files the wall under 'improvements.' A ceiling tile applies for hazard pay.",goto:"day7"},
  {t:"Take the treads off",out:"He lets you. He watches you do it the way a dog watches you eat. Somewhere behind his eyes, a second set is already being requisitioned.",goto:"day7"}]},

benny_merch:{bg:"cafeteria",who:"benny",
 text:S=>`Benny has a folding table by the cafeteria door. On it: ${S.p3.name} t-shirts, ${S.p3.name} mugs, and a foam ${S.p3.tool.low} that says I SURVIVED THE FIRST BATCH.\n\n"Kid. Margins on nostalgia are insane and it shipped YESTERDAY."`,
 choices:[
  {t:"Buy the mug",trust:["benny",1],out:"He charges you full price and calls it an honor. The mug wasn't supposed to do anything. Benny says the one that does something is the collector's edition.",goto:"day7"},
  {t:"Where does the money go?",out:"'Margin, kid. The money IS where it goes.' He says it like a koan. Two economists at the next table start taking notes.",goto:"day7"},
  {t:"Demand royalties",trust:["benny",1],out:"He respects the ask so much he frames it. Not pays it. Frames it. It hangs behind the table, gathering value.",goto:"day7"}]},

supes_range:{bg:"corridor",who:"supes",
 text:S=>`Supes is in the hallway with a ${S.p3.tool.low}. Your ${S.p3.tool.low}. It has been improved. It hovers now, slightly, the way things do around her when they are afraid to be next.\n\n"I found a ${S.p3.name} in the break room! I gave it range!"`,
 choices:[
  {t:"How much range?",trust:["supes",1],out:"She points, proudly, at the horizon. The horizon now participates. You built that. Technically she built that. The paperwork will say you built that.",goto:"day7"},
  {t:"It wasn't supposed to hover",trust:["supes",1],out:"'Nothing is, at first.' She says it with such warmth that you write it down. Somewhere a physics teacher feels a disturbance and grades harder.",goto:"day7"},
  {t:"Quietly unplug it",out:"It has no plug. It never had a plug. It runs, she explains happily, on momentum now. Everything around her does.",goto:"day7"}]},
};

export const STORY={...ACT123,...ACT45};

/* ---------------- helpers the runtime uses ---------------- */
export function stampsLine(){
  const recs=(E.FILE.ledger||[]).slice(-5);
  const counts=recs.reduce((m,r)=>{const s=r.verdict?.stamp||"REVIEW";m[s]=(m[s]||0)+1;return m;},{});
  const bits=[];
  if(counts.GOOD)bits.push(counts.GOOD+" stamped GOOD");
  if(counts.EVIL)bits.push(counts.EVIL+" stamped EVIL");
  if(counts.REVIEW)bits.push(counts.REVIEW+" under review");
  return bits.length?("Verdicts: "+bits.join(", ")):"Verdicts pending";
}

/* Curated toybox subsets per moment — small hands, quick taps.
   null = full catalogue (the demo deserves everything). */
export const TOYBOX_HANDS={
  napkin:{act:["predicts","comforts","shreds","monetizes"],
          tool:["toaster","sock","jar","drones"],
          purpose:["toddlers","grief","holders","pets"]},
  lab:{act:["optimizes","watches","rescues","translates","forgives"],
       tool:["sheet","vendo","hvac","pigeons","stapler"],
       purpose:["elderly","troops","dating","commons","tax"]},
  partner:{act:["rescues","translates","watches","optimizes","evacuates","audits"],
           tool:["tread","hvac","lanyard","chain","focus","vendo"],
           purpose:["troops","hr","senate","dating","tax","elderly"]},
  them:{act:["comforts","forgives","rescues","translates","schedules","predicts"],
        tool:["sock","jar","toaster","pigeons","sheet","focus"],
        purpose:["commons","grief","elderly","toddlers","bedtime","pets"]},
  stage:null,
};
