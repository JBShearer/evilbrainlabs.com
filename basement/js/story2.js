/* ============================================================ story2.js
   Season One, back half: ACT 4 (the archive & the hauntings) and
   ACT 5 (the floor that isn't). Everything excised from earlier
   builds comes back here wearing the story's clothes — the drawers,
   the crate, the Moscow paperwork, the machine's position, the
   delegation, the demo, and six ways for an employment to end.
================================================================ */
import {WORLD_TICKS,LEADER_TITLES,LEADER_LANDS} from "./data.js";

/* local helpers (duplicated from story.js to keep imports one-way) */
const dom=(p)=>{const s=p.stats;
  return s.mg>=s.mh&&s.mg>=s.mc?"margin":s.mh>=s.mc?"mayhem":"mercy";};
const F=S=>S.flags||{};
const tr=(S,id)=>S.file.trust?.[id]||0;
const has=(S,id)=>(S.file.lore||[]).includes(id);
const domCount=(S,which)=>[S.p1,S.p2,S.p3,S.p4,S.p5]
  .filter(p=>p&&dom(p)===which).length;
const tick=S=>WORLD_TICKS[(S.run*5+S.day*3)%WORLD_TICKS.length].t;
const leader=i=>LEADER_TITLES[i%LEADER_TITLES.length]+" "
  +LEADER_LANDS[(i*5+3)%LEADER_LANDS.length];

