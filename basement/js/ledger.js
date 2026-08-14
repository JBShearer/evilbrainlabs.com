/* ============================================================ ledger.js
   Every shipped product is a permanent record with delayed hooks.
   Week-5 ship, week-9 knock at a conference room door. Attrition does
   not clear the docket: unfired hooks follow you into the next
   employment, where "a previous employee" shipped them. It was you.
================================================================ */
import {mulberry32,hash32,pickW} from "./gen.js";
import {CONSEQUENCES,consequenceWeights} from "./data.js";
import * as E from "./engine.js";

export function recordShip({product,funder}){
  const rec={
    id:product.id, name:product.name, subtitle:product.subtitle,
    run:E.FILE.runs, week:product.week,
    stats:product.stats, seed:product.seed,
    actId:product.act.id, toolId:product.tool.id, purpId:product.purpose.id,
    funderName:funder?.name||"petty cash",
  };
  E.FILE.ledger=(E.FILE.ledger||[]).concat(rec).slice(-40);
  E.saveFile();
  /* schedule 1–2 consequences */
  const rng=mulberry32(product.seed^0xC0FFEE);
  const n=1+(rng()<.55?1:0);
  const weights=consequenceWeights(product,funder);
  const used=new Set();
  for(let i=0;i<n&&weights.length;i++){
    let type=pickW(rng,weights);
    if(used.has(type))continue;
    used.add(type);
    E.R.hooks.push({
      id:"h"+product.seed.toString(36)+i,
      type, productId:product.id,
      product:snapshot(product),
      dueWeek:E.R.week+2+Math.floor(rng()*4),
      fired:false,
    });
  }
  E.saveRun();
}

/* Keep only what consequence copy needs (survives JSON round-trips). */
function snapshot(p){
  return {name:p.name, subtitle:p.subtitle, stats:p.stats, seed:p.seed,
    act:{id:p.act.id,low:p.act.low,we:p.act.we,up:p.act.up},
    tool:{id:p.tool.id,low:p.tool.low},
    purpose:{id:p.purpose.id,low:p.purpose.low,who:p.purpose.who},
    funder:p.funder?{name:p.funder.name}:null};
}

/* Called on every week roll. Returns surfaced items for the UI. */
export function onWeek(){
  const out=[];
  for(const h of E.R.hooks){
    if(h.fired||h.dueWeek>E.R.week)continue;
    h.fired=true;
    out.push(fire(h,false));
  }
  /* the past knocks: one echo per run, early */
  if(!E.R.echoedIn && E.R.week>=2 && (E.FILE.echoes||[]).length){
    E.R.echoedIn=true;
    const h=E.FILE.echoes.shift();
    E.saveFile();
    out.push(fire({...h,fired:true},true));
  }
  E.saveRun();
  return out.filter(Boolean);
}

function fire(h,isEcho){
  const C=CONSEQUENCES[h.type];
  if(!C)return null;
  const p=h.product;
  const wire=(isEcho?"FROM A PREVIOUS EMPLOYMENT: ":"")+C.wire(p);
  E.R.wire.push({week:E.R.week,text:wire,type:h.type});
  /* some consequences want a room */
  if(h.type==="hearing"||h.type==="recall"||h.type==="grudge"){
    E.R.hearingQueue.push({...h,isEcho});
  }
  /* some move trust */
  if(h.type==="grudge")E.bump("lisa",1);
  if(h.type==="turn"){E.bump("gary",1);E.bump("supes",1);}
  if(h.type==="clone")E.bump("benny",-1);
  return {hook:h,wire,board:C.board(p),isEcho};
}

/* The hearing room was entered; deal its card. Returns card spec. */
export function hearingCard(hook){
  const C=CONSEQUENCES[hook.type];
  const p=hook.product;
  const intro=hook.isEcho
    ? "A previous employee shipped this product. The room does not know that. You know that.\n\n"
    : "";
  const base={who:hook.type==="hearing"?"stall":"sys",
    text:intro+C.card(p), product:p};
  const choices={
    hearing:[
      {t:"Testify: it works as designed",fx:{syn:3,doom:1},out:"True, which lands badly, which lands well. The committee schedules a follow-up for never."},
      {t:"Testify: it was the funder's idea",fx:{syn:1,sus:1},out:"The funder's lawyers were already seated. They applaud your courage quietly."},
      {t:"Let the product testify",fx:{clr:1,doom:1},out:"The product "+p.act.low+" at the microphone. The record will show it meant well."}],
    recall:[
      {t:"Round the units up yourself",fx:{syn:4,sus:1},out:"They come quietly, mostly. One writes. You'll allow it."},
      {t:"Issue a firmware apology",fx:{syn:2},out:"Version 2.0.1: 'sorry.' Adoption is immediate and sincere."},
      {t:"Reclassify it as a feature",fx:{syn:5,doom:1},out:"Marketing agrees instantly, which should have been the warning."}],
    grudge:[
      {t:"Meet the delegation",fx:{syn:3},out:"You listen. Nobody has listened before. It is somehow the cheapest fix in the building."},
      {t:"Offer them the v2 roadmap",fx:{syn:1,sus:1},out:"They read it. They know a roadmap from an apology. Everyone does."},
      {t:"Hide behind the org chart",fx:{sus:2},out:"Every line ends at a jar. The delegation finds this clarifying."}],
  };
  base.choices=choices[hook.type]||choices.hearing;
  return base;
}
