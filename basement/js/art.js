/* ============================================================ art.js
   Procedural CRT-neon renderer. Ported and extended from the old
   /lab graphicsEngine.js: chunky fillRect pixel art, neon on black,
   everything seeded so every room, robot and product draws itself
   differently — and the same way every time you come back.
================================================================ */
import {mulberry32} from "./gen.js";
import {CAST} from "./data.js";

export const W=320, H=240;

const PALETTES=[
 {wall:"#101020",floor:"#0c0c14",trim:"#ff0044",glow:"#ff0044"},
 {wall:"#0d1420",floor:"#0a0e14",trim:"#00ffff",glow:"#00ffff"},
 {wall:"#141020",floor:"#0e0a14",trim:"#8b5cf6",glow:"#8b5cf6"},
 {wall:"#101a14",floor:"#0a120e",trim:"#00ff88",glow:"#00ff88"},
 {wall:"#1a1410",floor:"#120e0a",trim:"#ffd700",glow:"#ffd700"},
 {wall:"#1a1016",floor:"#120a10",trim:"#ff66aa",glow:"#ff66aa"},
];

export function makeCanvas(w=W,h=H){
  const c=document.createElement("canvas");
  const dpr=Math.min(2,window.devicePixelRatio||1);
  c.width=w*dpr; c.height=h*dpr;
  c.style.width="100%"; c.style.imageRendering="pixelated";
  const ctx=c.getContext("2d");
  ctx.scale(dpr,dpr);
  ctx.imageSmoothingEnabled=false;
  return {c,ctx};
}

const R=(ctx,x,y,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(x|0,y|0,w|0,h|0);};
function glowR(ctx,x,y,w,h,col){
  ctx.save();ctx.shadowColor=col;ctx.shadowBlur=8;
  R(ctx,x,y,w,h,col);ctx.restore();
}
function text(ctx,s,x,y,col,size=8,align="center"){
  ctx.fillStyle=col;ctx.font=size+"px ui-monospace,Menlo,monospace";
  ctx.textAlign=align;ctx.fillText(s,x,y);
}

/* ================= ROOM SCENES ================= */

