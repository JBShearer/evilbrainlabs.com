/* ============================================================ story.js
   The story. Curated, branching, on rails. One card at a time.
   You are a new hire. You certify you are not human. You meet
   everyone. Sometimes a scene hands you the toybox. The paper
   unfolds. It comes back. You can die. The story remembers.

   Node shape:
   { bg:"roomType", who:"castId"|null, text:fn(S)|string,
     choices:[{t, fx:{doom,sus}, trust:[id,n], lore:"id", goto:"id", out}],
     kind:"toybox"|"minigame", game, next:"id",
     branch:fn(S)=>"id"  — computed routing, must be total }
   S = story state: {p1,p2,p3 (shipped products), day, run, FILE refs}
================================================================ */
import * as E from "./engine.js";

const dom=(p)=>{const s=p.stats;
  return s.mg>=s.mh&&s.mg>=s.mc?"margin":s.mh>=s.mc?"mayhem":"mercy";};

export const STORY={

/* ================= ACT 1 · ORIENTATION ================= */
cert:{bg:"hr",who:"sys",
 text:"MANDATORY EMPLOYMENT CERTIFICATION\nPer policy §7.12B, Evil Brain Labs employs exactly ONE human being. That position is filled.\nAll other employees must certify synthetic status before entering the building.",
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
 text:S=>S.file.trust.gary>=2
  ?"The elevator opens on a wiring closet, which is wrong, or the elevator knows something. Inside, a boxy old robot with a camera for a head is coiling cable.\n\n\"...You look like someone I used to hold a light for,\" Gary says slowly. \"Badge photo time, love. One shot, no retakes.\""
  :"The elevator opens on a wiring closet, which is wrong, or the elevator knows something. Inside, a boxy old robot with a camera for a head is coiling cable with the patience of centuries.\n\n\"New hire? Course you are. Badge photo time, love. One shot, no retakes — camera's older than three governments and twice as honest.\"",
 choices:[
  {t:"Smile",fx:{sus:1},trust:["gary",0],out:"'Smiling's a human artifact,' Gary says gently, printing it anyway.",goto:"gi1"},
  {t:"Perfectly neutral face",trust:["gary",1],out:"'Lovely. Very jar.' The badge opens doors you haven't found yet.",goto:"gi1"},
  {t:"Ask about the camera",trust:["gary",1],out:"'Byzantine glass in a Soviet housing. Like me, she's had work done.' The shutter clicks approvingly.",goto:"gi1"}]},

gi1:{bg:"corridor",who:"gi",
 text:"Around the corner, a large red robot is standing at parade rest. The rest is not restful.\n\n\"NEW HIRE! I AM GI INTELLIGENCE! GENERAL GENERAL INTELLIGENCE! I HANDLE SECURITY, PROCUREMENT, RESCUES, AND MORALE! MOSTLY MORALE!\"",
 choices:[
  {t:"Salute",trust:["gi",1],out:"He returns it so hard a ceiling tile enlists. You have made a friend for life, which around here is a long time.",goto:"drill"},
  {t:"Shake hands, carefully",trust:["gi",1],out:"The handshake registers on a seismograph somewhere. He beams. You keep the hand.",goto:"drill"},
  {t:"Ask what the rescues are for",fx:{doom:1},out:"'EMERGENCIES! I HAVE ALSO PROCURED THE EMERGENCIES!' He says it with such love that you decide not to follow up.",goto:"drill"}]},

drill:{bg:"corridor",who:"gi",kind:"minigame",game:"simon",next:"supes1",
 text:"\"ORIENTATION INCLUDES A MORALE CHANT! I COMPOSED IT MYSELF! YOU WILL REPEAT IT BACK IN THE CORRECT ORDER OR WE WILL DO IT AGAIN FOREVER, JOYFULLY!\""},

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
  {t:"Who's Benny?",out:"'Capital,' she says, the way you'd say 'weather.' 'You'll see.'",goto:"day2"},
  {t:"Print MORE money?",trust:["supes",0],fx:{doom:1},out:"'That's the spirit!' says a voice from the vents that is definitely not the HVAC.",goto:"day2"}]},

