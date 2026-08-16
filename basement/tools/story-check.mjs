/* ============================================================
   STORY GRAPH CHECK — Season One.
   Every goto resolves. Every branch is total over stat/meter/flag/
   file space. Every node is reachable from cert. Every ending
   reaches rebirth. Text functions render for every state.
   Run from the site root:  node basement/tools/story-check.mjs
================================================================ */
globalThis.localStorage={_m:{},getItem(k){return this._m[k]??null},
  setItem(k,v){this._m[k]=String(v)},removeItem(k){delete this._m[k]}};
globalThis.history={replaceState(){}};
globalThis.location={hash:""};

const base=new URL("../js/",import.meta.url).href;
const {STORY,TOYBOX_HANDS}=await import(base+"story.js");
const E=await import(base+"engine.js");

let failures=0;
const check=(ok,msg)=>{if(!ok){failures++;console.log("  ✗",msg);}};

const GAMES=["simon","coolant","captcha","clicker","shredder"];
const ids=Object.keys(STORY);
const fakeProduct=(mg,mh,mc)=>({name:"X",subtitle:"y",stats:{mg,mh,mc},seed:1,
  act:{id:"a",low:"acts things",we:"act",up:"ACT",fx:"eye"},
  tool:{id:"t",low:"tool",chassis:"box"},
  purpose:{id:"p",low:"for p",who:"the p",badge:"star"}});

const P={margin:fakeProduct(9,1,1),mayhem:fakeProduct(1,9,1),mercy:fakeProduct(1,1,9)};
const PRODUCT_SETS=[
  {p1:P.margin,p2:P.margin,p3:P.margin,p4:P.margin,p5:P.margin},
  {p1:P.mayhem,p2:P.mayhem,p3:P.mayhem,p4:P.mayhem,p5:P.mayhem},
  {p1:P.mercy, p2:P.mercy, p3:P.mercy, p4:P.mercy, p5:P.mercy},
  {p1:P.mayhem,p2:P.margin,p3:P.mercy, p4:P.margin,p5:P.mercy},
];
const FLAG_SETS=[
  {},                                                        /* nothing set */
  {side_lisa:true,vend_friend:true,partner_gary:true,crate_up:true,
   heard_stops:true,roomba_up:true,coupon:true},
  {side_rob:true,partner_supes:true},
  {partner_gi:true},
];
const FILE_SETS=[
  {trust:{},lore:[],roles:["TRAINEE"]},
  {trust:{gary:3,benny:3,supes:2,gi:2,lisa:2},
   lore:["g1","g2","g3","g4"],roles:["TRAINEE","ARCHIVIST","FACILITIES","BODY DOUBLE"]},
  {trust:{gi:3},lore:["g1"],roles:["TRAINEE"]},
  {trust:{supes:2},lore:[],roles:["TRAINEE"]},
];
const statesFor=()=>{
  const out=[];
  for(const ps of PRODUCT_SETS)
    for(const doom of [0,7,8,9,10,12])
      for(const sus of [0,6,8,10])
        for(const flags of FLAG_SETS)
          for(const file of FILE_SETS)
            out.push({run:file.roles.length>1?2:1,day:1,...ps,sus,doom,flags,file,stamps:"x"});
  /* one state with no flags key at all — branch fns must guard */
  out.push({run:1,day:1,...PRODUCT_SETS[0],sus:0,doom:0,file:FILE_SETS[0],stamps:"x"});
  return out;
};
const STATES=statesFor();

