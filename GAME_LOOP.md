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