export function drawRoom(ctx,room,frame=0){
  const rng=mulberry32(room.seed);
  const P=PALETTES[room.palette%PALETTES.length];
  /* shell */
  R(ctx,0,0,W,H,"#07070b");
  R(ctx,20,18,W-40,120,P.wall);                       /* back wall */
  ctx.fillStyle=P.floor;                              /* floor trapezoid */
  ctx.beginPath();ctx.moveTo(20,138);ctx.lineTo(W-20,138);
  ctx.lineTo(W,H-14);ctx.lineTo(0,H-14);ctx.closePath();ctx.fill();
  /* floor seams */
  ctx.strokeStyle="rgba(255,255,255,.05)";ctx.lineWidth=1;
  for(let i=0;i<6;i++){const t=i/5;
    ctx.beginPath();ctx.moveTo(20+t*(W-40),138);ctx.lineTo(t*W,H-14);ctx.stroke();}
  for(let i=1;i<4;i++){const y=138+(H-14-138)*i/4;
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  /* wear: stains + cracks, seeded */
  const stains=Math.floor(room.wear*7);
  for(let i=0;i<stains;i++){
    ctx.fillStyle=`rgba(0,0,0,${.18+rng()*.2})`;
    ctx.beginPath();
    ctx.ellipse(30+rng()*(W-60),150+rng()*70,4+rng()*14,2+rng()*5,0,0,7);
    ctx.fill();
  }
  /* ceiling strip light, flickering with wear */
  const flick=(frame%7===0&&room.wear>.5)?.4:1;
  ctx.globalAlpha=flick;
  glowR(ctx,W/2-40,10,80,3,"#f5f0e6");
  ctx.globalAlpha=1;
  /* doors */
  drawDoors(ctx,room,P);
  /* trim line */
  R(ctx,20,136,W-40,2,P.trim);
  /* furniture per type */
  (FURN[room.type]||FURN.corridor)(ctx,rng,P,frame,room);
  /* resident */
  if(room.cast) CAST_SPRITES[room.cast]?.(ctx, 244, 92, frame);
}

function drawDoors(ctx,room,P){
  const D=room.doors, HD=room.held||{};
  if(D.N){ /* back wall, centered */
    R(ctx,W/2-18,52,36,86,"#0a0a12");
    R(ctx,W/2-18,52,36,4,P.trim);
    R(ctx,W/2+8,96,4,6,"#ffd700");                    /* handle */
  }
  if(D.W){ R(ctx,20,60,10,78,"#0a0a12"); R(ctx,20,60,3,78,P.trim); }
  if(D.E){ R(ctx,W-30,60,10,78,"#0a0a12"); R(ctx,W-33,60,3,78,P.trim); }
  if(D.S){ /* the way back: glowing strip at your feet */
    glowR(ctx,W/2-26,H-12,52,4,P.trim);
  }
  /* held doors: a doorway with somebody in it */
  const hc=(w)=>CAST[w]?.color||"#666";
  if(!D.N&&HD.N){ R(ctx,W/2-18,52,36,86,"#0d0d16"); glowR(ctx,W/2-18,52,36,4,hc(HD.N));
    R(ctx,W/2-6,96,12,42,hc(HD.N)); R(ctx,W/2-4,88,8,8,hc(HD.N)); }   /* silhouette */
  if(!D.W&&HD.W){ R(ctx,20,60,10,78,"#0d0d16"); glowR(ctx,20,60,3,78,hc(HD.W)); }
  if(!D.E&&HD.E){ R(ctx,W-30,60,10,78,"#0d0d16"); glowR(ctx,W-33,60,3,78,hc(HD.E)); }
  if(!D.S&&HD.S){ glowR(ctx,W/2-26,H-12,52,4,hc(HD.S)); R(ctx,W/2-2,H-18,4,8,hc(HD.S)); }
}

/* ---- furniture kits ---- */
const FURN={
 break(ctx,rng,P){
  R(ctx,36,104,74,34,"#2a2a3a");R(ctx,36,100,74,6,"#3a3a4e");     /* counter */
  R(ctx,44,84,18,16,"#1a1a26");glowR(ctx,48,88,10,4,"#ff9955");   /* coffee pot */
  R(ctx,120,60,54,40,"#241f18");                                   /* corkboard */
  for(let i=0;i<5;i++)R(ctx,124+rng()*44,64+rng()*30,8,6,["#f5f0e6","#ffd700","#ff66aa"][i%3]);
  R(ctx,196,150,86,10,"#3a3a4e");R(ctx,200,160,6,26,"#2a2a3a");R(ctx,272,160,6,26,"#2a2a3a"); /* table */
  R(ctx,214,142,26,10,"#f5f0e6");R(ctx,218,144,18,2,"#d8d2c4");    /* napkins */
  glowR(ctx,120,104,3,3,P.trim);
 },
 lab(ctx,rng,P,frame){
  R(ctx,30,102,110,36,"#1d2430");R(ctx,30,98,110,6,"#2c3648");     /* bench */
  for(let i=0;i<4;i++){const x=40+i*24;
    R(ctx,x,80,10,18,"#0e1620");
    glowR(ctx,x+2,84+((frame+i)%3),6,8,["#00ff88","#00ffff","#ff66aa","#ffd700"][i]);} /* beakers */
  R(ctx,158,60,70,44,"#0e131c");                                    /* blackboard */
  ctx.strokeStyle="#3fffb0";ctx.lineWidth=1;
  for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(164,70+i*9);
    ctx.lineTo(164+30+rng()*28,70+i*9);ctx.stroke();}
  R(ctx,170,150,64,28,"#22283a");                                   /* socket rig */
  for(let i=0;i<3;i++)glowR(ctx,178+i*20,158,10,10,"#101828");
  text(ctx,"ACT  TOOL  WHY",202,148,"#8b8ba0",6);
 },
 present(ctx,rng,P,frame){
  R(ctx,96,44,128,64,"#0e131c");glowR(ctx,100,48,120,3,P.trim);     /* screen */
  text(ctx,"Q3: INEVITABLE",160,80,P.trim,8);
  R(ctx,36,110,30,28,"#2a2a3a");R(ctx,33,106,36,6,"#3a3a4e");       /* podium */
  for(let r=0;r<2;r++)for(let i=0;i<6;i++){                          /* seated leaders */
    const x=110+i*20, y=150+r*26;
    R(ctx,x,y,14,12,"#1a1a26");
    R(ctx,x+3,y-8,8,8,["#d8b08a","#c89078","#e8c8a0","#b87860"][(i+r)%4]);
    R(ctx,x+2,y+2,10,3,["#ff0044","#66aaff","#ffd700","#00ff88","#8b5cf6","#f5f0e6"][(i*3+r)%6]); /* sash */
  }
 },
 closet(ctx,rng,P,frame){
  for(let i=0;i<3;i++){const x=44+i*66;
    R(ctx,x,58,44,80,"#131a26");R(ctx,x,58,44,4,"#232c3e");
    for(let r=0;r<6;r++){R(ctx,x+4,66+r*11,36,8,"#0d1420");
      const on=(frame+r+i)%4!==0;
      glowR(ctx,x+30,68+r*11,4,4,on?"#00ff88":"#203040");
      if(rng()<.5)glowR(ctx,x+24,68+r*11,3,3,rng()<.5?"#ff0044":"#ffd700");}}
  ctx.strokeStyle="#2a3550";ctx.lineWidth=2;                          /* cable spaghetti */
  ctx.beginPath();ctx.moveTo(40,150);
  for(let i=0;i<7;i++)ctx.quadraticCurveTo(60+i*36,146+((i%2)*18),80+i*34,158);
  ctx.stroke();
 },
 vending(ctx,rng,P,frame){
  R(ctx,116,54,88,110,"#181430");R(ctx,116,54,88,6,"#282050");       /* machine */
  glowR(ctx,122,64,54,80,"#0d0a1e");
  for(let r=0;r<4;r++)for(let i=0;i<3;i++)
    R(ctx,128+i*16,70+r*18,10,12,["#ffd700","#00ffff","#ff66aa","#00ff88","#8b5cf6","#ff9955"][(r*3+i)%6]);
  glowR(ctx,182,70,18,40,P.trim);text(ctx,"B",191,92,"#07070b",10);   /* brand slab */
  R(ctx,182,120,18,10,"#0a0a12");                                     /* coin slot */
  text(ctx,"HUMS",160,178,"#8b8ba0",6);
 },
 conference(ctx,rng,P){
  ctx.fillStyle="#2c2418";
  ctx.beginPath();ctx.moveTo(70,120);ctx.lineTo(250,120);
  ctx.lineTo(286,176);ctx.lineTo(34,176);ctx.closePath();ctx.fill();  /* long table */
  R(ctx,70,116,180,6,"#3c3020");
  for(let i=0;i<4;i++){R(ctx,84+i*44,104,16,12,"#1a1a26");}           /* chairs far side */
  R(ctx,132,60,56,34,"#0e131c");glowR(ctx,136,64,48,2,P.trim);        /* wall TV */
  text(ctx,"SYNC",160,82,P.trim,7);
 },
 cafeteria(ctx,rng,P){
  R(ctx,30,60,80,34,"#241f18");text(ctx,"MENU",70,74,"#ffd700",7);    /* menu board */
  text(ctx,"COOLANT · COOLANT",70,84,"#8b8ba0",5);
  text(ctx,"SOUP (DO NOT)",70,91,"#8b8ba0",5);
  for(let i=0;i<2;i++){const x=48+i*130;
    R(ctx,x,140,92,8,"#3a3a4e");R(ctx,x+6,148,5,22,"#2a2a3a");R(ctx,x+80,148,5,22,"#2a2a3a");
    R(ctx,x+16,132,14,8,"#8b8ba0");R(ctx,x+52,132,14,8,"#8b8ba0");}   /* trays */
  R(ctx,150,58,50,36,"#101a2a");glowR(ctx,154,62,42,3,"#66aaff");     /* window to nothing */
 },
 hr(ctx,rng,P){
  R(ctx,40,100,88,38,"#2a2a3a");R(ctx,40,96,88,6,"#3a3a4e");          /* desk */
  R(ctx,52,80,18,16,"#0e131c");glowR(ctx,55,83,12,3,"#00ff88");       /* terminal */
  for(let i=0;i<2;i++){R(ctx,190+i*44,72,32,66,"#1c2430");
    for(let r=0;r<4;r++)R(ctx,194+i*44,78+r*15,24,3,"#2c3850");}      /* filing cabinets */
  R(ctx,138,56,58,30,"#f5f0e6");                                       /* poster */
  text(ctx,"COMPLY",167,68,"#1a1815",8);text(ctx,"AND SMILE",167,78,"#1a1815",7);
 },
 corridor(ctx,rng,P,frame){
  for(let i=0;i<3;i++){const x=54+i*84;
    R(ctx,x,58,3,80,"#232c3e");}                                      /* pillars */
  R(ctx,40,70,60,20,"#0e131c");
  text(ctx,"SUBLEVEL B",70,83,P.trim,7);                              /* signage */
  const cone=rng()<.4;
  if(cone){ctx.fillStyle="#ff9955";                                   /* the cone */
    ctx.beginPath();ctx.moveTo(210,170);ctx.lineTo(202,190);ctx.lineTo(218,190);ctx.closePath();ctx.fill();
    R(ctx,205,180,10,3,"#f5f0e6");}
 },
 mailroom(ctx,rng,P,frame){
  for(let r=0;r<3;r++)for(let i=0;i<6;i++){                            /* pigeonholes */
    const x=40+i*24,y=56+r*20;
    R(ctx,x,y,20,16,"#1c1610");R(ctx,x+2,y+2,16,12,"#0e0b08");
    if(rng()<.4)R(ctx,x+4,y+6,12,6,["#e8dcc0","#d8b08a","#f5f0e6"][Math.floor(rng()*3)]);}
  R(ctx,196,110,70,28,"#2a2a3a");R(ctx,196,106,70,6,"#3a3a4e");         /* sorting desk */
  R(ctx,206,92,22,16,"#d8b08a");R(ctx,232,88,26,20,"#c8a070");          /* parcels */
  R(ctx,238,94,14,3,"#8a6d4f");
  R(ctx,60,150,54,22,"#3a2c1c");R(ctx,64,146,10,8,"#d8b08a");           /* THE crate */
  glowR(ctx,86,156,3,3,"#ffd700");
  text(ctx,"IT IS TUESDAY",150,182,"#8b8ba0",6);
 },
 archive(ctx,rng,P,frame){
  for(let i=0;i<4;i++){const x=36+i*66;                                  /* drawer stacks */
    R(ctx,x,54,52,84,"#14201a");
    for(let r=0;r<6;r++){R(ctx,x+4,60+r*13,44,10,"#0d1611");
      R(ctx,x+20,63+r*13,12,3,"#2c4638");
      if(rng()<.2)glowR(ctx,x+40,62+r*13,4,4,"#00ff88");}}
  text(ctx,"W",160,46,"#00ff88",12);                                     /* the letter */
  ctx.fillStyle="rgba(0,255,136,.05)";ctx.fillRect(20,18,W-40,120);      /* lore haze */
  for(let i=0;i<8;i++){ctx.fillStyle="rgba(245,240,230,.12)";            /* dust */
    ctx.fillRect(30+rng()*(W-60),30+rng()*100,1,1);}
 },
 arcade(ctx,rng,P,frame){
  R(ctx,110,50,100,120,"#1a1030");R(ctx,110,50,100,8,"#2c1a50");         /* cabinet */
  glowR(ctx,118,62,84,10,"#ff9955");text(ctx,"ORIENTATION",160,70,"#07070b",7); /* marquee */
  R(ctx,122,78,76,50,"#050510");                                          /* screen */
  const g=(frame>>2)%4;                                                    /* attract mode */
  glowR(ctx,132+g*16,92,10,10,["#00ff88","#00ffff","#ff66aa","#ffd700"][g]);
  text(ctx,"INSERT SELF",160,120,"#00ff88",6);
  R(ctx,134,136,20,8,"#0a0a12");glowR(ctx,140,132,6,6,"#ff0044");         /* joystick */
  R(ctx,168,136,10,8,"#0a0a12");R(ctx,182,136,10,8,"#0a0a12");            /* buttons */
  R(ctx,52,120,40,60,"#181430");glowR(ctx,58,128,28,20,"#0d0a1e");        /* sibling machine, off */
  text(ctx,"OUT OF ORDER (RESTING)",72,190,"#8b8ba0",5);
 },
 executive(ctx,rng,P,frame){
  R(ctx,30,40,260,80,"#050510");                                       /* window wall */
  for(let i=0;i<26;i++){const x=36+rng()*246,y=46+rng()*66;
    glowR(ctx,x,y,2,2+rng()*4,rng()<.8?"#ffd700":"#ff0044");}          /* skyline */
  R(ctx,20,40,270,3,"#3a2a10");R(ctx,20,118,270,3,"#3a2a10");
  R(ctx,140,128,44,44,"#1a1210");R(ctx,136,168,52,8,"#2c1e14");        /* pedestal */
  glowR(ctx,148,104,28,28,"rgba(0,255,255,.14)");                      /* jar glass */
  ctx.save();ctx.shadowColor="#ff006e";ctx.shadowBlur=12;
  R(ctx,152,110,20,14,"#ff006e");R(ctx,150,114,4,6,"#d90056");R(ctx,172,114,4,6,"#d90056");
  R(ctx,156,113,4,3,"#d90056");R(ctx,164,117,4,3,"#d90056");ctx.restore(); /* the brain */
 },
};

