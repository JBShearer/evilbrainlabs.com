/* ============================================================
   WORLD MOTION CHECK — THE POINT edition.
   The economies are gone, so there is nothing to balance. What
   remains checkable: the world must MOVE. Every ship must light
   scenes and touch multiple surfaces; every scene template must
   build without throwing for every product; inspirations must
   point at real parts; ledger hooks must come back as scenes.

   Run from the site root:  node basement/tools/world-motion.mjs
================================================================ */
globalThis.localStorage={_m:{},
  getItem(k){return this._m[k]??null},
  setItem(k,v){this._m[k]=String(v)},
  removeItem(k){delete this._m[k]}};
globalThis.history={replaceState(){}};
globalThis.location={hash:""};

const base=new URL("../js/",import.meta.url).href;
const E=await import(base+"engine.js");
const data=await import(base+"data.js");
const Ledger=await import(base+"ledger.js");
const World=await import(base+"world.js");
const Board=await import(base+"board.js");
const News=await import(base+"news.js");
const Scenes=await import(base+"scenes.js");
const {mulberry32}=await import(base+"gen.js");

const rnd=()=>Math.random();
const pickR=a=>a[Math.floor(rnd()*a.length)];
let failures=0;
const check=(ok,msg)=>{if(!ok){failures++;console.log("  ✗",msg);}};

E.on("week",()=>{
  const surfaced=Ledger.onWeek();
  for(const s of surfaced)
    if(["hearing","recall","grudge"].includes(s.hook.type))Scenes.spawnEcho(s.hook);
  Board.onWeek();World.weekTick();
});
E.on("shipped",({product,funder,verdict})=>{
  Ledger.recordShip({product,funder,verdict});
  News.buildCycle({product,funder,verdict});
  Board.onShip({name:product.name,seed:product.seed});
  Scenes.spawnAftermath(product);
});

/* attrition is back: when an employment ends, take the next one */
let deaths=0;
E.on("died",()=>{deaths++;E.newRun("TRAINEE");Board.seedBoard();});
E.newRun("TRAINEE",424242);
Board.seedBoard();

const SHIPS=40;
let inspirations=0, templatesHit=new Set(), echoes=0, totalScenes=0;
console.log(`\n=== WORLD MOTION · ${SHIPS} inventions ===\n`);

for(let i=0;i<SHIPS;i++){
  const a=pickR(data.ACTS).id, t=pickR(data.TOOLS).id, u=pickR(data.PURPOSES).id;
  const before={newsTop:E.R.news[0],boardTop:E.R.board[0],scenes:E.R.scenes.length};
  const p=E.makeProduct(a,t,u,rnd()<.3?"napkin":"toybox");
  E.ship(p,rnd()<.6?pickR(data.FUNDERS):null);
  const fresh=E.R.scenes.filter(s=>s.week>=E.R.week-1);
  check(E.R.scenes.length>before.scenes||fresh.length>=3,
    `ship ${i}: no scenes spawned`);
  check(E.R.news[0]!==before.newsTop,`ship ${i}: news did not move`);
  check(E.R.board[0]!==before.boardTop,`ship ${i}: board did not move`);
  totalScenes+=Math.max(0,E.R.scenes.length-before.scenes);
  /* play every live aftermath scene: every template must build + resolve */
  for(const s of [...E.R.scenes]){
    if(s.kind==="echo"){
      echoes++;
      const spec=Ledger.hearingCard(s.hook);
      check(spec&&spec.choices?.length>=2,`echo scene bad card`);
      E.R.scenes=E.R.scenes.filter(x=>x!==s);
      continue;
    }
    templatesHit.add(s.tpl);
    let body;
    try{body=Scenes.buildBody(s);}
    catch(e){check(false,`template ${s.tpl} threw: ${e.message}`);continue;}
    if(body.press){E.R.scenes=E.R.scenes.filter(x=>x!==s);continue;}
    check(typeof body.text==="string"&&body.text.length>40,
      `template ${s.tpl} thin text`);
    check(body.choices.length>=2,`template ${s.tpl} too few choices`);
    const c=pickR(body.choices);
    if(c.trust)E.bump(c.trust[0],c.trust[1]);
    if(c.inspire){
      const insp=c.inspire();
      inspirations++;
      const cat={act:E.ACT_BY,tool:E.TOOL_BY,purpose:E.PURP_BY}[insp.kind];
      check(cat&&cat[insp.id],`inspiration points at unknown part ${insp.kind}:${insp.id}`);
    }
    check(typeof c.out==="string"&&c.out.length>20,`template ${s.tpl} thin outcome`);
    E.R.scenes=E.R.scenes.filter(x=>x!==s);
    E.tick(1);
  }
}
/* force every template at least once with a synthetic extreme product */
for(let tpl=0;tpl<Scenes.AFTERMATH.length;tpl++){
  if(templatesHit.has(tpl))continue;
  const p=E.makeProduct("shreds","drones","toddlers","toybox");
  p.stats={mg:12,mh:12,mc:12};
  try{
    const body=Scenes.AFTERMATH[tpl].build(
      {name:p.name,subtitle:p.subtitle,stats:p.stats,seed:p.seed,
       act:{id:p.act.id,low:p.act.low,we:p.act.we,up:p.act.up,fx:p.act.fx},
       tool:{id:p.tool.id,low:p.tool.low,chassis:p.tool.chassis},
       purpose:{id:p.purpose.id,low:p.purpose.low,who:p.purpose.who,badge:p.purpose.badge}},
      mulberry32(tpl+7));
    check(body.press||body.choices.length>=2,`forced template ${tpl} too few choices`);
    templatesHit.add(tpl);
  }catch(e){check(false,`forced template ${tpl} threw: ${e.message}`);}
}

console.log(`ships               ${SHIPS}`);
console.log(`employments used    ${deaths+1} (attrition is back and working)`);
console.log(`scenes spawned      ${totalScenes} (${(totalScenes/SHIPS).toFixed(1)}/ship)`);
console.log(`templates exercised ${templatesHit.size}/${Scenes.AFTERMATH.length}`);
console.log(`inspirations seen   ${inspirations}`);
console.log(`echo scenes         ${echoes}`);
console.log(`weeks elapsed       ${E.R.week}`);
console.log(failures?`\n✗ ${failures} FAILURES`:`\n✓ THE WORLD MOVES. No failures.`);
process.exit(failures?1:0);