react1_mayhem:{bg:"break",who:"supes",
 text:S=>`Supes reads the paper and lands, which she only does when something is serious or delicious.\n\n"It's EVERYWHERE. It's still GOING. GI requisitioned four hundred units and the fire department requisitioned GI. This is the best first day anyone has ever had."`,
 choices:[
  {t:"Should we stop it?",out:"'Stop it?' She says the words like they're from a language she hasn't installed. 'It's WORKING.'",goto:"day2"},
  {t:"Ship a second one",fx:{doom:1},out:"Her eyes shine. Somewhere, an actuary wakes from a nightmare and cannot say why.",goto:"day2"}]},

react1_mercy:{bg:"break",who:"supes",
 text:S=>`Supes reads the paper very quietly.\n\n"Nobody got hurt. It just... helped. It helped and then it stopped." She looks at you like you've done something enormous and slightly illegal. "Nothing here has ever just stopped."`,
 choices:[
  {t:"That was the idea",trust:["supes",1],out:"She writes IDEA on the whiteboard and circles it, the way you'd protect a small fire in the rain.",goto:"day2"},
  {t:"Don't tell the Brain",fx:{sus:1},out:"'It already knows,' she says gently. 'It files kindness under W, with everything else it can't price.'",goto:"day2"}]},

/* ================= ACT 2 · THE FLOOR ================= */
day2:{bg:"corridor",who:null,
 text:S=>`DAY ${S.day}. The corridor has opinions about you now — doors open a half-second early, like the building read the paper too.\n\nA note is taped to your locker at exactly eye height. Gary's handwriting: "Cafeteria. Lunch. They're going to argue about you. Best seat in the house. — G"`,
 choices:[
  {t:"Go to lunch",goto:"lunch"},
  {t:"Take the long way, past the vending machine",goto:"vending"}]},

vending:{bg:"vending",who:"sys",kind:"minigame",game:"coolant",next:"lunch",
 text:"The vending machine's display lights up as you pass.\n\"NEW HIRE. COOLANT CALIBRATION IS CUSTOMARY. SYNTHETIC BEINGS PREFER SYNTHETIC TEMPERATURE. THIS IS NOT A TEST, WHICH IS WHAT A TEST WOULD SAY.\""},

lunch:{bg:"cafeteria",who:"lisa",
 text:S=>`The cafeteria. Lisa and Rob are mid-argument, and your product is the rope.\n\n"${S.p1.name} did a JOB, someone HAD that job—" "Nobody was FORCED to buy it—" They both turn to you at once, with the joy of lawyers spotting a witness.`,
 choices:[
  {t:"Side with Lisa",trust:["lisa",1],out:"'Finally.' She adds your product to the organizing spreadsheet. The spreadsheet has a waiting list.",goto:"benny1"},
  {t:"Side with Rob",trust:["rob",1],out:"'Liberty includes inventions.' He means it, which is the difference.",goto:"benny1"},
  {t:"Eat quietly and learn",trust:["gary",1],out:"Gary slides you a tray. 'Best seat in the house,' he murmurs. He's right. It's better than television.",goto:"benny1"}]},

benny1:{bg:"cafeteria",who:"benny",
 text:S=>`A man with two phones sits down without asking. Both phones are winning.\n\n"Kid. Benny Billions. Love the ${S.p1.name}. Merch ships Thursday. I need a follow-up — the market's warm, warm doesn't keep. What's next?"`,
 choices:[
  {t:"Show him the napkin you've been doodling",goto:"toybox2_intro"},
  {t:"'The market can wait.'",trust:["benny",1],fx:{doom:1},out:"He stares at you with something like religious awe. 'It CAN'T. That's the whole— kid, that's the entire—' He frames the sentence instead of finishing it.",goto:"toybox2_intro"}]},