/* ================= THE SHOP =================
   Home. One room, always available. The shutter is the antagonist's
   knuckles; the bench is yours. */
export function drawShop(ctx,frame=0,st={}){
  R(ctx,0,0,W,H,"#07070b");
  R(ctx,20,18,W-40,120,"#141017");                       /* warm dark walls */
  ctx.fillStyle="#0f0c10";
  ctx.beginPath();ctx.moveTo(20,138);ctx.lineTo(W-20,138);
  ctx.lineTo(W,H-14);ctx.lineTo(0,H-14);ctx.closePath();ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,.05)";ctx.lineWidth=1;
  for(let i=0;i<6;i++){const t=i/5;
    ctx.beginPath();ctx.moveTo(20+t*(W-40),138);ctx.lineTo(t*W,H-14);ctx.stroke();}
  /* neon sign */
  ctx.save();ctx.shadowColor="#ff0044";ctx.shadowBlur=10;
  text(ctx,"SHIP MORE.",96,40,"#ff0044",11);ctx.restore();
  text(ctx,"— MANAGEMENT",96,50,"#8b8ba0",5);
  /* pegboard of parts */
  R(ctx,28,58,84,52,"#1a1510");
  for(let r=0;r<3;r++)for(let i=0;i<5;i++){
    if((r*5+i)%3===0)continue;
    R(ctx,34+i*16,64+r*16,10,10,["#8b6f3f","#556","#c8607a","#3fd0a0","#99a"][(r*5+i)%5]);}
  /* the bench */
  R(ctx,40,116,120,10,"#3a2c1c");R(ctx,44,126,8,44,"#2c2014");R(ctx,144,126,8,44,"#2c2014");
  for(let i=0;i<3;i++)glowR(ctx,58+i*28,108,12,8,"#101828");   /* sockets */
  text(ctx,"ACT  TOOL  WHY",100,106,"#8b8ba0",5);
  if(st.product){                                              /* on the bench */
    drawProduct(ctx,100,92,40,st.product,st.product.revealed?"full":"sketch");
  }
  /* procurement chute */
  R(ctx,20,70,10,40,"#232c3e");R(ctx,20,106,16,8,"#181f2c");
  glowR(ctx,22,74,6,4,"#8b5cf6");
  /* scrap bin */
  R(ctx,168,150,26,20,"#1c2430");R(ctx,166,148,30,4,"#2c3850");
  /* streak tally, gold on the wall */
  const streak=Math.min(st.streak||0,12);
  for(let i=0;i<streak;i++)
    glowR(ctx,206+(i%6)*7,60+Math.floor(i/6)*10,3,8,"#ffd700");
  if(streak)text(ctx,"THE STREAK",224,84,"#8b8ba0",5);
  /* THE SHUTTER — right wall */
  const rattle=st.summonses? ((frame%3)-1) : 0;
  R(ctx,236+rattle,52,58,110,"#1a1f28");
  for(let i=0;i<7;i++)R(ctx,238+rattle,58+i*15,54,2,"#242b38");
  R(ctx,258+rattle,150,16,5,"#404a5c");                        /* handle */
  if(st.summonses){
    ctx.save();ctx.shadowColor="#ff9955";ctx.shadowBlur=10;
    text(ctx,"KNOCK",265+rattle,44,"#ff9955",8);ctx.restore();
    for(let i=0;i<st.summonses;i++)glowR(ctx,242+i*10+rattle,166,6,6,"#ff9955");
  }
  if(st.subpoena){                                             /* nailed to it */
    ctx.save();ctx.translate(265,100);ctx.rotate(.05);
    R(ctx,-16,-20,32,40,"#e8dcc0");
    text(ctx,"SUB-",0,-6,"#900",8);text(ctx,"POENA",0,4,"#900",8);
    glowR(ctx,-2,-24,4,4,"#ff0044");ctx.restore();
  }
  /* brain poster, watching */
  R(ctx,120,62,44,40,"#0e0b12");
  R(ctx,132,72,20,14,"#ff006e");R(ctx,129,76,4,6,"#d90056");R(ctx,151,76,4,6,"#d90056");
  R(ctx,136,76,5,4,"#06b6d4");R(ctx,145,76,5,4,"#06b6d4");
  text(ctx,"THE BRAIN PROVIDES",142,96,"#8b8ba0",4);
}