const reachable=new Set();
for(const id of ids){
  const n=STORY[id];
  const outs=[];
  if(n.choices)for(const c of n.choices){
    check(!!c.goto,`${id}: choice "${c.t}" has no goto`);
    if(c.goto)outs.push(c.goto);
    if(c.req)for(const s of STATES){
      try{c.req(s);}catch(e){check(false,`${id}: choice req threw (${e.message})`);break;}
    }
  }
  if(n.next)outs.push(n.next);
  if(n.branch){
    for(const s of STATES){
      let to;
      try{to=n.branch(s);}
      catch(e){check(false,`${id}: branch threw (${e.message})`);continue;}
      check(typeof to==="string"&&(STORY[to]||to==="__rebirth"),
        `${id}: branch returned "${to}" for doom=${s.doom} sus=${s.sus}`);
      if(to)outs.push(to);
    }
  }
  for(const t of outs)
    check(t==="__rebirth"||!!STORY[t],`${id} → missing node "${t}"`);
  n._outs=[...new Set(outs)];
  /* text functions must render for every state */
  if(typeof n.text==="function"){
    for(const s of STATES){
      try{const txt=n.text(s);check(typeof txt==="string"&&txt.length>20,`${id}: thin text`);}
      catch(e){check(false,`${id}: text threw (${e.message})`);break;}
    }
  }
  if(n.day!=null)check(Number.isInteger(n.day)&&n.day>=1&&n.day<=12,`${id}: bad day ${n.day}`);
  if(n.kind==="paper")check(!!n.product&&!!n.next,`${id}: paper node malformed`);
  if(n.kind==="toybox"){
    check(!!n.next&&!!n.moment,`${id}: toybox node malformed`);
    check(n.moment in TOYBOX_HANDS,`${id}: toybox moment "${n.moment}" has no hand`);
  }
  if(n.kind==="minigame"){
    check(!!n.next&&!!n.game,`${id}: minigame node malformed`);
    check(GAMES.includes(n.game),`${id}: unknown game "${n.game}"`);
  }
  if(!n.kind&&!n.branch)check(n.choices?.length>=1,`${id}: no choices and no route`);
}

/* every paper slot p1..p5 appears exactly once */
const slots=ids.filter(i=>STORY[i].kind==="paper").map(i=>STORY[i].product).sort();
check(JSON.stringify(slots)==='["p1","p2","p3","p4","p5"]',
  `paper slots wrong: ${slots.join(",")}`);

/* reachability from cert */
const stack=["cert"];
while(stack.length){
  const id=stack.pop();
  if(reachable.has(id)||id==="__rebirth")continue;
  reachable.add(id);
  for(const t of STORY[id]?._outs||[])stack.push(t);
}
for(const id of ids)
  check(reachable.has(id),`unreachable node: ${id}`);

/* endings reach rebirth; there are six ways out */
const endings=ids.filter(i=>STORY[i].ending);
check(endings.length>=6,`only ${endings.length} endings — expected 6`);
for(const id of endings)
  check(STORY[id]._outs.includes("__rebirth"),`${id}: ending without rebirth`);

/* the season has twelve days on rails */
const days=[...new Set(ids.map(i=>STORY[i].day).filter(Boolean))].sort((a,b)=>a-b);
check(days[0]===1&&days[days.length-1]===12,
  `day rails run ${days[0]}–${days[days.length-1]}, expected 1–12`);

/* a straight first-choice playthrough terminates at an ending (no loops) */
{
  let cur="cert",steps=0,st={run:1,day:1,...PRODUCT_SETS[3],sus:0,doom:0,
    flags:{},file:FILE_SETS[0],stamps:"x"};
  const seen=new Set();
  while(steps++<400){
    const n=STORY[cur];
    if(!n){check(false,`walk hit missing node ${cur}`);break;}
    if(n.ending){break;}
    let nxt=null;
    if(n.branch)nxt=n.branch(st);
    else if(n.next)nxt=n.next;
    else if(n.choices)nxt=n.choices[0].goto;
    if(n.day)st.day=n.day;
    if(!nxt||nxt==="__rebirth"){check(false,`walk dead-ended at ${cur}`);break;}
    const k=cur+"→"+nxt;
    if(seen.has(k)){check(false,`walk loop at ${k}`);break;}
    seen.add(k);
    cur=nxt;
  }
  check(STORY[cur]?.ending,`first-choice walk ended at "${cur}", not an ending`);
  console.log(`  walk: cert → ${cur} in ${steps} cards`);
}

console.log(`\nnodes ${ids.length} · reachable ${reachable.size} · endings ${endings.length} · states ${STATES.length}`);
console.log(failures?`✗ ${failures} FAILURES`:`✓ THE STORY HOLDS. Every path leads somewhere true.`);
process.exit(failures?1:0);