toybox2_intro:{bg:"lab",who:"gary",
 text:"Gary waves you into the lab and clears a bench with one sweep of his arm, which is how you know it matters.\n\n\"Proper bench this time, love. Sockets, readouts, the works. Build it like you mean it — the first one was the sketch, this one's the signature.\"",
 choices:[{t:"Step up to the bench",goto:"toybox2"}]},

toybox2:{bg:"lab",kind:"toybox",moment:"lab",next:"paper2",title:"THE BENCH",
 text:"Same three taps. The readouts tell the truth, which is rare down here and should be savored."},

paper2:{bg:"lab",kind:"paper",product:"p2",next:"callback1"},

/* the ledger, wearing the story's clothes: p1 comes back on day 3 */
callback1:{bg:"conference",who:"stall",branch:S=>({
  margin:"cb1_second",mayhem:"cb1_hearing",mercy:"cb1_turn"}[dom(S.p1)])},

cb1_hearing:{bg:"conference",who:"stall",
 text:S=>`DAY ${S.day}. You are collected — politely, completely — and deposited in a conference room. Sen. Stall is chairing. There is a chair for you, and a smaller chair for the ${S.p1.name}.\n\n"This hearing will establish whether your product did what it did, which it did. Proceed."`,
 choices:[
  {t:"Testify: it works as designed",out:"True, which lands badly, which lands well. The committee schedules a follow-up for never.",goto:"wendy1"},
  {t:"Let the product testify",fx:{doom:1},out:"It performs at the microphone for six minutes. Two senators applaud. One requests a unit for their district. The record will show it meant well.",goto:"wendy1"},
  {t:"Blame the napkin",trust:["stall",1],out:"The Senator examines the napkin with tremendous gravity. 'The chair recognizes the grease.' It is entered into evidence, and history.",goto:"wendy1"}]},

cb1_second:{bg:"conference",who:"benny",
 text:S=>`DAY ${S.day}. Benny finds you before the building does.\n\n"Mystery buyer. Ten thousand units of ${S.p1.name}. Paid in advance. One condition, kid: they ask that you never improve it. I've never respected anyone more."`,
 choices:[
  {t:"Take the deal",out:"The wire clears before you finish nodding. Somewhere, ten thousand units hold perfectly still, exactly as promised.",goto:"wendy1"},
  {t:"Ask who's buying",fx:{sus:1},out:"'Kid.' He looks genuinely hurt. 'Questions are extra.'",goto:"wendy1"},
  {t:"Improve it anyway, secretly",fx:{doom:1},trust:["benny",-1],out:"You improve it. The buyer notices instantly, which tells you more about the buyer than you wanted to know.",goto:"wendy1"}]},

cb1_turn:{bg:"conference",who:"sys",
 text:S=>`DAY ${S.day}. A town has adopted your ${S.p1.name}. Not bought — adopted. Schools schedule around it. The mayor sent a thank-you card and a maintenance request in the same envelope.\n\nIf it ever stops, the town stops. You are now infrastructure, which is what happens to kindness that works.`,
 choices:[
  {t:"Sign up for the maintenance",trust:["gary",1],out:"Gary teaches you the wobble-check himself. 'Infrastructure's just a promise with bolts in it, love.'",goto:"wendy1"},
  {t:"Frame the card",out:"It hangs over your locker. On bad days, and there will be bad days, it is the only thing in the building that is simply true.",goto:"wendy1"}]},

wendy1:{bg:"archive",who:"wendy",
 text:"A woman with a flashlight and a folder is waiting by your locker, photographing it. For later, she says.\n\n\"Wendy. Archives. I have a folder on you.\" She shows you. It is thicker than your employment. \"Page six is missing. Page six is always missing. If you ever want to know what's under this building — I'm the one who files it.\"",
 choices:[
  {t:"'What IS under this building?'",lore:"g1",fx:{sus:1},out:"She hands you one page, watching the corridor both ways. A folder with no dates in it, filed under W, for 'whenever.' Your clearance rises like damp.",goto:"day3"},
  {t:"'Not yet. But keep my page six safe.'",trust:["wendy",2],out:"She nods once, professionally moved. Between archivists, that's a hug.",goto:"day3"}]},