/* ================= CAST SPRITES =================
   Small robots, distinct silhouettes, drawn at (x,y) feet-center. */
const bob=(f)=> (f>>3)%2;
export const CAST_SPRITES={
 supes(ctx,x,y,f){const b=bob(f);
  ctx.fillStyle="#8899bb";ctx.beginPath();                             /* cape */
  ctx.moveTo(x-8,y-30+b);ctx.lineTo(x+8,y-30+b);ctx.lineTo(x+13,y+2);ctx.lineTo(x-13,y+2);ctx.closePath();ctx.fill();
  R(ctx,x-7,y-28+b,14,22,"#00ccdd");R(ctx,x-6,y-38+b,12,10,"#00e5ff");
  R(ctx,x-4,y-35+b,3,3,"#fff");R(ctx,x+1,y-35+b,3,3,"#fff");
  glowR(ctx,x-3,y-22+b,6,6,"#ffd700");                                 /* S badge */
  R(ctx,x-7,y-6,5,6,"#08303a");R(ctx,x+2,y-6,5,6,"#08303a");
 },
 gary(ctx,x,y,f){const b=bob(f);
  R(ctx,x-8,y-26+b,16,20,"#b08d3f");R(ctx,x-8,y-26+b,16,3,"#8a6d2f");  /* dented box */
  R(ctx,x-10,y-36+b,20,10,"#333");                                     /* camera head */
  ctx.fillStyle="#000";ctx.beginPath();ctx.arc(x,y-31+b,4,0,7);ctx.fill();
  R(ctx,x-1,y-33+b,2,2,"#fff");glowR(ctx,x+7,y-35+b,3,3,"#ff0044");    /* rec light */
  ctx.strokeStyle="#555";ctx.beginPath();ctx.moveTo(x+8,y-12+b);        /* cable */
  ctx.quadraticCurveTo(x+18,y-4,x+13,y+2);ctx.stroke();
  R(ctx,x-7,y-6,5,6,"#5a4520");R(ctx,x+2,y-6,5,6,"#5a4520");
 },
 gi(ctx,x,y,f){const b=bob(f);
  R(ctx,x-9,y-28+b,18,22,"#cc0000");R(ctx,x-6,y-38+b,12,10,"#aa0000");
  glowR(ctx,x-4,y-35+b,3,2,"#ff2200");glowR(ctx,x+1,y-35+b,3,2,"#ff2200");
  R(ctx,x-13,y-26+b,4,14,"#aa0000");R(ctx,x+9,y-26+b,4,14,"#aa0000");  /* arms */
  R(ctx,x-3,y-20+b,6,6,"#ffd700");                                     /* badge */
  R(ctx,x-8,y-6,6,6,"#701010");R(ctx,x+2,y-6,6,6,"#701010");
 },
 sam(ctx,x,y,f){const b=bob(f);
  R(ctx,x-7,y-26+b,14,20,"#5b3fa8");R(ctx,x-6,y-36+b,12,10,"#7a5cd0");
  R(ctx,x-5,y-33+b,4,3,"#fff");R(ctx,x+1,y-33+b,4,3,"#fff");
  R(ctx,x-1,y-32+b,2,1,"#5b3fa8");                                     /* glasses bridge */
  R(ctx,x+8,y-20+b,7,10,"#f5f0e6");R(ctx,x+8,y-20+b,7,2,"#8b5cf6");    /* the book */
  R(ctx,x-7,y-6,5,6,"#3a2870");R(ctx,x+2,y-6,5,6,"#3a2870");
 },
 benny(ctx,x,y,f){const b=bob(f);
  R(ctx,x-8,y-26+b,16,20,"#1a2a1a");R(ctx,x-2,y-25+b,4,12,"#00ff88");  /* suit + tie */
  R(ctx,x-6,y-36+b,12,10,"#d8b08a");R(ctx,x-5,y-33+b,3,2,"#111");R(ctx,x+2,y-33+b,3,2,"#111");
  R(ctx,x-8,y-38+b,16,3,"#0a120a");                                    /* hairline */
  glowR(ctx,x+4,y-20+b,4,4,"#ffd700");                                 /* pin */
  R(ctx,x-7,y-6,5,6,"#0a120a");R(ctx,x+2,y-6,5,6,"#0a120a");
 },
 wendy(ctx,x,y,f){const b=bob(f);
  R(ctx,x-7,y-26+b,14,20,"#8a8a96");R(ctx,x-6,y-36+b,12,10,"#e8c8a0");
  R(ctx,x-5,y-33+b,3,2,"#111");R(ctx,x+2,y-33+b,3,2,"#111");
  R(ctx,x+7,y-22+b,8,11,"#e8dcc0");R(ctx,x+7,y-22+b,8,2,"#ff0044");    /* the folder */
  glowR(ctx,x-11,y-30+b,4,4,"#f5f0e6");                                /* flashlight */
  R(ctx,x-7,y-6,5,6,"#55555f");R(ctx,x+2,y-6,5,6,"#55555f");
 },
 lisa(ctx,x,y,f){const b=bob(f);
  R(ctx,x-7,y-26+b,14,20,"#a83a5a");R(ctx,x-6,y-36+b,12,10,"#e8c8a0");
  R(ctx,x-5,y-33+b,3,2,"#111");R(ctx,x+2,y-33+b,3,2,"#111");
  R(ctx,x-6,y-38+b,12,4,"#3a2a20");
  R(ctx,x+7,y-20+b,8,11,"#f5f0e6");R(ctx,x+8,y-18+b,6,1,"#333");
  R(ctx,x+8,y-15+b,6,1,"#333");                                        /* clipboard */
  glowR(ctx,x-4,y-20+b,4,4,"#ff66aa");                                 /* pin */
  R(ctx,x-7,y-6,5,6,"#6a2038");R(ctx,x+2,y-6,5,6,"#6a2038");
 },
 rob(ctx,x,y,f){const b=bob(f);
  R(ctx,x-7,y-26+b,14,20,"#2a3a6a");R(ctx,x-2,y-25+b,4,12,"#ff0044");
  R(ctx,x-6,y-36+b,12,10,"#d8b08a");R(ctx,x-5,y-33+b,3,2,"#111");R(ctx,x+2,y-33+b,3,2,"#111");
  glowR(ctx,x+4,y-20+b,4,5,"#66aaff");                                 /* torch pin */
  R(ctx,x-7,y-6,5,6,"#101a3a");R(ctx,x+2,y-6,5,6,"#101a3a");
 },
 stall(ctx,x,y,f){const b=bob(f);
  R(ctx,x-9,y-24+b,18,18,"#3a3a3f");                                   /* podium body */
  R(ctx,x-6,y-34+b,12,10,"#d8c8b0");R(ctx,x-8,y-36+b,16,4,"#e8e8ee");  /* white hair */
  R(ctx,x-5,y-31+b,3,2,"#111");R(ctx,x+2,y-31+b,3,2,"#111");
  R(ctx,x+8,y-22+b,7,4,"#8a6d2f");                                     /* gavel */
  text(ctx,"ZZ",x-14,y-26+b,"#8b8ba0",6);
  R(ctx,x-7,y-6,5,6,"#222226");R(ctx,x+2,y-6,5,6,"#222226");
 },
 brain(ctx,x,y,f){
  R(ctx,x-12,y-8,24,8,"#2c1e14");                                      /* pedestal */
  glowR(ctx,x-11,y-34,22,26,"rgba(0,255,255,.12)");                    /* glass */
  ctx.save();ctx.shadowColor="#ff006e";ctx.shadowBlur=10;
  R(ctx,x-8,y-28,16,12,"#ff006e");
  R(ctx,x-10,y-24,3,5,"#d90056");R(ctx,x+7,y-24,3,5,"#d90056");
  R(ctx,x-5,y-25,3,2,"#d90056");R(ctx,x+2,y-21,3,2,"#d90056");ctx.restore();
  if((f>>4)%3===0)glowR(ctx,x-3,y-23,6,2,"#00ffff");                   /* it noticed you */
 },
};

