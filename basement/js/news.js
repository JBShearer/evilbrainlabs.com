/* ============================================================ news.js
   The reward moment. Shipping triggers a generated front page:
   headlines from the product's stats, takes from the cast, wire items
   from the world and the Ledger. Fun, fast, readable — then back to
   the corridor, where the paper is already lining a drawer.
================================================================ */
import {mulberry32,shuffle,pick} from "./gen.js";
import {MASTHEADS,HEADLINES,DECKS,TAKES,WORLD_TICKS,CAST} from "./data.js";
import * as E from "./engine.js";

const axisOf=(s)=> s.mg>=s.mh&&s.mg>=s.mc ? "margin" : (s.mh>=s.mc ? "mayhem":"mercy");

export function buildCycle({product,funder,revenue}){
  const rng=mulberry32(product.seed^0x9E5);
  const axis=axisOf(product.stats);
  const lead=pick(rng,HEADLINES[axis])(product).toUpperCase();
  const deck=pick(rng,DECKS[axis])(product);
  /* two speak per cycle, never four */
  const eligible=shuffle(rng,TAKES.filter(t=>t.when(product)));
  const takes=[],seen=new Set();
  for(const t of eligible){
    if(seen.has(t.who))continue;
    seen.add(t.who);takes.push({who:t.who,text:t.fn(product)});
    if(takes.length===2)break;
  }
  /* wire: due consequences + one world tick */
  const wire=E.R.wire.splice(0).map(w=>w.text);
  wire.push(pick(rng,WORLD_TICKS).t);
  const cycle={
    masthead:pick(rng,MASTHEADS),
    week:E.R.week,
    lead, deck, takes,
    market:market(revenue,product,rng),
    wire:wire.slice(0,3),
    funderLine:funder? "Funded by "+funder.name+". "+(funder.note||"") : "Self-funded, which HR calls 'a hobby.'",
    product:{name:product.name,subtitle:product.subtitle,seed:product.seed,
      stats:product.stats,
      act:{fx:product.act.fx,low:product.act.low,up:product.act.up},
      tool:{chassis:product.tool.chassis,low:product.tool.low},
      purpose:{badge:product.purpose.badge,low:product.purpose.low,who:product.purpose.who}},
    revenue,
  };
  E.R.news.unshift(cycle);
  E.R.news=E.R.news.slice(0,12);
  E.R.cycles++; E.FILE.cyclesTotal=(E.FILE.cyclesTotal||0)+1;
  E.saveFile(); E.saveRun();
  return cycle;
}

function market(rev,p,rng){
  const doomTick=p.stats.mh>=9?"▲▲":p.stats.mh>=5?"▲":"—";
  return `SYNERGY +${rev} · DOOM FUTURES ${doomTick} · COOLANT ${(2+rng()*3).toFixed(2)} · JAR: UNCHANGED`;
}

export const castName=(id)=>CAST[id]?.name||id.toUpperCase();