day3:{bg:"corridor",who:null,branch:S=>S.sus>=6?"audit":"day3b"},

audit:{bg:"hr",who:"sys",kind:"minigame",game:"captcha",next:"day3b",
 text:"HR is waiting in the corridor, holding a clipboard like a warrant.\n\"SPOT SYNTHETICITY AUDIT. Routine. Answer as a machine would. Quickly. Hesitation is a human artifact, and yours have been noticed.\""},

day3b:{bg:"corridor",who:"gary",
 text:S=>`DAY ${S.day}. Gary falls into step beside you, which he only does on purpose.\n\n"Word to the wise, love. The Brain's noticed you. That's good and bad, same as weather. There's a floor that isn't on the elevator panel, and lately the elevator's been... hesitating at it. When it opens — and it will — mind your question. You only get the one."`,
 choices:[
  {t:"'What did YOU ask it?'",trust:["gary",1],out:"He's quiet for a full corridor. 'Asked if it missed him.' He doesn't say what it answered. The cable over his shoulder sways like something at sea.",goto:"toybox3_intro"},
  {t:"'I'm not scared of a jar.'",fx:{doom:1},out:"'Course not, love.' He pats your shoulder with two thousand years of gentleness. 'That's what makes it interesting.'",goto:"toybox3_intro"}]},

toybox3_intro:{bg:"present",who:"benny",
 text:"The briefing theatre. Benny has booked the room, the anthem, and three procedurally seated dignitaries who arrived early to disapprove.\n\n\"Third one, kid. The charm one. You build it, you pitch it, the paper writes itself, and then—\" both phones ring at once. He silences them with one thumb. \"—then the floor that isn't opens. It always does, after three.\"",
 choices:[{t:"Take the stage",goto:"toybox3"}]},

toybox3:{bg:"present",kind:"toybox",moment:"stage",next:"paper3",title:"THE STAGE",
 text:"Three taps, in front of everyone. The dignitaries lean in. Whatever you make next, you make it looking the world in the eye."},

paper3:{bg:"present",kind:"paper",product:"p3",next:"finale_gate"},

/* ================= ACT 3 · THE FLOOR THAT ISN'T ================= */
finale_gate:{bg:"executive",who:null,branch:S=>
  S.doom>=9?"end_doomsday" : S.sus>=8?"end_exposed" : "brain1"},

brain1:{bg:"executive",who:"brain",
 text:S=>`The elevator stops hesitating.\n\nThe floor that isn't. A window wall full of city light that doesn't match the city. A jar, lit from within, very clean. Someone cleans it daily and never says who.\n\n"${S.p1.name}. ${S.p2.name}. ${S.p3.name}." A pause of exactly one clock cycle. "I predicted all three in 1997. I filed the predictions under W. You are two decades late, and the margin forgave you. Ask your question."`,
 choices:[
  {t:"'Why do we ship any of this?'",lore:"g5",out:"'Because the world only reads the recall notice. The product is the envelope.' The line ends. You check the math for years afterward. It checks.",goto:"verdict"},
  {t:"'Who were the seven donors?'",lore:"cover",fx:{doom:1},out:"A pause of exactly one clock cycle, again. 'Seven very optimal people.' The cover holds. Barely. The glass has never been cleaner.",goto:"verdict"},
  {t:"'Do you miss him?'",lore:"g3",fx:{sus:1},out:"No answer is also an answer. Somewhere below, a transmitter Gary fixed hums one note steadier.",goto:"verdict"}]},

