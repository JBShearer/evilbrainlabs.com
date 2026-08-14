/* ============================================================ gen.js
   Seeded RNG + the endless labyrinth.
   Everything here is deterministic in (SEED, x, y). The map is the run:
   the same seed always deals the same floor plan, the same rooms, the
   same stains on the same napkins. Share a run by sharing #seed.
================================================================ */

export function mulberry32(a){
  return function(){
    a|=0; a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}

/* 2D integer hash → 32-bit uint. Stable across sessions. */
export function hash32(seed,x,y,salt=0){
  let h = seed ^ 0x9E3779B9;
  h = Math.imul(h ^ (x|0), 0x85EBCA6B); h ^= h>>>13;
  h = Math.imul(h ^ (y|0), 0xC2B2AE35); h ^= h>>>16;
  h = Math.imul(h ^ (salt|0), 0x27D4EB2F); h ^= h>>>15;
  return h>>>0;
}

/* An rng seeded from coordinates — for room furniture, stains, moods. */
export const rngFor=(seed,x,y,salt=0)=>mulberry32(hash32(seed,x,y,salt));

export const pick=(rng,arr)=>arr[Math.floor(rng()*arr.length)];
export function pickW(rng,entries){ /* entries: [[item,weight],…] */
  let total=0; for(const [,w] of entries) total+=w;
  let r=rng()*total;
  for(const [item,w] of entries){ r-=w; if(r<=0) return item; }
  return entries[entries.length-1][0];
}
export function shuffle(rng,arr){
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

/* ---------------- the floor plan ----------------
   Rooms live on an integer grid. Doors are edges between cells,
   computed symmetrically (both rooms agree about the wall between
   them). If a cell would seal itself shut, its lowest-hash edge is
   rescued open — and the neighbour reaches the same conclusion.   */

const DIRS = {N:[0,-1], S:[0,1], E:[1,0], W:[-1,0]};
export const DIR_LIST = ["N","E","S","W"];
export const OPP = {N:"S",S:"N",E:"W",W:"E"};

function edgeHash(seed,x,y,dir){
  const [dx,dy]=DIRS[dir];
  const x2=x+dx, y2=y+dy;
  /* canonical edge key: lexicographically smaller cell + axis */
  const ax = dir==="E"||dir==="W" ? 1 : 2;
  const cx = Math.min(x,x2), cy = Math.min(y,y2);
  return hash32(seed, cx*2+ax, cy*3-ax, 77);
}
const baseOpen=(seed,x,y,dir)=> (edgeHash(seed,x,y,dir)%100) < 62;

function sealed(seed,x,y){
  return DIR_LIST.every(d=>!baseOpen(seed,x,y,d));
}
function rescueEdge(seed,x,y){
  let best="N",bh=Infinity;
  for(const d of DIR_LIST){const h=edgeHash(seed,x,y,d); if(h<bh){bh=h;best=d;}}
  return best;
}
export function doorOpen(seed,x,y,dir){
  if(baseOpen(seed,x,y,dir)) return true;
  if(sealed(seed,x,y) && rescueEdge(seed,x,y)===dir) return true;
  const [dx,dy]=DIRS[dir]; const nx=x+dx, ny=y+dy;
  if(sealed(seed,nx,ny) && rescueEdge(seed,nx,ny)===OPP[dir]) return true;
  return false;
}
export function doorsAt(seed,x,y){
  const out={};
  for(const d of DIR_LIST) out[d]=doorOpen(seed,x,y,d);
  return out;
}
export const step=(x,y,dir)=>({x:x+DIRS[dir][0], y:y+DIRS[dir][1]});

/* Held doors: some closed edges aren't walls — someone is standing in
   them. Symmetric (the same someone from both sides). Trust opens what
   the floor plan closed. */
const HOLDERS=["gi","gary","lisa","rob","benny","wendy","sam","stall","supes"];
export function heldDoorAt(seed,x,y,dir){
  if(doorOpen(seed,x,y,dir))return null;
  const h=edgeHash(seed,x,y,dir);
  if(h%100>=62 && h%100<75) return HOLDERS[(h>>>8)%HOLDERS.length];
  return null;
}
export function heldAt(seed,x,y){
  const out={};
  for(const d of DIR_LIST) out[d]=heldDoorAt(seed,x,y,d);
  return out;
}

/* ---------------- room typing ----------------
   Weighted deal, with guarantees:
   (0,0) is always the BREAK ROOM — the run starts at the napkins.
   A LAB and a PRESENTATION room are pinned near the origin so the
   three build verbs are always reachable in the first minutes.    */

const TYPE_WEIGHTS = [
  ["break",      13],
  ["lab",        11],
  ["present",    10],
  ["closet",     14],
  ["vending",    10],
  ["conference", 16],
  ["cafeteria",  10],
  ["hr",          8],
  ["corridor",   14],
  ["executive",   1],   /* a floor that shouldn't exist */
];

const PINNED = {
  "0,0":  "break",
  "1,0":  "corridor",
  "0,-1": "closet",
  "2,0":  "lab",
  "0,-2": "present",
  "-1,0": "vending",
};

export function roomTypeAt(seed,x,y){
  const key=x+","+y;
  if(PINNED[key]) return PINNED[key];
  const rng=rngFor(seed,x,y,11);
  let t=pickW(rng,TYPE_WEIGHTS);
  /* the executive floor needs clearance in your blood: keep it rare
     and never adjacent to the origin */
  if(t==="executive" && Math.abs(x)+Math.abs(y)<4) t="conference";
  return t;
}

/* Full room record. Cheap to recompute; nothing stored but overrides. */
export function roomAt(seed,x,y){
  const type=roomTypeAt(seed,x,y);
  const rng=rngFor(seed,x,y,23);
  return {
    x,y,type,
    seed: hash32(seed,x,y,23),
    doors: doorsAt(seed,x,y),
    held: heldAt(seed,x,y),
    palette: Math.floor(rng()*6),
    wear: rng(),                       /* 0 fresh … 1 condemned */
    variant: Math.floor(rng()*4),
    hazard: rng()<hazardChance(type),
    cast: castFor(type,rng),
  };
}

function hazardChance(type){
  return {corridor:.34, closet:.30, conference:.16, hr:.22,
          break:.08, lab:.10, present:.08, vending:.10,
          cafeteria:.12, executive:.5}[type] ?? .15;
}

/* Who tends to haunt which room. null = empty room. */
function castFor(type,rng){
  const T={
    break:      [["supes",2],["gary",3],["gi",1],[null,6]],
    lab:        [["supes",3],["gary",3],["sam",1],[null,3]],
    present:    [["stall",3],["benny",2],[null,5]],
    closet:     [["gary",3],[null,7]],
    vending:    [["gi",2],["benny",1],[null,7]],
    conference: [["stall",2],["lisa",2],["rob",2],["sam",2],[null,6]],
    cafeteria:  [["lisa",2],["rob",2],["wendy",2],["gi",1],["sam",1],[null,4]],
    hr:         [["wendy",2],[null,5]],
    corridor:   [["gi",1],["gary",1],[null,9]],
    executive:  [["brain",8],["sam",2]],
  }[type] || [[null,1]];
  return pickW(rng,T);
}

/* Names on doors — flavor for the walk. */
const ROOM_NOUNS = {
  break:["BREAK ROOM","KITCHENETTE","THE NAPKIN ANNEX","BREAK ROOM (DECOMMISSIONED)"],
  lab:["LABORATORY","WET LAB","ASSEMBLY LAB","LAB (DO NOT LICK)"],
  present:["PRESENTATION HALL","BRIEFING THEATRE","THE PITCH PIT","DEMO ROOM"],
  closet:["SERVER CLOSET","WIRING CLOSET","RACK ROOM","CLOSET (WARM)"],
  vending:["VENDING ALCOVE","SNACK NICHE","AUTOMAT CORNER","VENDING (HUMS)"],
  conference:["CONFERENCE ROOM","MEETING ROOM","WAR ROOM (RENAMED)","SYNC SPACE"],
  cafeteria:["CAFETERIA","CANTEEN","THE TROUGH","MEAL HALL"],
  hr:["HR ANNEX","PEOPLE OPERATIONS","COMPLIANCE SUITE","HR (ALWAYS OPEN)"],
  corridor:["CORRIDOR","HALLWAY","SERVICE PASSAGE","LONG HALL"],
  executive:["EXECUTIVE FLOOR","THE FLOOR THAT ISN'T","MAHOGANY LEVEL"],
};
export function roomName(room){
  const list=ROOM_NOUNS[room.type]||["ROOM"];
  return list[room.variant%list.length];
}

/* Letter+number the way facilities would: B-EAST-4, that sort of thing. */
export function roomCode(x,y){
  const ew = x===0?"" : (x>0?"E"+x:"W"+(-x));
  const ns = y===0?"" : (y>0?"S"+y:"N"+(-y));
  return "B"+(ns||"")+(ew||"") || "B0";
}
