/* ============================================================ world.js
   The World Ticks. Things happen to OTHER people between your actions:
   generated character events that land on the board and in the news
   wire, and sometimes intersect your Ledger — the world does not wait
   for you to ship to have a week.
================================================================ */
import {mulberry32,pick} from "./gen.js";
import {WORLD_TICKS,TICK_PAIRS,TICK_LEDGER,CAST} from "./data.js";
import * as E from "./engine.js";
import * as Board from "./board.js";

const PAIRABLE=["supes","gary","gi","sam","benny","wendy","lisa","rob","stall"];

/* Called on every week roll. Returns the tick for optional toasting. */
export function weekTick(){
  const rng=mulberry32((E.R.seed^(E.R.week*0x9E3779B9))>>>0);
  if(rng()<.25)return null;                       /* some weeks are just weeks */
  const ledger=E.FILE.ledger||[];
  const roll=rng();
  let text=null, who="sys", ledgerHit=false;

  if(roll<.35 && ledger.length){                  /* your past, in the news */
    const rec=pick(rng,ledger.slice(-6));
    text=pick(rng,TICK_LEDGER)(rec);
    ledgerHit=true;
  } else if(roll<.6){                             /* cast doing cast things */
    const a=pick(rng,PAIRABLE);
    let b=pick(rng,PAIRABLE.filter(x=>x!==a));
    text=pick(rng,TICK_PAIRS)(CAST[a].name,CAST[b].name);
    who=a;
  } else {                                        /* ambient hum */
    const t=pick(rng,WORLD_TICKS);
    text=t.t; who=t.who;
  }
  if(!text)return null;
  Board.post({who:who==="anon"?"anon":who,text,kind:"tick"});
  E.R.wire.push({week:E.R.week,text,type:"tick"});
  E.R.wire=E.R.wire.slice(-6);
  E.saveRun();
  return {text,ledgerHit};
}