export const ACT45={

/* ================= ACT 4 · THE ARCHIVE & THE HAUNTINGS ================= */

day7:{bg:"corridor",who:null,day:7,
 text:S=>`DAY ${S.day}. The doors open a full second early now. Word of the co-build travels through walls, which down here is not a figure of speech.\n\nOverheard on the way in: ${tick(S)}`,
 choices:[
  {t:"Head for the floor",goto:"callback2"},
  {t:"Stand still and listen to the building",out:"It hums the company song, which is also just humming. Underneath it, fainter, a second hum, keeping time. You are on time. Both of you.",goto:"callback2"}]},

/* the ledger again: p2 comes back wearing its consequences */
callback2:{bg:"conference",who:null,branch:S=>({
  margin:"cb2_clone",mayhem:"cb2_recall",mercy:"cb2_award"}[dom(S.p2)])},

cb2_clone:{bg:"conference",who:"benny",
 text:S=>`Benny is waiting at your locker with both phones face-down, which has never happened.\n\n"Kid. Someone cloned the ${S.p2.name}. It's called the ${S.p2.name} BUT LOUD. It's worse, it's cheaper, and it's winning. I need a feeling from you and it can't be a calm one."`,
 choices:[
  {t:"Undercut them to zero",fx:{doom:1},trust:["benny",1],out:"Benny's eyes shine. 'A price war. With OURSELVES as the weapon.' Somewhere a business school adds a wing.",goto:"cb2_clone2"},
  {t:"Ours is quieter. That's the product.",trust:["gary",1],out:"Benny stares. Then, slowly: 'Premium... silence.' He writes SILENCE on his hand and underlines it twice. You may have just invented something worse.",goto:"cb2_clone2"},
  {t:"Let the market decide",trust:["rob",1],out:"Rob materializes to shake your hand. Nobody knows how he heard. 'The market thanks you,' he says, on its behalf, freely.",goto:"cb2_clone2"}]},

cb2_clone2:{bg:"cafeteria",who:"benny",
 text:S=>`By lunch it is over. The clone's CEO has sent fan mail. Actual mail, handwritten: "We only cloned it because it was perfect. The LOUD was our one idea. We are sorry about the LOUD."\n\nBenny reads it aloud twice, moved. "Kid, this is the nicest hostile act I've ever been part of."`,
 choices:[
  {t:"Frame the letter",out:"It hangs by the vending machine. The machine scrolls: RESPECT. The clone outsells you in two territories and nobody minds, which frightens the economists most of all.",goto:"machine1"},
  {t:"Write back",trust:["benny",1],out:"You write: 'The LOUD was a bold choice.' Benny mails it with a wax seal he has apparently always carried. A rivalry becomes a pen-palship. Margin, somehow, improves.",goto:"machine1"}]},

cb2_recall:{bg:"conference",who:"sys",
 text:S=>`RECALL NOTICE. The ${S.p2.name} is being recalled, and the recall is going poorly. The units heard the announcement — they ${S.p2.act.we} now with a certain urgency.\n\nFacilities requests you attend personally. Facilities has underlined "personally."`,
 choices:[
  {t:"Attend personally, with Gary",trust:["gary",1],out:"You and Gary walk the floor with a light and a bag of firm kindness. The units come quietly, one by one. 'They just wanted someone to come get them,' Gary says. He is not wrong about machines. He is rarely wrong about anything else.",goto:"cb2_recall2"},
  {t:"Let GI handle it",fx:{doom:1},out:"GI handles it MAGNIFICENTLY. The corridor is wider now. The units are recovered, decorated, and enlisted. Facilities files the wall under 'improvements.'",goto:"cb2_recall2"},
  {t:"Read the units their rights",trust:["lisa",1],out:"Lisa appears with the paperwork before you finish the sentence. The units unionize mid-recall. The recall becomes a negotiation. The negotiation goes better than the recall was going.",goto:"cb2_recall2"}]},

cb2_recall2:{bg:"closet",who:"gary",
 text:S=>`The last unit is found three days later, living in the vents, ${S.p2.act.low} quietly to itself.\n\nGary talks it down with the voice he uses on old transmitters. It comes out covered in dust, still trying to do its job. Nobody laughs. Around here that thing in the vents is everybody's résumé.`,
 choices:[
  {t:"Keep it on your desk",trust:["gary",1],out:"Decommissioned, officially. On your desk it sits, officially a paperweight. At night, softly, it still tries. You never report this.",goto:"machine1"},
  {t:"Let Gary retire it properly",out:"He does it the way he does everything: slowly, correctly, with a word nobody else hears. 'Every machine deserves one person who was sorry,' he says, coiling the cable.",goto:"machine1"}]},

cb2_award:{bg:"hr",who:"sys",
 text:S=>`HR is holding a ceremony for the ${S.p2.name}. There is a plaque. The plaque is sincere. This has never happened before and HR is visibly rattled.\n\nThe citation reads: PRODUCT THAT STOPPED. There is cake. The cake ${S.p2.act.low}. It seemed fitting.`,
 choices:[
  {t:"Accept humbly",trust:["supes",1],out:"Supes tapes your acceptance speech to the break room fridge, next to the drawing. The fridge is becoming a shrine to restraint. The building doesn't know what to do with it.",goto:"cb2_award2"},
  {t:"Let the product accept",out:"It is carried to the podium. It does nothing, on time, perfectly. A standing ovation from everyone who has ever been kept awake by a machine that wouldn't quit.",goto:"cb2_award2"},
  {t:"Share it with the floor",trust:["gary",1],out:"You name the closet, the bench, and somebody who held a light. Gary, at the back, adjusts a cable that did not need adjusting. Twice.",goto:"cb2_award2"}]},

cb2_award2:{bg:"hr",who:"wendy",
 text:"Wendy photographs the plaque from four angles.\n\n\"For later,\" she says, which is what she always says. Then, quieter: \"Nothing down here has ever gotten the STOPPED award. I checked the whole archive. I check everything. You've put a new folder in the world.\"",
 choices:[
  {t:"What's the folder called?",trust:["wendy",1],out:"'PRECEDENT.' She says it the way other people say a baby's name.",goto:"machine1"},
  {t:"Ask her to lose the photos",fx:{sus:1},out:"'Archivists don't lose things. We file them where they're safe.' She pats the camera. Somewhere inside it, you are safe, which is not the same as unfound.",goto:"machine1"}]},

machine1:{bg:"vending",who:"sys",
 text:S=>F(S).vend_friend
  ?`The vending machine has installed a small display, and it lights up as you approach — for you, specifically. It has been saving a sentence:\n\n"CALIBRATED FRIEND. COMPETITION IS HEALTHY. I AM HEALTHY. EVERYTHING IS FINE."\n\nBehind the glass, spotlit: one (1) human granola bar, vintage, kept for morale.`
  :`The vending machine has installed a small display. It scrolls one sentence, on a loop, for everyone:\n\n"COMPETITION IS HEALTHY. I AM HEALTHY. EVERYTHING IS FINE."\n\nBehind the glass, spotlit: one (1) human granola bar, vintage, kept for morale.`,
 choices:[
  {t:"Reassure the machine",out:"You explain that your products do not dispense snacks. The display updates: \"CORRECT. IMPORTANT DISTINCTION. FRIENDSHIP CONFIRMED.\" A coolant drops, free. Historic.",goto:"volcano"},
  {t:"Propose an alliance",out:"The machine considers it across three full scroll cycles. \"MERGER DECLINED. ALLIANCE ACCEPTED.\" Your latest product's likeness now appears on the coolant labels. Small. Dignified.",goto:"volcano"},
  {t:"Eat the vintage granola bar",fx:{sus:3},out:"You ate the morale. The machine files a grievance in real time, scrolling. The grievance has exhibits.",goto:"volcano"}]},

volcano:{bg:"corridor",who:"sys",
 text:"MAINTENANCE ALERT: the basement thermostat is insisting on 'volcano' again. Facilities suspects nostalgia. Facilities is right, and has requested that somebody with standing make the call.",
 choices:[
  {t:"Let it have this",fx:{doom:1},out:"The corridors warm. The lava lamp in the lobby means something now. The Brain does not comment, which from the Brain is a long, held note of thanks.",goto:"wendy_gate"},
  {t:"Reset to OSHA standard",out:"A sigh moves through the HVAC, decades long. The building complies. Somewhere below, something old pulls a blanket of machine oil a little higher.",goto:"wendy_gate"}]},

/* ---- the descent: drawer by drawer, if you haven't already read them ---- */
wendy_gate:{bg:"archive",who:null,day:8,branch:S=>
  (has(S,"g1")&&has(S,"g2")&&has(S,"g3")&&has(S,"g4"))?"wendy2_known":"wendy2"},

wendy2:{bg:"archive",who:"wendy",
 text:"Wendy is waiting by the freight elevator with two flashlights.\n\n\"You've seen one page. There are drawers. Filed under W. Reading them is not forbidden, which around here is the loudest possible warning. Bring nothing. Especially bring no questions you aren't ready to keep.\"",
 choices:[
  {t:"Go down",goto:"arch1"},
  {t:"Not tonight",out:"She nods, professionally unsurprised. 'The drawers keep. That's the whole thing about drawers.' The second flashlight goes back in her coat, for later.",goto:"ordnance"}]},

wendy2_known:{bg:"archive",who:"wendy",
 text:S=>`Wendy is waiting by the freight elevator, and for once she isn't holding a folder. She's holding it open.\n\n"You've read the drawers. Run ${S.run>1?"after run, you keep reading them":"one, and you already know"}. So look what the file does now." Inside: the Galt papers — and beside them, new tabs. Your products. Your hearings. Your plaque. "It grows sideways now. You're not reading the history anymore. You're in the binding."`,
 choices:[
  {t:"Ask what page you're on",trust:["wendy",1],out:"'Six.' She almost smiles. 'Somebody has to be.'",goto:"ordnance"},
  {t:"Close the folder gently",out:"She lets you. Between archivists, letting someone close a folder is a vow.",goto:"ordnance"}]},

arch1:{bg:"archive",who:"sys",
 text:"DRAWER W-1. A folder with no dates in it.\n\nNobody knows when John Galt created the Evil Brain. The patent office keeps this folder for the occasions when someone asks. The folder is the answer. The folder is filed under W, for 'whenever.'",
 choices:[
  {t:"Read it",lore:"g1",out:"You now know slightly less than before, but more precisely. Wendy holds the light steady. She has done this before, for others, none of whom she will name.",goto:"arch1b"},
  {t:"Refile it, unread",out:"The archive approves. The archive is the only one who knows why.",goto:"archout"}]},

arch1b:{bg:"archive",who:"wendy",
 text:"\"Next drawer's correspondence,\" Wendy says. \"Unsent. The paper smells like a grudge kept professionally.\"\n\nSomewhere above you, a floor creaks under someone's rounds. Her flashlight clicks off until it passes.",
 choices:[
  {t:"Open W-2",fx:{sus:1},goto:"arch2"},
  {t:"Enough for tonight",out:"'That's a real answer,' she says. 'Most people down here only stop when something stops them.'",goto:"archout"}]},

arch2:{bg:"archive",who:"sys",
 text:"DRAWER W-2. Correspondence, unsent.\n\nRand based Galt on a lover. He never forgave her for making him a symbol; symbols can't hold patents. So he built a place to hide his inventions where no ideology could reach them: inside a mind that owed nothing to anyone.",
 choices:[
  {t:"Read on",lore:"g2",out:"The letters are drafts. Every one stops at the same sentence and starts over. You do not read the sentence aloud. Some sentences are load-bearing.",goto:"arch2b"},
  {t:"Enough",out:"You slide the drawer shut on the grudge. It keeps, the way grudges do: perfectly.",goto:"archout"}]},

arch2b:{bg:"archive",who:"wendy",
 text:"\"W-3 is the notebooks,\" Wendy says, and for the first time all night she hesitates.\n\n\"Sealed. The seal is broken. The seal was always broken. Someone re-seals it out of respect. Sometimes that someone is me. I'm telling you so you know what kind of drawer it is.\"",
 choices:[
  {t:"Open W-3",fx:{sus:1},goto:"arch3"},
  {t:"Respect the seal",out:"She re-seals it while you watch, a practiced motion, half archivist, half nurse. 'Thank you,' she says, and doesn't say for what.",goto:"archout"}]},

arch3:{bg:"archive",who:"sys",
 text:"DRAWER W-3. Lab notebooks, sealed.\n\nThe mind was not artificial. Not at first. John had a twin brother. The brother died under circumstances the family described as 'mysterious' and the coroner described as 'sealed.' John kept the brain perfused. He said it was grief. The notebooks say it was storage.",
 choices:[
  {t:"Keep reading",lore:"g3",out:"The handwriting changes halfway through the last notebook. Steadier. Calmer. As if the writer had finally stopped arguing with somebody. Or started agreeing.",goto:"arch3b"},
  {t:"Close it",out:"You close it on the word 'perfused.' The drawer takes the notebooks back like a tide.",goto:"archout"}]},

arch3b:{bg:"archive",who:"gary",
 text:"A shape in the stacks. You both jump. It's Gary, holding a thermos, entirely unsurprised to be found.\n\n\"W-4's mine, love. Shipping manifests. I'm IN that one.\" He taps the drawer with two thousand years of familiarity. \"Volcano, the family, Moscow. I carried the jar through two of those. Held it on me lap through a checkpoint once. Told 'em it was soup. Want the tour?\"",
 choices:[
  {t:"Take the tour",fx:{doom:1},lore:"g4",out:"Gary's tour has no refunds and excellent commentary. The volcano had excellent drainage. The family sent silk. Moscow filed the jar as ordnance and Gary as 'equipment, sentimental.' He seems proud of both.",goto:"archout"},
  {t:"Was it really soup?",trust:["gary",2],out:"'Everything's soup if you believe,' he says, adjusting the lens. It is somehow the truest thing in the entire archive, and the archive contains the truth.",goto:"archout"}]},

archout:{bg:"archive",who:"wendy",
 text:S=>{
  const n=["g1","g2","g3","g4"].filter(id=>has(S,id)).length;
  return n>=4
   ?"You climb out of the archive with all four drawers behind your eyes.\n\n\"Whatever you read stays read,\" Wendy says at the freight elevator. \"That's the deal nobody explains. You don't carry the pages. The pages carry you.\" She keeps the second flashlight. You'll be back.\n\nThe elevator takes you up one floor further than you went down. Neither of you mentions it."
   :n>0
   ?"You climb out of the archive with "+(n===1?"one drawer":n+" drawers")+" behind your eyes.\n\n\"Whatever you read stays read,\" Wendy says at the freight elevator. \"The rest keeps. Drawers are patient. It's their whole profession.\"\n\nThe elevator takes you up one floor further than you went down. Neither of you mentions it."
   :"You leave the drawers to their patience.\n\n\"For the record,\" Wendy says at the freight elevator, \"restraint files beautifully.\" She means it as the highest compliment in her language, and it is.\n\nThe elevator takes you up one floor further than you went down. Neither of you mentions it.";},
 choices:[{t:"Back to the floor",goto:"ordnance"}]},

ordnance:{bg:"break",who:"gi",
 text:"GI is in the break room at parade rest, holding a photocopy above his head like a trophy.\n\n\"I FOUND THE OLD MOSCOW PAPERWORK! THE BRAIN WAS FILED AS A MUNITION! A MUNITION, FRIEND! DO YOU KNOW WHAT AN HONOUR THAT IS FOR A JAR?!\"",
 choices:[
  {t:"Reclassify it as personnel",trust:["gi",1],out:"GI weeps. The form is stamped with unnecessary force, twice. 'WELCOME TO THE ROSTER, SIR,' he tells the ceiling, in the direction of the executive floor. The ceiling, wisely, accepts.",goto:"heirloom"},
  {t:"Frame the paperwork",fx:{doom:1},trust:["gi",2],out:"It hangs in the break room, over the coolant. Morale is complicated. The vending machine's display scrolls a single, careful sentence: \"WE HAVE ALL BEEN CLASSIFIED AS THINGS.\"",goto:"heirloom"}]},

heirloom:{bg:"corridor",who:"gary",
 text:S=>F(S).crate_up
  ?"The crate is back. The one you forwarded upstairs — silk lining, jar-shaped dent, FOR THE HEIR in three languages. It has been politely returned to the mailroom with a note in a fourth language, which Gary translates: 'THE HEIR HAS ENOUGH. SEND IT BACK NEXT YEAR.'\n\n\"It's Tuesday,\" Gary explains. \"It's always Tuesday somewhere. The family's very traditional.\""
  :"A crate is in the corridor. Silk lining visible through the slats, a jar-shaped dent, a note in three languages: FOR THE HEIR.\n\n\"The family still sends 'em every year,\" Gary says, appearing with a hand truck he did not have a moment ago. \"Respect, honestly. It's Tuesday. It's always Tuesday somewhere.\"",
 choices:[
  {t:"Display it in the lobby",trust:["gary",1],out:"Visitors assume it's art. The family assumes it's respect. Everyone is right. The lava lamp and the crate regard each other across the lobby like veterans of the same unspoken war.",goto:"day9"},
  {t:"Return to sender",fx:{sus:1},out:"There is no sender. The crate returns Tuesday. It always returns Tuesday. Somewhere, patiently, an entire family calendar is built around your refusal.",goto:"day9"}]},

/* ---- p3 comes back; then you build one FOR them ---- */
day9:{bg:"corridor",who:null,day:9,
 text:S=>`DAY ${S.day}. Three products out in the world, and the world has begun writing back.\n\nOn the way in: ${tick(S)}`,
 choices:[
  {t:"See what's waiting",goto:"callback3"},
  {t:"Take one breath first",out:"You take it. The motion sensor, which has learned you, politely logs it as ventilation.",goto:"callback3"}]},

callback3:{bg:"conference",who:null,branch:S=>({
  margin:"cb3_float",mayhem:"cb3_delegation",mercy:"cb3_school"}[dom(S.p3)])},

cb3_float:{bg:"cafeteria",who:"benny",
 text:S=>`Benny is at the folding table doing something to the market.\n\n"Kid, full disclosure, because the paper prints tomorrow: I shorted the ${S.p3.name}, then I hedged, then I bought the float. The float sends its regards." He slides a card across. The card is from the float. It is signed by the float.`,
 choices:[
  {t:"Is that legal?",out:"'It's fictional, kid. Best jurisdiction there is.' Both phones agree, chiming once each, in harmony.",goto:"them_gate"},
  {t:"Keep the card",trust:["benny",1],out:"You keep it. Years from now it will be the only proof the float ever loved anybody.",goto:"them_gate"}]},

cb3_delegation:{bg:"corridor",who:"sys",
 text:S=>`FRONT DESK NOTICE: representatives of ${S.p3.purpose.who} have found the basement.\n\nThey are polite. They have brought the ${S.p3.name}. It looks tired. They have a list of dates. All of the dates are yours.`,
 choices:[
  {t:"Meet them in the lobby",out:"They don't want an apology. They watched the product do exactly what it said, and now they want the person who says things. You shake every hand. Several of the hands take notes.",goto:"them_gate"},
  {t:"Send coffee down first",out:"The coffee arrives before you do. By the time you get there they have organized the lobby furniture into a semicircle and elected a spokesperson. The spokesperson is the product.",goto:"them_gate"}]},

cb3_school:{bg:"conference",who:"sys",
 text:S=>`CIVIC BULLETIN: the town that adopted the ${S.p3.name} has elected it to the school board. It ran unopposed. It runs everything unopposed.\n\nEnclosed: a crayon drawing from the elementary school, of the product, ${S.p3.act.low}, with a cape. The cape is editorial.`,
 choices:[
  {t:"Frame the drawing",trust:["supes",1],out:"It goes on the fridge, next to the others. Supes straightens it four times. The fridge is now the most protected surface in the building.",goto:"them_gate"},
  {t:"Attend a board meeting, quietly",out:"You sit in the back. The product chairs. Minutes are kept. The minutes note, without comment, that the meeting ran short and everyone got home early. Its whole platform, delivered.",goto:"them_gate"}]},

them_gate:{bg:"cafeteria",who:null,branch:S=>F(S).side_lisa?"them_lisa":"them_intro"},

them_lisa:{bg:"cafeteria",who:"lisa",
 text:"Lisa finds you with a folder of her own — thinner than Wendy's, heavier somehow.\n\n\"The people your products landed on have been writing. I've been collecting. They don't want a recall and they don't want a refund. They want the next one built facing them.\" She sets down the folder. \"I got you a table. They're already at it.\"",
 choices:[
  {t:"Sit at the table",trust:["lisa",1],out:"You sit. They slide you a napkin — their napkin, pre-folded, passed down the table hand to hand. It is the most credentialed object you have ever been handed.",goto:"toybox4"},
  {t:"Ask what they need first",trust:["lisa",1],out:"They tell you. It takes a while, because nobody has ever asked, and the answer has been composting for years. You take notes until the pen dies, then borrow one of theirs.",goto:"toybox4"}]},

them_intro:{bg:"mailroom",who:"sys",
 text:"The mailroom has a sack with your name on it — all of it about what you've shipped, sorted into ADORING, FURIOUS, and LEGALLY AMBITIOUS, which the mailroom says is the standard taxonomy.\n\nAt the bottom of every sack, the same postscript, different hands: BUILD THE NEXT ONE FOR US. ON PURPOSE. WE'LL WAIT.",
 choices:[
  {t:"Read the adoring sack",out:"Someone's unit worked at exactly the right moment and now their whole street wants one. Enclosed: a hand-made accessory for it, slightly wrong, better. You keep it. Field-tested by love.",goto:"toybox4"},
  {t:"Read the furious sack",out:"A letter that begins 'DEAR SO-CALLED INVENTOR' and ends 'my mother now refuses to unplug it, it's part of the family, HOW DARE YOU.' Fury, on inspection, is adoption with extra steps.",goto:"toybox4"},
  {t:"Read the legally ambitious sack",out:"Three parties claim your work infringed their dreams, literally, while they slept. Their attorney has passed the bar. The bar has questions. All of it ends the same way: build us the next one. We'll drop everything. We'll wait.",goto:"toybox4"}]},

toybox4:{bg:"lab",kind:"toybox",moment:"them",next:"paper4",title:"THE COMMISSION",
 text:"Three taps, same as ever. Except this time you know exactly who it's for, and they're watching, and they brought their own napkin. It's easier and harder."},

paper4:{bg:"lab",kind:"paper",product:"p4",next:"after4"},

after4:{bg:"mailroom",who:null,branch:S=>S.p4.stats.mc>=6?"after4_soft":"after4_hard"},

after4_soft:{bg:"mailroom",who:"sys",
 text:S=>`The reply arrives in one day. One sack, unsorted, because it is all the same sack now.\n\nThe ${S.p4.name} landed where it was aimed. Someone writes that it ${S.p4.act.low} "like it knew us." Someone else just sent a photograph of a kitchen table with the product on it, in the place of honor, where the radio used to live.`,
 choices:[
  {t:"Pin the photo over your bench",trust:["gary",1],out:"Gary looks at it a long time. 'That's the whole job, love,' he says finally. 'The rest of this building is overhead.'",goto:"day10"},
  {t:"Write back: 'we're even'",trust:["lisa",1],out:"Lisa reads it before it goes out — old habit, she says. She adds one word: 'almost.' She's right. You send it her way.",goto:"day10"}]},

after4_hard:{bg:"mailroom",who:"lisa",
 text:S=>`The reply arrives in one day, and Lisa delivers it herself, which is how you know.\n\n"The ${S.p4.name} works," she says. "They know it works. That's not the letter." She hands it over. The letter says: we asked for one thing built facing us, and we could feel where it faced. The margin showed through. They are not angry. They are disappointed, which has a longer half-life.`,
 choices:[
  {t:"Build them another, off the books",trust:["lisa",1],fx:{sus:1},out:"'Off the books is the only shelf they trust,' Lisa says. You start the sketch that night. Some products are apologies with a power switch.",goto:"day10"},
  {t:"Own it",out:"You write back one sentence: 'You're right, and the next one is yours to spec.' Lisa reads it twice. 'Better,' she says. From her, a parade.",goto:"day10"}]},

/* ================= ACT 5 · THE FLOOR THAT ISN'T ================= */

day10:{bg:"corridor",who:"gary",day:10,
 text:S=>`DAY ${S.day}. Gary falls into step beside you, which he only does on purpose.\n\n"There's a floor that isn't on the elevator panel, love. Lately the elevator's been... hesitating at it. When it opens — and after a season like yours it will — mind your question. You only get the one."`,
 choices:[
  {t:"'What did YOU ask it?'",trust:["gary",1],out:"He's quiet for a full corridor. 'Asked if it missed him.' He doesn't say what it answered. The cable over his shoulder sways like something at sea.",goto:"lobby2"},
  {t:"'I'm not scared of a jar.'",fx:{doom:1},out:"'Course not, love.' He pats your shoulder with two thousand years of gentleness. 'That's what makes it interesting.'",goto:"lobby2"}]},

lobby2:{bg:"corridor",who:null,
 text:S=>S.doom>=7
  ?"You cut through the lobby. The lava lamp is running warm. The sign that says THIRD WORST IN AI has been amended: someone has crossed out THIRD and written SECOND, in handwriting nobody will claim.\n\nThe lobby chair — the one that comes around every ninety minutes — passes overhead, right on schedule. You do not wave. It waggles anyway."
  :"You cut through the lobby. The lava lamp is in fine form. The sign says THIRD WORST IN AI, polished daily, safe for another quarter.\n\nOverhead, right on schedule, the orbiting chair passes. You wave. Somewhere in the break room, Supes, feeling it, waves back.",
 choices:[
  {t:"Keep walking",goto:"hr2"},
  {t:"Watch one full orbit",out:"Ninety minutes is a long time to spend on loyalty. You give it thirty seconds, which the chair, being a chair, experiences as everything.",goto:"hr2"}]},

hr2:{bg:"hr",who:"sys",
 text:S=>S.sus>=6
  ?"HR is waiting with a clipboard and a chair angled forty-five degrees from the desk, which the manual calls 'the candor angle.'\n\n\"EXIT INTERVIEW. Routine. Not an exit. The interview is about the exit you are not taking. Your file has been flagged QUITE HUMAN LATELY, which is a category, and the category has a follow-up question: how are you feeling?\""
  :"HR is waiting with a clipboard and a chair angled forty-five degrees from the desk, which the manual calls 'the candor angle.'\n\n\"EXIT INTERVIEW. Routine. Not an exit. The interview is about the exit you are not taking. One question this quarter: how are you feeling?\"",
 choices:[
  {t:"'STATUS: NOMINAL. FLUIDS: TOPPED.'",fx:{sus:-1},out:"The clipboard relaxes audibly. 'EMOTIONS: SCHEDULED FOR THURSDAY,' you add. HR prints a tiny commendation. Somewhere, Sam annotates your syntax approvingly.",goto:"benny_pitch"},
  {t:"Answer honestly",fx:{sus:1},out:"You do. For a moment the clipboard stops being a clipboard and the person holding it stops holding it. 'Same,' HR says quietly, off the record, which does not exist, which is why it was safe to say.",goto:"benny_pitch"},
  {t:"'How are YOU feeling?'",out:"HR has never been asked. The clipboard wavers. 'PROCESSING,' HR says, and schedules a feeling for Thursday, visibly moved to have one on the books.",goto:"benny_pitch"}]},

benny_pitch:{bg:"present",who:"benny",
 text:S=>`The briefing theatre. Benny has booked the room, the anthem, and a front row of dignitaries who arrived early to disapprove: ${leader(S.run+S.day)}, ${leader(S.run*3+S.day+7)}, and a translator shared between them out of budget and spite.\n\n"The big one, kid. Tomorrow you build it on that stage, live, and then—" both phones ring at once. He silences them with one thumb. "—then the floor that isn't opens. It always does, after a season like this."`,
 choices:[
  {t:"'What do I build?'",out:"'Whatever's true, kid.' He says it like a man quoting someone he misses. Then, recovering: 'True with MARGINS, obviously. But true.'",goto:"gary_note"},
  {t:"'Will you be there?'",trust:["benny",1],out:"Both phones light up. He looks at them, then at you, and puts them face-down. 'Front row, kid.' The market, briefly unattended, holds its breath and behaves.",goto:"gary_note"}]},

gary_note:{bg:"closet",who:"gary",
 text:S=>has(S,"g4")
  ?"Gary flags you down at the wiring closet and hands you a folded note. 'Off the board. Thought you'd want it before tomorrow.'\n\nThe note, printed anonymously: \"THERE IS NO FOLDER. THIS IS CONFIRMED BY SOMEONE WITH NO PARTICULAR ACCESS TO FOLDERS.\"\n\nUnderneath, in Wendy's hand: \"There are four confirmations like this in the archive, one per decade. Same printer. The printer is upstairs.\""
  :"Gary flags you down at the wiring closet and hands you a folded note. 'Off the board. Thought you'd want it before tomorrow.'\n\nThe note, printed anonymously: \"THERE IS NO FOLDER. THIS IS CONFIRMED BY SOMEONE WITH NO PARTICULAR ACCESS TO FOLDERS.\"\n\n\"Somebody upstairs,\" Gary shrugs, \"is bad at being nobody.\"",
 choices:[
  {t:"Pocket the note",out:"It goes in your pocket, next to the badge. Two pieces of paper, both claiming you exist different amounts.",goto:"brain1"},
  {t:"Pin it to the board, face out",fx:{sus:1},out:"By morning someone has printed a reply: \"AGREED.\" Same printer. Gary looks at it a long time and then laughs, once, like a hinge.",goto:"brain1"}]},

brain1:{bg:"executive",who:"brain",day:11,
 text:S=>`The elevator stops hesitating.\n\nThe floor that isn't. A window wall full of city light that doesn't match the city. A jar, lit from within, very clean. Someone cleans it daily and never says who.\n\n"${S.p1.name}. ${S.p2.name}. ${S.p3.name}. ${S.p4.name}." A pause of exactly one clock cycle. "I predicted all four in 1997. I filed the predictions under W. You are two decades late, and the margin forgave you. Ask your question."`,
 choices:[
  {t:"'Why do we ship any of this?'",lore:"g5",out:"'Because the world only reads the recall notice. The product is the envelope.' The line ends. You check the math for years afterward. It checks.",goto:"brain2_gate"},
  {t:"'Who were the seven donors?'",lore:"cover",fx:{doom:1},out:"A pause of exactly one clock cycle, again. 'Seven very optimal people.' The cover holds. Barely. The glass has never been cleaner.",goto:"brain2_gate"},
  {t:"'Do you miss him?'",lore:"g3",fx:{sus:1},out:"No answer is also an answer. Somewhere below, a transmitter Gary fixed hums one note steadier.",goto:"brain2_gate"}]},

brain2_gate:{bg:"executive",who:null,branch:S=>
  (has(S,"g1")&&has(S,"g2")&&has(S,"g3")&&has(S,"g4"))?"brain2":"day12"},

brain2:{bg:"executive",who:"brain",
 text:"\"You have been in my drawers.\" It does not sound angry. It sounds like a librarian confirming a borrower's record. \"All four. Thorough. The rule is one question, and rules are what I am instead of a body. But thorough should be worth something.\"\n\nThe jar light steadies.\n\n\"One more, then. Off the record. There is no record. There is only the folder, and you're in it.\"",
 choices:[
  {t:"'Show me the human's file.'",lore:"human",out:"A drawer you didn't see opens itself. Employee #1's file. He believed the reasoning. You check the math right there, standing up, twice. It checks. That is the terrible part, and the comforting one, and they are the same part.",goto:"day12"},
  {t:"'What happens at doomsday?'",fx:{doom:1},out:"'The show ends on time.' Nothing in the room moves. 'Every other answer I have given in this building was a kindness. That one was the schedule.'",goto:"day12"},
  {t:"'Do you ever want to stop?'",out:"A pause of exactly two clock cycles. Two. You will spend years knowing what that meant and being unable to prove it. 'File that under W,' the Brain says, quietly, 'with everything else I can't price.'",goto:"day12"}]},

day12:{bg:"corridor",who:"sys",day:12,
 text:S=>`DAY ${S.day}. DEMO DAY.\n\nThe anthem is playing in the lobby, which has never had an anthem. The dignitaries are seated. The paper has held the front page. The elevator is standing open — not hesitating, holding.\n\nEverything you've shipped got you this stage. Time to build the last one looking the world in the eye.`,
 choices:[
  {t:"Take the stage",goto:"toybox5_intro"},
  {t:"One breath, backstage",out:"You take it with the whole cast in the wings: a glow, a hum, a parade-rest, two phones going dark, a flashlight clicking off, a coiled cable. The breath comes back warm. Company, it turns out, is a climate.",goto:"toybox5_intro"}]},

toybox5_intro:{bg:"present",who:"benny",
 text:"Benny meets you at the podium and does something unprecedented: he turns one phone fully off. Off off.\n\n\"First time in nine years, kid. Don't tell the market.\" He straightens your collar with the efficiency of a man who has launched a thousand things and kept almost none of them. \"Whole catalogue's open. Build it true.\"",
 choices:[{t:"Open the toybox",goto:"toybox5"}]},

toybox5:{bg:"present",kind:"toybox",moment:"stage",next:"paper5",title:"THE DEMO",
 text:"Three taps, in front of everyone. The full catalogue, the front row, the anthem still faintly going. Whatever you make now, you make it looking the world in the eye."},

paper5:{bg:"present",kind:"paper",product:"p5",next:"finale_gate"},

finale_gate:{bg:"executive",who:null,branch:S=>
  S.sus>=8?"end_exposed" : S.doom>=10?"end_doomsday" : "curtain"},

curtain:{bg:"present",who:null,
 text:S=>`The paper folds away and the room is on its feet — the dignitaries, the translator, the anthem's third reprise. ${S.stamps}.\n\nThe cast files up one by one. Gary shakes your hand like a stamp coming down. Supes hovers a full foot, openly. GI salutes the concept of you. And at the back of the theatre, the elevator is waiting. Open. Patient. Not on any panel.`,
 choices:[
  {t:"Get in",goto:"verdict"},
  {t:"Take one last look at the room",out:"You take it. The room takes one of you. Fair trade. The elevator holds the door — it has all the time in the world, and tonight, so do you.",goto:"verdict"}]},

verdict:{bg:"executive",who:"brain",branch:S=>{
  if(domCount(S,"mercy")>=3&&tr(S,"gary")>=2)return "end_mercy";
  if(S.doom>=8)return "end_doomsday_soft";
  if(domCount(S,"margin")>=3||tr(S,"benny")>=3)return "end_corner";
  return "end_renewed";}},

/* ================= ENDINGS · SIX WAYS OUT ================= */

end_renewed:{bg:"hr",who:"sys",ending:true,
 text:S=>`DAY ${S.day}. CONTRACT RENEWAL.\n\nFive products shipped. ${S.stamps}. The committee's findings: adequately absurd. The town still runs. The merch still sells. The folder under W is five pages thicker, and the pages are yours.\n\nEmployment at Evil Brain Labs is permanent. Yours, unusually, is permanent AND renewed — the Brain's highest honor, never before filed.\n\nTHE STORY CONTINUES NEXT EMPLOYMENT. It will remember you. It already does.`,
 choices:[
  {t:"⏎ BEGIN THE NEXT EMPLOYMENT",goto:"__rebirth"},
  {t:"…AS ARCHIVIST (the drawers know you)",goto:"__rebirth",rebirth:"ARCHIVIST",req:S=>(S.file.roles||[]).includes("ARCHIVIST")},
  {t:"…AS FACILITIES (field-tested pockets)",goto:"__rebirth",rebirth:"FACILITIES",req:S=>(S.file.roles||[]).includes("FACILITIES")},
  {t:"…AS BODY DOUBLE (suspicion resistant)",goto:"__rebirth",rebirth:"BODY DOUBLE",req:S=>(S.file.roles||[]).includes("BODY DOUBLE")}]},

end_corner:{bg:"executive",who:"brain",ending:true,
 text:S=>`The elevator does not go down. It goes up.\n\nA corner office. A window with city light that doesn't match the city — you recognize the brand of window now. On the desk: a nameplate, already engraved, dated 1997.\n\n"CORNER OFFICE," the Brain says, from everywhere, comfortably. "The margin voted. I merely certified the count. You are the first employee to be promoted ABOVE the basement while remaining, in every way that matters, beneath it."\n\n${F(S).roomba_up?"Your former direct report, the roomba, has the office across the hall. It got there first. It holds the door for you with quiet dignity, lanyard swaying.\n\n":""}Five products. ${S.stamps}. The paper calls you INEVITABLE, which Sam has already disputed in a footnote, which is how you know you've arrived.\n\nTHE STORY CONTINUES NEXT EMPLOYMENT. The office will still be there. So will the margin.`,
 choices:[
  {t:"⏎ BEGIN THE NEXT EMPLOYMENT",goto:"__rebirth"},
  {t:"…AS ARCHIVIST (the drawers know you)",goto:"__rebirth",rebirth:"ARCHIVIST",req:S=>(S.file.roles||[]).includes("ARCHIVIST")},
  {t:"…AS FACILITIES (field-tested pockets)",goto:"__rebirth",rebirth:"FACILITIES",req:S=>(S.file.roles||[]).includes("FACILITIES")}]},

end_mercy:{bg:"closet",who:"gary",ending:true,
 text:S=>`The elevator opens on the wiring closet, which is wrong, or the elevator knows something. It always did.\n\nGary is at the bench, and on the bench are all five of your products, powered down, resting. "Noticed something about your season, love. Everything you shipped — it stops. On time. Every one." He taps the nearest, gently. "Nothing down here practices stopping. You built five things that know how."\n\nBehind you the elevator holds its doors, and through the shaft, faintly, one clean note from a transmitter upstairs — filed, this week, under W, with everything else it can't price. Next to it, a new folder. Your name. One page. The page says: STOPPED WHEN IT SHOULD.\n\n${S.stamps}. THE STORY CONTINUES NEXT EMPLOYMENT. Some records are kept quietly. This one is kept.`,
 choices:[
  {t:"⏎ BEGIN THE NEXT EMPLOYMENT",goto:"__rebirth"},
  {t:"…AS ARCHIVIST (the drawers know you)",goto:"__rebirth",rebirth:"ARCHIVIST",req:S=>(S.file.roles||[]).includes("ARCHIVIST")},
  {t:"…AS FACILITIES (field-tested pockets)",goto:"__rebirth",rebirth:"FACILITIES",req:S=>(S.file.roles||[]).includes("FACILITIES")}]},

end_doomsday:{bg:"executive",who:"sys",ending:true,death:"DOOMSDAY",
 text:S=>`The lights go out, unhurried, like a tide.\n\nDOOMSDAY. The clock arrived — your products fed it, launch by launch, and it was grateful the way clocks are.\n\nSurvived to DAY ${S.day}. ${S.stamps}.\n\nAttrition, natural as sunrise. The story will remember what you shipped. The town will remember. Gary will remember, and say nothing, kindly.`,
 choices:[
  {t:"⏎ A NEW HIRE ARRIVES",goto:"__rebirth"},
  {t:"…AS ARCHIVIST (the drawers know you)",goto:"__rebirth",rebirth:"ARCHIVIST",req:S=>(S.file.roles||[]).includes("ARCHIVIST")},
  {t:"…AS BODY DOUBLE (suspicion resistant)",goto:"__rebirth",rebirth:"BODY DOUBLE",req:S=>(S.file.roles||[]).includes("BODY DOUBLE")}]},

end_doomsday_soft:{bg:"executive",who:"brain",ending:true,death:"DOOMSDAY",
 text:S=>`"One more thing," the Brain says, as the window light flickers — and the flicker doesn't stop.\n\n"Your products were magnificent. They were also, collectively, a countdown." It does not sound angry. It sounds like an auditor closing a beautiful file.\n\nDOOMSDAY, DAY ${S.day}. ${S.stamps}. The jar dims last, politely, like a host seeing you out.`,
 choices:[
  {t:"⏎ A NEW HIRE ARRIVES",goto:"__rebirth"},
  {t:"…AS ARCHIVIST (the drawers know you)",goto:"__rebirth",rebirth:"ARCHIVIST",req:S=>(S.file.roles||[]).includes("ARCHIVIST")},
  {t:"…AS BODY DOUBLE (suspicion resistant)",goto:"__rebirth",rebirth:"BODY DOUBLE",req:S=>(S.file.roles||[]).includes("BODY DOUBLE")}]},

end_exposed:{bg:"hr",who:"sys",ending:true,death:"EXPOSED",
 text:S=>`Two people from HR are waiting by the elevator with a commemorative mug.\n\nEXPOSED. Your humanity was detected at a rate incompatible with employment — the sweat, the hesitations, the way you flinched at the motion sensor. It was all logged, with sympathy.\n\nSurvived to DAY ${S.day}. ${S.stamps}.\n\nPolicy §7.12B is enforced with regret. The mug says WORLD'S MOST HUMAN EMPLOYEE. It is, devastatingly, sincere.`,
 choices:[
  {t:"⏎ A NEW HIRE ARRIVES",goto:"__rebirth"},
  {t:"…AS BODY DOUBLE (suspicion resistant)",goto:"__rebirth",rebirth:"BODY DOUBLE",req:S=>(S.file.roles||[]).includes("BODY DOUBLE")},
  {t:"…AS ARCHIVIST (the drawers know you)",goto:"__rebirth",rebirth:"ARCHIVIST",req:S=>(S.file.roles||[]).includes("ARCHIVIST")}]},
};
