/* ============================================================
   STORY GRAPH CHECK — the curated cut.
   Every goto resolves. Every branch is total over stat/meter space.
   Every node is reachable from cert. Every ending reaches rebirth.
   Run from the site root:  node basement/tools/story-check.mjs
================================================================ */
globalThis.localStorage={_m:{},getItem(k){return this._m[k]??null},
  setItem(k,v){this._m[k]=String(v)},removeItem(k){delete this._m[k]}};
globalThis.history={replaceState(){}};
globalThis.location={hash:""};

const base=new URL("../js/",import.meta.url).href;
const {STORY}=await import(base+"story.js");
const E=await import(base+"engine.js");

let failures=0;
const check=(ok,msg)=>{if(!ok){failures++;console.log("  ✗",msg);}};

const ids=Object.keys(STORY);
const fakeProduct=(mg,mh,mc)=>({name:"X",subtitle:"y",stats:{mg,mh,mc},seed:1,
  act:{id:"a",low:"acts",we:"act",up:"ACT",fx:"eye"},
  tool:{id:"t",low:"tool",chassis:"box"},
  purpose:{id:"p",low:"for p",who:"the p",badge:"star"}});
const statesFor=()=>{
  const out=[];
  for(const p of [fakeProduct(9,1,1),fakeProduct(1,9,1),fakeProduct(1,1,9)])
    for(const doom of [0,7,9,12])
      for(const sus of [0,6,8,10])
        out.push({run:1,day:1,p1:p,p2:p,p3:p,sus,doom,
          file:{trust:{},lore:[]},stamps:"x"});
  return out;
};

const reachable=new Set();
const targets=new Set();
for(const id of ids){
  const n=STORY[id];
  const outs=[];
  if(n.choices)for(const c of n.choices){
    check(!!c.goto,`${id}: choice "${c.t}" has no goto`);
    if(c.goto)outs.push(c.goto);
  }
  if(n.next)outs.push(n.next);
  if(n.branch){
    for(const s of statesFor()){
      let to;
      try{to=n.branch(s);}
      catch(e){check(false,`${id}: branch threw (${e.message})`);continue;}
      check(typeof to==="string"&&(STORY[to]||to==="__rebirth"),
        `${id}: branch returned "${to}" for doom=${s.doom} sus=${s.sus}`);
      if(to)outs.push(to);
    }
  }
  for(const t of outs){
    targets.add(t);
    check(t==="__rebirth"||!!STORY[t],`${id} → missing node "${t}"`);
  }
  n._outs=[...new Set(outs)];
  /* text functions must render for every state */
  if(typeof n.text==="function"){
    for(const s of statesFor()){
      try{const txt=n.text(s);check(typeof txt==="string"&&txt.length>20,`${id}: thin text`);}
      catch(e){check(false,`${id}: text threw (${e.message})`);}
    }
  }
  if(n.kind==="paper")check(!!n.product&&!!n.next,`${id}: paper node malformed`);
  if(n.kind==="toybox")check(!!n.next&&!!n.moment,`${id}: toybox node malformed`);
  if(n.kind==="minigame")check(!!n.next&&!!n.game,`${id}: minigame node malformed`);
  if(!n.kind&&!n.branch)check(n.choices?.length>=1,`${id}: no choices and no route`);
}

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

/* endings reach rebirth */
for(const id of ids){
  const n=STORY[id];
  if(n.ending)check(n._outs.includes("__rebirth"),`${id}: ending without rebirth`);
}

console.log(`\nnodes ${ids.length} · reachable ${reachable.size} · endings ${ids.filter(i=>STORY[i].ending).length}`);
console.log(failures?`✗ ${failures} FAILURES`:`✓ THE STORY HOLDS. Every path leads somewhere true.`);
process.exit(failures?1:0);
