# Evil Brain Labs: The Registry

A public registry of bad AI use cases. Third worst in AI.

## Overview

The Registry is a satirical but fully functional semantic registry where each use case:
- Mints a unique coin with a valence (good or evil)
- Can be flipped by its owner for free, forever
- Accumulates pressure from third-party votes
- May face Tribunal review at pressure threshold 10

## Tech Stack

- **Frontend:** Static HTML/CSS/JS, deployable to GitHub Pages
- **Backend:** Supabase (Postgres, Auth, Edge Functions)
- **Graph:** D3.js force-directed visualization
- **Search:** Postgres full-text search (keyword-based)

## Setup

### 1. Supabase Project

You already have a Supabase project at `aslcrwmbdtvimjrexxzw.supabase.co`.

Run the schema in order:
1. `supabase/schema.sql` - Creates all 11 tables
2. `supabase/rls_policies.sql` - Sets up Row Level Security

### 2. Deploy Edge Functions

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Link to your project
supabase link --project-ref aslcrwmbdtvimjrexxzw

# Deploy functions
supabase functions deploy submit_use_case
supabase functions deploy cast_vote
supabase functions deploy self_flip
```

### 3. Update Config

Edit `js/config.js` with your Supabase URL and anon key (already set to your project).

### 4. Deploy Frontend

Push to GitHub and enable GitHub Pages on the `main` branch, or use the `feature/registry-pivot` branch.

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Registry Browser | `/` | Browse and search use cases |
| Submit | `/submit.html` | Submit a new bad idea |
| Use Case Detail | `/use-case.html?id=xxx` | View coin, flip history, vote |
| The Graph | `/graph.html` | D3 visualization of entities and triples |
| Profile | `/profile.html` | Your coins, votes, and Braincoin balance |

## Economy

- **Braincoins** (fungible): Start with 3. Earn 1 per submission. Spend 1 to vote.
- **Registry Coins** (artifacts): One per use case. Track provenance via flip history.
- **Voting**: Costs 1 Braincoin stake. Tribunal rules with you = returned. Against = burned.
- **Pressure**: +1 per vote, +10 with evidence. Threshold 10 triggers Tribunal review.

## Database Tables

### Foundation
- `profiles` - Users, linked to Supabase auth
- `sources` - Provenance for all facts
- `entities` - Things (orgs, products, tech, etc.)
- `entity_links` - Reversible resolution links
- `predicates` - Controlled vocabulary (entity verbs + logic connectors)

### Asserted Layer (Ink)
- `use_cases` - The registry's unit of record
- `triples` - Subject → predicate → object facts
- `meta_edges` - Triple-to-triple connections

### Economy
- `coins` - One per use case, flippable
- `flips` - Flip history (self-flips and tribunal)
- `votes` - Staked votes from third parties

### Inferred Layer (Pencil)
- `inferences` - Model beliefs, fully regenerable

## Visual Style

Hand-lettered paper aesthetic:
- **Ink** (solid black): Asserted facts
- **Pencil** (gray, dashed): Inferred content
- **Crayon red**: Warnings and "UNDER TRIBUNAL REVIEW" stamp only

## What's NOT in Build 1

- Tribunal UI (rule from Supabase dashboard)
- Coin trading or transfers
- Realtime subscriptions
- The Composer (paper-doll SVG builder)
- The Pipeline (Whisper, triple extraction, clustering)
- Semantic search (using keyword search for now)
- Payments or anything cash-adjacent

## License

© 2026 Evil Brain Labs. The record is the joke. The joke is true.