/* ================= PRODUCTS =================
   Chassis from TOOL, emitter from ACT, badge from PURPOSE,
   wear from the seed. mode: "full" | "sketch" | "icon".      */

const AURA=(s)=> s.mg>=s.mh&&s.mg>=s.mc ? "#ffd700" : (s.mh>=s.mc ? "#ff0044" : "#00ff88");

export function drawProduct(ctx,cx,cy,size,product,mode="full"){
  const rng=mulberry32(product.seed>>>0);
  const s=size/48;                       /* nominal 48 box */
  const ink = mode==="sketch" ? "#4a4238" : null;
  const col=(c)=> ink||c;
  ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);
  ctx.lineWidth=2/s;
  if(mode==="full"){
    ctx.save();ctx.shadowColor=AURA(product.stats);ctx.shadowBlur=14;
    ctx.fillStyle="rgba(0,0,0,0)";ctx.fillRect(-20,-20,40,40);ctx.restore();
  }
  CHASSIS[product.tool.chassis]?.(ctx,rng,col,mode);
  EMITTER[product.act.fx]?.(ctx,rng,col,mode);
  BADGE[product.purpose.badge]?.(ctx,col,mode);
  /* wear */
  if(mode!=="sketch"){
    ctx.fillStyle="rgba(0,0,0,.35)";
    const n=2+Math.floor(rng()*4);
    for(let i=0;i<n;i++)ctx.fillRect(-18+rng()*34,-16+rng()*30,2,1+rng()*2);
  }
  ctx.restore();
}

