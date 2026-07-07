# USE CASE ARMS RACE: SHOW LAUNCH RUNBOOK
## Daily Operations, Launch Checklist, and Standards

Version 1.0. Owner: Jason Shearer. The show is the front door; the registry
is the record; the game is the engine. This runbook wires the three without
letting their voices bleed. Registry voice: neutral. Show voice: OWNER only.

---

## 1. FORMAT LOCK (confirm before launch, OWNER)

- Cadence: six episodes per week. There is no day seven. The dark day is
  canonical and stated on the schedule page, not apologized for.
- Season: six days by structure. Season length in weeks: OWNER.
- Episode anatomy (target runtime OWNER, suggest under 5 minutes):
  1. Cold open
  2. Case of the Day (one registry case, shown as its card)
  3. The Ticker (2 to 4 rapid items: flips, new legendaries, review outcomes)
  4. Battle Report (best EBL battle since last episode, replay footage)
  5. Call to action (vote on the Case of the Day; claim window opens)
- The Case of the Day becomes EBL's Card of the Day at publish time (free to
  play for 24h, win-with-it-keep-it, per the EBL plan flywheel).

## 2. DATA CONTRACT

```sql
create table episodes (
  id uuid primary key default gen_random_uuid(),
  number int unique not null,
  air_date date not null,
  featured_case_id uuid not null,
  ticker_case_ids uuid[] not null default '{}',
  battle_replay_id uuid,           -- EBL battle id, export bundle
  video_url text,
  published_at timestamptz
);
```
Publish flow: setting published_at fires (a) Card of the Day flag on the EBL
side, (b) feed pin of the featured case for 24h, (c) watch notifications.
One edge function, one transaction, idempotent.

## 3. THE DAILY PIPELINE (times local, TUNABLE)

- 05:30 Steward compiles the brief (MODEL_STEWARD_SPEC 2.4): top new cases
  with sources, overnight flips, battle results with replay links, review
  outcomes, anomalies. Neutral prose, case IDs cited, no jokes. Delivered to
  admin inbox and dashboard.
- Morning: Jason picks the Case of the Day from the brief (the steward may
  rank candidates by votes, impact, and battle activity; the pick is OWNER,
  always). Writes and records. K'Dee production workflow: OWNER.
- Replay footage: pull the export bundle (EBL plan Phase 6), run the replay
  page in capture mode. The replay is deterministic, so retakes are free.
- Pre-publish gate, every episode, no exceptions:
  - [ ] Featured case is machine_verified (never under_review or retracted)
  - [ ] Source URL live as of this morning (steward rechecks in the brief)
  - [ ] Card art current (re-minted if the case was corrected)
  - [ ] No [COPY] placeholders visible in any shown frame
  - [ ] Episode row created with featured_case_id before video upload
- Publish. Verify Card of the Day flipped on EBL and the feed pin is live.
- If the Case of the Day gets suspended AFTER airing: the episode stands,
  the case page banner does the talking, and the next episode's Ticker
  reports the review outcome. The record correcting itself on air is the
  format working, not a crisis.

## 4. LAUNCH CHECKLIST

T-14 days
- [ ] Phases U1 and U2 live (feed, autoverify); EBL Phase 1 minting live
- [ ] Backfill minted; every existing case has card art
- [ ] Standards page drafted (section 5) and legal-reviewed to OWNER's
      comfort level
- [ ] Steward prompts frozen at v1; hostile-input fixtures passing in CI

T-7 days
- [ ] Phase U3 live (complaints, review, EBL propagation) and tested with a
      staged complaint end to end
- [ ] Six episodes of Case of the Day candidates shortlisted (buffer)
- [ ] Two full dress-rehearsal episodes produced, one including a staged
      battle replay
- [ ] OG/Twitter card unfurl verified on X, LinkedIn, Discord
- [ ] The steward's own registry entry filed and machine_verified (the
      registry documents its own AI, votable like any case)

T-1 day
- [ ] Episode 1 recorded, gated, scheduled
- [ ] Admin paging tested (named-party complaint path fires email)
- [ ] Rollback rehearsed: FLAG_COMPLAINTS off leaves feed and show intact

Launch day
- [ ] Publish episode 1; confirm Card of the Day, feed pin, notifications
- [ ] Watch the review queue and rate limits live for the first 6 hours
- [ ] Post-launch note in CONTENT_TODO for any copy gaps found live

Week 1 metrics (baseline, not targets): episode completion rate, cases
submitted per day, vote actions per visitor, share-outs to X, complaint
volume and dismissal rate, Card of the Day claim count.

## 5. THE STANDARDS PAGE (public, ships at launch)

One page on usecasearmsrace.com, linked from every case. Plain language.
Contents, in order:
1. What the registry is: documented AI use cases, every case sourced.
2. What MACHINE VERIFIED means and does not mean (documentation confirmed
   by an AI first pass; not an endorsement; not a virtue judgment).
3. Who judges Good and Evil: the community, by vote, changeable, and cards
   flip when the vote crosses the line. The site takes no position.
4. How to complain: the form, what happens (immediate triage, suspension
   from game use when upheld, human review, published outcome), the SLA,
   and the named-party fast lane for organizations that appear in a case.
5. Corrections log: the public status history, sitewide, newest first.
6. The AI disclosure: the steward, what it can and cannot do (from
   MODEL_STEWARD_SPEC section 4), and a link to its own registry entry.
7. Satire notice: Evil Brain Labs is a satirical game and show that consumes
   this registry read-only; card ratings there are community vote data;
   organization names appear as documented fact, never with logos or brand
   identity. [COPY: final satire notice wording is OWNER with counsel]

This page is the answer to "a shocking way to approach AI safety." The shock
is the format. The page is the receipts.

End of runbook.