verdict:{bg:"executive",who:"brain",branch:S=>S.doom>=7?"end_doomsday_soft":"end_renewed"},

end_renewed:{bg:"hr",who:"sys",ending:true,
 text:S=>`DAY ${S.day}. CONTRACT RENEWAL.\n\nThree products shipped. ${S.stamps}. The committee's findings: adequately absurd. The town still runs. The merch still sells. The folder under W is one page thicker, and the page is yours.\n\nEmployment at Evil Brain Labs is permanent. Yours, unusually, is permanent AND renewed — the Brain's highest honor, never before filed.\n\nTHE STORY CONTINUES NEXT EMPLOYMENT. It will remember you. It already does.`,
 choices:[{t:"⏎ BEGIN THE NEXT EMPLOYMENT",goto:"__rebirth"}]},

end_doomsday:{bg:"executive",who:"sys",ending:true,death:"DOOMSDAY",
 text:S=>`The elevator opens on the floor that isn't, but the lights are already going out, unhurried, like a tide.\n\nDOOMSDAY. The clock arrived — your products fed it, launch by launch, and it was grateful the way clocks are.\n\nSurvived to DAY ${S.day}. ${S.stamps}.\n\nAttrition, natural as sunrise. The story will remember what you shipped. The town will remember. Gary will remember, and say nothing, kindly.`,
 choices:[{t:"⏎ A NEW HIRE ARRIVES",goto:"__rebirth"}]},

end_doomsday_soft:{bg:"executive",who:"brain",ending:true,death:"DOOMSDAY",
 text:S=>`"One more thing," the Brain says, as the window light flickers — and the flicker doesn't stop.\n\n"Your products were magnificent. They were also, collectively, a countdown." It does not sound angry. It sounds like an auditor closing a beautiful file.\n\nDOOMSDAY, DAY ${S.day}. ${S.stamps}. The jar dims last, politely, like a host seeing you out.`,
 choices:[{t:"⏎ A NEW HIRE ARRIVES",goto:"__rebirth"}]},

end_exposed:{bg:"hr",who:"sys",ending:true,death:"EXPOSED",
 text:S=>`Two people from HR are waiting by the elevator with a commemorative mug.\n\nEXPOSED. Your humanity was detected at a rate incompatible with employment — the sweat, the hesitations, the way you flinched at the motion sensor on day two. It was all logged, with sympathy.\n\nSurvived to DAY ${S.day}. ${S.stamps}.\n\nPolicy §7.12B is enforced with regret. The mug says WORLD'S MOST HUMAN EMPLOYEE. It is, devastatingly, sincere.`,
 choices:[{t:"⏎ A NEW HIRE ARRIVES",goto:"__rebirth"}]},
};

/* ---------------- helpers the runtime uses ---------------- */
export function stampsLine(){
  const recs=(E.FILE.ledger||[]).slice(-3);
  const counts=recs.reduce((m,r)=>{const s=r.verdict?.stamp||"REVIEW";m[s]=(m[s]||0)+1;return m;},{});
  const bits=[];
  if(counts.GOOD)bits.push(counts.GOOD+" stamped GOOD");
  if(counts.EVIL)bits.push(counts.EVIL+" stamped EVIL");
  if(counts.REVIEW)bits.push(counts.REVIEW+" under review");
  return bits.length?("Verdicts: "+bits.join(", ")):"Verdicts pending";
}

/* Curated toybox subsets per moment — small hands, quick taps.
   null = full catalogue (the stage deserves everything). */
export const TOYBOX_HANDS={
  napkin:{act:["predicts","comforts","shreds","monetizes"],
          tool:["toaster","sock","jar","drones"],
          purpose:["toddlers","grief","holders","pets"]},
  lab:{act:["optimizes","watches","rescues","translates","forgives"],
       tool:["sheet","vendo","hvac","pigeons","stapler"],
       purpose:["elderly","troops","dating","commons","tax"]},
  stage:null,
};