const box=(ctx,x,y,w,h,c,mode)=>{
  if(mode==="sketch"){ctx.strokeStyle=c;ctx.strokeRect(x,y,w,h);}
  else{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
};
const CHASSIS={
 box(ctx,r,c,m){box(ctx,-16,-8,32,22,c("#8b6f3f"),m);box(ctx,-16,-8,32,4,c("#6d572f"),m);
   box(ctx,-10,-12,8,4,c("#111"),m);box(ctx,2,-12,8,4,c("#111"),m);}, /* toaster slots */
 frame(ctx,r,c,m){for(const [dx,dy] of [[-10,-6],[10,-6],[-10,8],[10,8]]){
   box(ctx,dx-4,dy-2,8,4,c("#556"),m);box(ctx,dx-1,dy-6,2,4,c("#889"),m);}
   box(ctx,-6,-2,12,6,c("#334"),m);},
 panel(ctx,r,c,m){box(ctx,-16,-12,32,26,c("#e8e4d8"),m);
   if(m!=="sketch"){for(let i=0;i<4;i++)box(ctx,-14,-9+i*6,28,1,c("#8a8a7a"),m);
   for(let i=0;i<3;i++)box(ctx,-6+i*8,-11,1,24,c("#8a8a7a"),m);}},
 tube(ctx,r,c,m){box(ctx,-6,-14,14,24,c("#c8607a"),m);box(ctx,-14,6,16,8,c("#c8607a"),m);
   box(ctx,-6,-14,14,4,c("#e8a0b4"),m);},
 machine(ctx,r,c,m){box(ctx,-14,-16,28,34,c("#282050"),m);box(ctx,-10,-12,12,20,c("#0d0a1e"),m);
   box(ctx,4,-12,8,10,c("#ffd700"),m);box(ctx,4,2,8,4,c("#111"),m);},
 mill(ctx,r,c,m){box(ctx,-16,4,30,6,c("#333"),m);box(ctx,-16,0,4,6,c("#556"),m);
   box(ctx,12,-14,4,20,c("#556"),m);box(ctx,4,-14,14,4,c("#334"),m);},
 jar(ctx,r,c,m){box(ctx,-10,-14,20,4,c("#556"),m);box(ctx,-12,-10,24,24,c(m==="sketch"?"#4a4238":"rgba(120,220,255,.35)"),m);
   box(ctx,-6,-4,12,9,c("#ff006e"),m);},
 hinge(ctx,r,c,m){box(ctx,-16,2,32,7,c("#900"),m);box(ctx,-16,-6,26,6,c("#b22"),m);
   box(ctx,-16,-2,6,4,c("#600"),m);},
 duct(ctx,r,c,m){box(ctx,-18,-4,36,12,c("#99a"),m);box(ctx,-18,-4,6,12,c("#778"),m);
   box(ctx,12,-4,6,12,c("#778"),m);if(m!=="sketch"){box(ctx,-8,-1,4,6,c("#556"),m);box(ctx,2,-1,4,6,c("#556"),m);}},
 loop(ctx,r,c,m){if(m==="sketch"){ctx.strokeStyle=c("#");ctx.strokeRect(-8,-14,16,20);}
   else{ctx.strokeStyle="#d22";ctx.lineWidth=3;ctx.strokeRect(-8,-14,16,20);}
   box(ctx,-6,6,12,8,c("#eee"),m);box(ctx,-4,8,8,4,c("#111"),m);},
 bird(ctx,r,c,m){box(ctx,-10,-4,16,10,c("#889"),m);box(ctx,4,-8,8,6,c("#99a"),m);
   box(ctx,10,-6,3,2,c("#fa0"),m);box(ctx,-14,-2,6,4,c("#667"),m);
   box(ctx,-2,6,2,5,c("#fa0"),m);box(ctx,2,6,2,5,c("#fa0"),m);},
 cubes(ctx,r,c,m){for(let i=0;i<3;i++){box(ctx,-16+i*11,-4-((i%2)*6),10,10,c("#3fd0a0"),m);
   if(i<2)box(ctx,-6+i*11,0-((i%2)*3),2,2,c("#fff"),m);}},
 ring(ctx,r,c,m){for(let i=0;i<8;i++){const a=i/8*Math.PI*2;
   box(ctx,Math.cos(a)*13-2,Math.sin(a)*10-3,5,6,c("#d8b08a"),m);}
   box(ctx,-5,-3,10,6,c("#e8e4d8"),m);}, /* the sandwich platter */
 dish(ctx,r,c,m){box(ctx,-2,-2,4,16,c("#556"),m);
   if(m==="sketch"){ctx.strokeStyle=c("#");ctx.beginPath();ctx.arc(0,-6,12,Math.PI,0);ctx.stroke();}
   else{ctx.fillStyle="#99a";ctx.beginPath();ctx.arc(0,-6,12,Math.PI,0);ctx.fill();}
   box(ctx,-1,-12,2,6,c("#f00"),m);},
};

const EMITTER={
 antenna(ctx,r,c,m){box(ctx,-1,-22,2,10,c("#aab"),m);box(ctx,-3,-24,6,3,c("#ff0044"),m);},
 gauge(ctx,r,c,m){box(ctx,10,-20,10,8,c("#eee"),m);box(ctx,14,-18,2,4,c("#f00"),m);},
 halo(ctx,r,c,m){if(m==="sketch"){ctx.strokeStyle=c("#");ctx.beginPath();ctx.arc(0,-20,7,0,7);ctx.stroke();}
   else glowRLocal(ctx,-7,-22,14,3,"#ffd700");},
 eye(ctx,r,c,m){box(ctx,-5,-22,10,8,c("#fff"),m);box(ctx,-2,-20,4,4,c("#06b6d4"),m);box(ctx,-1,-19,2,2,c("#000"),m);},
 teeth(ctx,r,c,m){for(let i=0;i<5;i++)box(ctx,-12+i*6,-20,4,6,c(i%2?"#ddd":"#999"),m);},
 beacon(ctx,r,c,m){box(ctx,-3,-22,6,6,c("#f60"),m);if(m!=="sketch"){box(ctx,-8,-20,4,2,c("#f60"),m);box(ctx,4,-20,4,2,c("#f60"),m);}},
 clock(ctx,r,c,m){box(ctx,-5,-24,10,10,c("#eee"),m);box(ctx,-1,-22,2,4,c("#000"),m);box(ctx,0,-19,3,2,c("#000"),m);},
 coin(ctx,r,c,m){box(ctx,-4,-23,8,8,c("#ffd700"),m);if(m!=="sketch")box(ctx,-1,-21,2,4,c("#8a6d00"),m);},
 wave(ctx,r,c,m){for(let i=0;i<3;i++)box(ctx,-9+i*7,-20-(i%2)*3,5,2,c("#0ff"),m);},
 arrow(ctx,r,c,m){box(ctx,-2,-24,4,10,c("#0f8"),m);box(ctx,-5,-16,10,3,c("#0f8"),m);},
 dove(ctx,r,c,m){box(ctx,-6,-21,8,5,c("#fff"),m);box(ctx,2,-24,5,4,c("#fff"),m);box(ctx,6,-22,2,1,c("#fa0"),m);},
 stampfx(ctx,r,c,m){box(ctx,-6,-22,12,4,c("#900"),m);box(ctx,-2,-18,4,6,c("#556"),m);},
};
function glowRLocal(ctx,x,y,w,h,col){ctx.save();ctx.shadowColor=col;ctx.shadowBlur=8;
  ctx.fillStyle=col;ctx.fillRect(x,y,w,h);ctx.restore();}

const BADGE={
 baby(ctx,c,m){box(ctx,12,8,8,8,c("#ffd0e0"),m);box(ctx,14,10,2,2,c("#000"),m);box(ctx,17,10,2,2,c("#000"),m);},
 cane(ctx,c,m){box(ctx,14,4,2,12,c("#b08d3f"),m);box(ctx,12,4,4,2,c("#b08d3f"),m);},
 chart(ctx,c,m){box(ctx,12,12,2,4,c("#0f8"),m);box(ctx,15,9,2,7,c("#0f8"),m);box(ctx,18,6,2,10,c("#0f8"),m);},
 chevron(ctx,c,m){box(ctx,12,8,8,2,c("#ffd700"),m);box(ctx,13,11,6,2,c("#ffd700"),m);box(ctx,14,14,4,2,c("#ffd700"),m);},
 clip(ctx,c,m){box(ctx,12,6,8,11,c("#f5f0e6"),m);box(ctx,14,4,4,3,c("#889"),m);},
 cloud(ctx,c,m){box(ctx,12,9,9,4,c("#cdd"),m);box(ctx,14,7,5,3,c("#cdd"),m);},
 heart(ctx,c,m){box(ctx,12,8,3,3,c("#f26"),m);box(ctx,17,8,3,3,c("#f26"),m);box(ctx,13,11,6,3,c("#f26"),m);box(ctx,15,14,2,2,c("#f26"),m);},
 stamp(ctx,c,m){box(ctx,12,7,8,8,c("#900"),m);box(ctx,14,9,4,4,c("#fdd"),m);},
 paw(ctx,c,m){box(ctx,13,11,6,5,c("#b08d3f"),m);box(ctx,12,8,2,2,c("#b08d3f"),m);box(ctx,15,7,2,2,c("#b08d3f"),m);box(ctx,18,8,2,2,c("#b08d3f"),m);},
 gavel(ctx,c,m){box(ctx,12,8,6,4,c("#8a6d2f"),m);box(ctx,15,12,2,5,c("#8a6d2f"),m);},
 tree(ctx,c,m){box(ctx,13,6,6,6,c("#0a4"),m);box(ctx,15,12,2,5,c("#642"),m);},
 moon(ctx,c,m){box(ctx,13,7,6,8,c("#ffd"),m);box(ctx,16,8,4,6,c("#07070b"),m);},
};

/* Napkin backdrop for sketch mode. */
export function drawNapkin(ctx,w,h,seed){
  const rng=mulberry32(seed>>>0);
  R(ctx,0,0,w,h,"#0a0a10");
  ctx.save();ctx.translate(w/2,h/2);ctx.rotate((rng()-.5)*.06);
  R(ctx,-w/2+14,-h/2+12,w-28,h-24,"#efe8d8");
  ctx.strokeStyle="#d8d0bc";ctx.strokeRect(-w/2+22,-h/2+20,w-44,h-40);
  for(let i=0;i<4;i++){                                     /* grease stains */
    ctx.fillStyle=`rgba(160,140,90,${.10+rng()*.12})`;
    ctx.beginPath();
    ctx.ellipse(-w/2+30+rng()*(w-60),-h/2+26+rng()*(h-52),6+rng()*16,4+rng()*10,rng()*3,0,7);
    ctx.fill();
  }
  ctx.restore();
}

/* ================= MINIMAP ================= */
const TYPE_COLORS={break:"#ffd700",lab:"#00ffff",present:"#ff66aa",closet:"#00ff88",
  vending:"#8b5cf6",conference:"#66aaff",cafeteria:"#ff9955",hr:"#f5f0e6",
  corridor:"#4a4a5e",mailroom:"#d8b08a",archive:"#00cc70",arcade:"#ff7733",
  executive:"#ff0044"};

export function drawMap(ctx,w,h,state,roomAtFn,frame=0){
  R(ctx,0,0,w,h,"#07070b");
  const CS=Math.floor(Math.min(w,h)/7);
  const ox=Math.floor(w/2), oy=Math.floor(h/2);
  const {x:px,y:py}=state.pos;
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
    const x=px+dx,y=py+dy,key=x+","+y;
    const cx=ox+dx*CS, cy=oy+dy*CS;
    const seen=state.visited[key];
    const here=dx===0&&dy===0;
    if(!seen&&!here){ /* unknown: faint static if adjacent through an open door */
      continue;
    }
    const room=roomAtFn(x,y);
    ctx.fillStyle=here?"#181826":"#101018";
    ctx.fillRect(cx-CS/2+2,cy-CS/2+2,CS-4,CS-4);
    ctx.strokeStyle=TYPE_COLORS[room.type]||"#333";
    ctx.lineWidth=here?2:1;
    ctx.strokeRect(cx-CS/2+2,cy-CS/2+2,CS-4,CS-4);
    /* door notches; held doors notch in their holder's color */
    ctx.fillStyle="#666";
    if(room.doors.N)ctx.fillRect(cx-2,cy-CS/2,4,3);
    if(room.doors.S)ctx.fillRect(cx-2,cy+CS/2-3,4,3);
    if(room.doors.W)ctx.fillRect(cx-CS/2,cy-2,3,4);
    if(room.doors.E)ctx.fillRect(cx+CS/2-3,cy-2,3,4);
    const hd=room.held||{};
    const hcol=w=>CAST[w]?.color||"#666";
    if(!room.doors.N&&hd.N){ctx.fillStyle=hcol(hd.N);ctx.fillRect(cx-2,cy-CS/2,4,3);}
    if(!room.doors.S&&hd.S){ctx.fillStyle=hcol(hd.S);ctx.fillRect(cx-2,cy+CS/2-3,4,3);}
    if(!room.doors.W&&hd.W){ctx.fillStyle=hcol(hd.W);ctx.fillRect(cx-CS/2,cy-2,3,4);}
    if(!room.doors.E&&hd.E){ctx.fillStyle=hcol(hd.E);ctx.fillRect(cx+CS/2-3,cy-2,3,4);}
    if(here){const pulse=(frame>>2)%2;                       /* you */
      ctx.fillStyle=pulse?"#f5f0e6":"#ffd700";
      ctx.fillRect(cx-3,cy-3,6,6);}
    else if(room.hearing){ctx.fillStyle="#ff0044";ctx.fillRect(cx-2,cy-2,4,4);}
  }
  text(ctx,"THE FLOOR IS THE RUN",w/2,h-4,"#3a3a4a",6);
}
