# SUBLEVEL B — THE OFFICE LABYRINTH
## Core game design (pinned 2026-08-13, from Jason's spec — build against THIS)

**One line:** a touch-first roguelike crawl through an endless procedurally
generated office hell, where every room is a different way to build and ship
an AI product, and everything you ship keeps living in the world after you do.
Modern NetHack in business casual. Adventure-game charm, roguelike spine.

---

## THE LOOP

WALK → ROOM → BUILD → SHIP → NEWS CYCLE → IT COMES BACK.

1. **WALK.** The labyrinth: an endless floor plan of generated rooms (seeded,
   persistent per run). Tap a door to move. The map is the run.
2. **ROOM.** Each room is a scenario with its own robots, its own items, and
   its own UI for making things:
   - **Break room** — sketch a product on a napkin (freeform: drag grease-stain
     parts onto the napkin; lowest fidelity, highest chaos multiplier).
   - **Presentation room** — pitch to procedurally seated world leaders
     (slide-builder UI; audience mood is the mechanic; Stall may be chairing).
   - **Laboratory** — precision assembly (full part-stat UI, socketed builds,
     Supes or Gary as lab partner modifying what's possible).
   - **Conference rooms, server closets, HR annex, the cafeteria, the
     mailroom, vending alcoves, an executive floor that shouldn't exist** —
     each type = distinct interaction verb, not reskinned cards.
3. **BUILD.** Products assemble from the EBL grammar (ACT + TOOL + PURPOSE)
   with hidden stats (margin / mayhem / mercy). The ROOM determines the build
   interface and its biases. You can SEE the product — procedurally drawn
   from its parts (see ART).
4. **SHIP.** Launch from wherever you are. Shipping triggers…
5. **NEWS CYCLE.** A generated front page: headlines assembled from product
   stats + cast takes + current world state. Fun, fast, readable — the reward
   moment. (Post-MVP wiring: echo real UCAR docket flavor into the cycle.)
6. **IT COMES BACK.** The Ledger (below) schedules consequences: recalls,
   second customers, the turn, hearings about YOUR product — surfacing as
   rooms, board posts, news items, and character grudges, weeks later.

## THE MEMORY SYSTEMS (what makes it a world, not a deck)

- **The Ledger.** Every shipped product is a persistent record with delayed
  consequence hooks (week-5 ship → week-50 knock at a conference room door).
  Consequences are generated from the product's own stats + who funded it.
- **Relationships.** Ongoing per-character affinity (Supes, Gary, GI, Sam,
  Benny, Wendy, Lisa, Rob, Stall, the Brain). Moved by interactions, pitches,
  and what your products did to their constituencies. Characters remember,
  greet you differently, block or open doors, defend or dunk on you on the
  board. Trust persists across runs (personnel file).
- **The World Ticks.** Things happen to OTHER people between your actions —
  generated character events that show up on the board and in the news, and
  can intersect your ledger ("GI 'rescued' the venue your product was
  launching at").
- **The Message Board.** In-world work forum: cast posts, replies to your
  ships, trade offers, HR notices, anonymous posts that are obviously the
  Brain. Interactive — you can post, with consequences.

## ROGUELIKE FRAME

Run = Employment. Attrition is permanent (doom clock, suspicion, and now:
labyrinth hazards). Personnel file persists: lore (Galt Papers), trust,
roles, unlocked room types, ledger echoes into future employments ("a
previous employee shipped this" — it was you).

## TOUCH-FIRST

Tap-to-move, drag-to-build, swipe between board/news/map. 44px minimum
targets. No hover-dependent anything. Works one-handed on a phone.

## ART — PROCEDURAL, CHARMING, CRT-NEON

The original /lab's aesthetic is the reference (CRT scanlines, neon on black,
typewriter text) — NOT the flat-card look of basement v1. Rooms, robots,
items, vending machines, and PRODUCTS render from seeded procedural canvas/SVG
composition (part shapes + palettes + wear), so every room genuinely looks
different. Port/extend the old graphicsEngine.js approach.

## TECH

Static, self-contained on evilbrainlabs.com (the /basement.html easter-egg
door stays as the entrance). Seeded RNG (shareable runs), localStorage saves,
modular JS files this time (engine / rooms / gen / ledger / board / news /
art). No backend required for MVP; UCAR wiring optional later.

## BUILD ORDER (MVP → expansions)

1. Labyrinth walk + procedural room renderer (5 room types) + touch controls.
2. Build interfaces: napkin, lab, presentation (3 verbs at MVP).
3. Ship + news cycle generator + ledger with delayed hooks.
4. Relationships + message board.
5. World ticks, more room types, Galt Papers integration, minigame alcoves
   (the arcade five survive as vending/alcove encounters).

Kickoff phrase for a fresh session: **"build the basement loop per GAME_LOOP"**.

---

## THE POINT (pinned 2026-08-14, Jason — supersedes every correction below)

The corrections below are the record of getting this wrong four ways. Read
them as history, not instructions. This section wins every conflict.

**Inventing use cases is free. Always. From anywhere.** No parts, no
inventory, no synergy gates, no chute, no scrap bin. Delete every economy
that stands between the player and making up something absurd. The grammar
is a toybox and it is always open. If inventing ever costs a resource, the
game is broken.

**The world is your invention's aftermath, played as an adventure.** You
ship a thing, and the world rearranges around it: you present it to world
leaders, you do the press tour, you run into Supes in the hallway where she
has already deployed it wrong, GI has already weaponized it with love,
Benny is already selling the merch. Exploration is not scavenging — it is
walking through the life your product created, scene by scene, text
adventure crossed with King's Quest. People, jokes, consequences. You never
"find shit." You meet your own decisions wearing costumes.

**The loop:** INVENT (free, fast, funny) → the world BECOMES the
consequences → WANDER it as adventures → something you see makes you want
to invent the next one. The product is not the goal; the product is the
plot generator. The fake-PM lifestyle — shipping, presenting, being taken
seriously by absurd people — is the fantasy being sold.

Keep: the art, the rooms, the cast, the news cycle, the board, the ledger's
memory. Kill: every resource system. When in doubt between a mechanic and a
scene, write the scene.

---

## COURSE CORRECTION v2 (pinned 2026-08-13, Jason — supersedes v1): THE SHOP AND THE SUMMONS

**Pure fiction. No Use Case Arms Race tie-in, ever.** No real docket quotes,
no real case echoes. Delete any UCAR wiring, planned or built. The game lives
entirely inside the Evil Brain Labs story.

**The loop is overwork, interrupted.**

1. **THE SHOP is home.** One main room, always available, full build UI.
   The player can ship product after product after product from here —
   grinding is legal, rewarded, and the point. Ship streaks compound.
2. **THE SUMMONS is the antagonist.** The game forcibly drags you away from
   shipping: mandatory meetings, hearings about last week's product, GI's
   drills, Supes emergencies, HR audits, the vending machine incident. A
   summons pulls you into a procedurally generated room — THAT is what the
   labyrinth is for. You are never wandering; you are being taken.
3. **Every summons is a tax on shipping.** Attending costs shop time.
   Ignoring costs trust, suspicion, or doom — and some summons escalate if
   ducked (the hearing becomes a subpoena; the drill comes to YOU).
4. **Overwork feeds the interruptions.** The more you ship, the hotter you
   run: consequences of your own products return as summons, and the
   company gets needier about its star employee. Shipping is the engine of
   the thing that stops you shipping. That is the game.
5. **Score is your shipped docket** (fictional, in-world): products,
   verdicts, consequences, streaks.

Acceptance: a player who wants to do nothing but ship should be able to try
— and be dragged out of the shop within every few ships, snarling. If they
can grind uninterrupted forever, it's wrong; if they can't ship three in a
row when things are calm, it's also wrong.

---

## COURSE CORRECTION v3 (pinned 2026-08-14, Jason): THE DOOR COMES BACK

v2 said the labyrinth is where you get TAKEN. It did not say weld the door
shut. The map was amputated and the world went dead: two ships in, a player
sat at a bench reading SHIP MORE with every verb grayed. Fix the frame:

1. **The MAP tab returns.** The shop has a door. Between ships you MAY walk
   the floor — short, capped excursions that always cost a little doom
   (time is never free). Walking is how you go TOWARD the world: scavenge a
   part of a kind YOU CHOOSE, visit a coworker, hit an alcove. Summonses
   still drag you out; the door lets you leave on your own feet too.
2. **Kill kind-starvation.** The bench says which kind it's missing; the
   chute must sell parts BY KIND (premium price beats a dice roll). A store
   that gambles your restock is a slot machine, not procurement.
3. **Napkin gate bug:** NAPKIN SKETCH grayed while napkins ×1 in stock.
   A napkin plus any two parts should sketch. Fix the predicate.
4. **THE SILENCE RULE (acceptance, hard):** after any two consecutive
   player actions, SOMETHING must move without input — a summons, a board
   reply, a news wire, a ledger knock, a coworker wandering in. If the
   player has nothing to do AND nothing is arriving, that state is a bug by
   definition, not difficulty.
5. **First knock comes early.** A shipped product's first ledger followup
   must land within 1-2 ships, not week 5 — teach the loop before you
   deepen it.
