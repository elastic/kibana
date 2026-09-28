---
name: security-file-bug
description: >
  Draft and file a Kibana Security Solution bug on elastic/kibana after the
  human confirms the draft. Use when the user says "create a bug", "file a
  ticket", "post this bug", "comment this on #N", or "file this finding".
  Do not run unless someone asked to file a bug.
disable-model-invocation: true
---

# Security file-bug

Help produce a **good Security Solution bug report**, then write it to GitHub only after an **explicit yes**.

Do not offer to file anything on your own initiative. Do not invent steps, expected behaviour, versions, or feature-flag names.

Never describe a failure only as an unspecified error. Put the **exact error message** (toast, flyout, console, stack) in **Current behaviour** and in **Errors in browser console** / **Logs** when that is where it showed up. If the message is not in the pack or on screen, ask for it.

Repo: `elastic/kibana`. Body template: this skill's `templates/bug-report.md` (not `.github/ISSUE_TEMPLATE/Bug_report.md`). Follow `.agents/skills/kbn-github` (explicit confirm, then `gh`).

`disable-model-invocation: true` — run only when someone asks to file a bug or to comment on an existing ticket.

## What a good ticket needs

- Headings from `templates/bug-report.md`.
- **Version** (stack). **Original install method** when known (`from source (dev)` for local/scout).
- **Steps to reproduce**, **Current behaviour (with screenshots and recordings)**, **Expected behavior**.
- **Title** (new issues): `[<team name>] <short symptom>`. Run `format-title` after you have a `Team:*` label (human or `infer-team`). If inference is `ask`, ask the human before create. Do not invent a team.
- **Feature flags:** exact flag id, on/off, and **how to enable it**. If confirmed default/GA, write `No feature flag (default/GA)`.
- **Deployment:** ECH, serverless, or both — where the bug reproduces. Run `infer-deployment`. Confident when the pack names `deployment`, or tester `environment.type` is `serverless` → Serverless or `stateful-ess` / `stateful-classic` → ECH, or Scout `arch`/`domain` is `serverless` / `stateful`. A URL that contains `cloud` is a **hint** — still ask. `kind: scout` or `kind: local` with no type/arch/URL → ask. `user-provided` without more signal → ask. Write **both** only if the human or pack says both. Prefill **Spaces** from `space_id` (session space, not “both”). Prefill **Role** from `setup.resolved_role` when present.
- **Role required to reproduce:** specific Kibana/Security role, or none / any.
- **Spaces:** default space, custom space, or both.
- **Preconditions:** only when the repro needs setup before step 1 (data, integrations, flags already covered above, users, index state). Omit the heading when there are none.
- Omit **Server OS version**, **Browser and Browser OS versions**, **Elastic Endpoint version**, **Errors in browser console**, and **Logs and/or server output** when empty. Same for any other heading with no value.
- Write `Unknown` **only** when the human or JSON said they do not know. Never write `_unknown_`.
- A filled heading that is still **vague** is a gap (same as missing): “an error appears”, “it doesn’t work”, “broken”, “works”, “as expected”. One follow-up, then `Unknown`.
- **Hard stop:** after each always-ask, environment-setup, or vague follow-up, end the turn. Do not batch questions.
- Quote the **exact** toast / flyout / console / stack text. Use full `https://github.com/elastic/kibana/issues/N` URLs. Title: `[<team>]` + observable symptom, no trailing period, ≤72 characters (`format-title` enforces this).

## Always ask if missing

Do not treat the draft as complete (and do not ask for a write-yes) until these are answered or the human says they do not know. Ask one at a time. Do not invent answers. Applies to **both** from-scratch and exploratory-tester handoff.

1. Is the functionality behind a **feature flag**? If yes: exact flag id, on/off, and how to set it up.
2. Does the bug happen on **ECH**, **serverless**, or **both**?
3. Is a **specific role** required to reproduce?
4. Can it be reproduced in the **default space**, a **custom space**, or **both**?

If the human says they do not know, **keep the heading** and write `Unknown`. Do not omit it. If they give a vague answer, ask once more; then `Unknown`.

Do not assume every session is local Scout. Read `config.json` / the session URL / Scout architecture (stateful vs serverless). If `infer-deployment` is confident, use that label. If it exits 2, ask — including when the URL merely contains `cloud`. You may still note Scout or local under install method or Preconditions as *how* it was exercised.

## Thin pack

A pack is **thin** when `check-pack` exits 2. That means any of these is missing (not answered, not `Unknown`): **Version**, **Steps**, **Current behaviour**, **Expected**, or an always-ask field that cannot be inferred — or current/expected is **vague**, or an error is mentioned without a quoted / typed message. `Unknown` counts as answered. Run environment-setup questions on a thin pack.

## Fileable checklist

Do not ask for a write-yes until `check-draft` exits 0, or you have walked every remaining gap with the human (`Unknown` is allowed). Required:

- Exact error quoted, or console/logs heading with the typed error, or they said there is none / `Unknown`
- Numbered steps someone else can follow
- Version or `Unknown`
- Four always-ask fields answered or `Unknown`
- Create title is `[team] symptom` (≤72 chars)
- Stamp present: `Filed via security-file-bug`
- `scan-sensitive` exit 0, or they confirmed the hits should stay / be stripped

## Sanitize

Before draft-and-stop, run `scan-sensitive` on the finding and draft. Flag emails, `SDH…` / case IDs, NDA, “customer name/id”. Strip or ask to strip anything not needed to repro. Default repo stays `elastic/kibana`. If they say the content is sensitive / NDA, **stop** and ask whether to file in `elastic/security-team` instead — do not switch silently.

## Environment setup questions

Ask what a reproducer needs to stand up the environment — one question at a time, only what is still unknown. Skip a question if the pack or chat already answered it.

Do this for from-scratch filings **and** for a **thin** exploratory-tester pack.

- How they installed / which deployment they used (if not already answered)
- Sample data, Fleet, integrations, endpoint, or other products that must be present
- Users, privileges, or spaces beyond the always-ask role/space questions
- Anything else that belongs under **Preconditions:**

Do not assume a local or Scout session is what a triager will use. Write the answers into **Preconditions:** when they are needed to reproduce.

## Inputs

Any of these (one bug per loop):

1. Pasted description + optional local files
2. Screen **recording** and/or **snapshots** (read them and draft the body)
3. `.bug-fixer-session/reproduction-report.md` (+ evidence)
4. Existing `#N` / URL meaning “attach this evidence there” (still search; still confirm)
5. Exploratory-tester pack (`findings-flow-*.md` / `report.md` + media + `config.json`) when the human named that finding

### Media

Given a recording and stills:

1. Watch them. Draft steps, current behaviour, and expected if the UI makes it obvious. Quote what was on screen; do not invent clicks you did not see.
2. Put screenshot and recording/video paths (`Screenshot:`, `Recording:`, `Video:`) under **Current behaviour (with screenshots and recordings):**. Resolve `` `$SESSION_DIR/...` `` to the real session directory. Upload those files and embed the returned URLs before write.
3. Use a visible route or UI area for `Team:*` inference.
4. Ask for what media cannot provide: version, the always-ask items above, console/network, server OS, endpoint version, expected if unclear.
5. If the video is unreadable or too long to trust, say so and ask for a still of the failure.

## Two collect paths

Same later steps (search, draft-and-stop, write). Fork only **how you collect**.

**Path A — from scratch** (paste, recording, snapshots, bug-fixer report, or “create a bug” with no tester pack):

1. Interview and/or watch media. Do not invent.
2. Draft the body **by hand** to match `templates/bug-report.md`.
3. Run always-ask + environment-setup + vague follow-ups for anything still missing. Hard stop after each question. Put `Unknown` if they do not know or stay vague after one follow-up.
4. `infer-team` then `format-title` for the title prefix and `Team:*` label.

**Path B — exploratory-tester pack** (human named a finding; you have `findings-flow-*.md` / `report.md` + media + `config.json`):

1. Do **not** hand-map the markdown. Reuse `$SESSION_DIR/findings.jsonl` if it exists; otherwise run the tester parser:

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/parse-findings.py \
  --session-dir "$SESSION_DIR"
```

2. Pick the named finding (`--title` when they named it; `--index` is 0-based among `kind: finding` lines):

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py from-findings \
  --jsonl "$SESSION_DIR/findings.jsonl" --title "$FINDING_TITLE"
```

3. Write that JSON to a finding file and run `check-pack`, `infer-deployment`, `scan-sensitive`, and `render-body` with `$SESSION_DIR/config.json`.
4. Still run always-ask for gaps. If `check-pack` is thin, run environment-setup / vague follow-ups (hard stop); do not re-ask what the finding already states.
5. After answers, **edit the draft markdown** (do not throw away media mapping). Re-run `render-body` only if you update the JSON and want a clean rebuild.

**Several findings:** “File 2 and 5” means **two full loops** — two drafts, two searches, two confirms, **two issues**. Do not combine unrelated bugs in one ticket.

**Existing `#N` / URL:** still search; still confirm. Prefer comment / reopen+comment. Still ask always-ask items that are **not already on that issue**. In the comment, add any missing repro context (flags, deployment, role, spaces, preconditions, exact error) — do not only attach files. Do not retitle the existing issue unless the human asks.

## Scripts

Every GitHub read for labels and every GitHub write goes through `scripts/file-bug.py`. Each subcommand prints one JSON object and exits `0` on success, `1` on failure (message on stderr), `2` when it needs the human to decide.

| Subcommand | Purpose |
|---|---|
| `from-findings` | One finding from `parse-findings.py` JSONL |
| `check-pack` | Thin-pack gaps (exit 2 if anything required is missing) |
| `check-draft` | Fileable-bar gaps on the draft (exit 2 if not fileable) |
| `scan-sensitive` | Emails / case IDs / NDA / customer wording (exit 2 if hits) |
| `render-body` | Evidence pack → bug template body (includes the stamp) |
| `infer-team` | Area / slug / route → `Team:*` |
| `format-title` | `Team:*` + symptom → `[<team name>] …` |
| `infer-deployment` | ECH / serverless / both, or ask |
| `parse-search` | `gh search --json` → `matches.json` |
| `decide` | Search matches → write path |
| `validate-labels` | Drop labels the repo does not have |
| `write` | The agreed `gh issue create` / `comment` / `reopen` |
| `upload` | User-attachments upload (before write) |
| `embed-uploads` | Replace local paths with uploaded URLs |

## Flow

### 1. Collect

Follow **Two collect paths** above. Path B (or Path A after you have JSON) may call:

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py check-pack \
  --finding "$FINDING_JSON" --config "$CONFIG_JSON"
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py infer-deployment \
  --finding "$FINDING_JSON" --config "$CONFIG_JSON"
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py scan-sensitive \
  --finding "$FINDING_JSON"
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py render-body \
  --finding "$FINDING_JSON" --config "$CONFIG_JSON"
```

Infer `Team:*` (required for a new-issue title `[<team name>] …`):

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py infer-team \
  --area "$AREA" --slug "$AREA_SLUG" --route "$ROUTE" \
  --knowledge x-pack/solutions/security/plugins/security_solution/.agents/references/security-domain-knowledge.md
```

Exact area/slug/route hit → use that label. Otherwise ask. Then:

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py format-title \
  --label "$TEAM_LABEL" --symptom "$SYMPTOM"
```

### 2. Search

You own the query (title + distinctive error strings). Search **open and closed** (do not pass `--state open` only). Parsing is a script. Empty results are **not** proof the bug is new — run a **second** query (exact error, route, or flag id) before proposing create. Before create, `gh issue view` candidate **bodies** and match the *work* (same failure, same surface), not the title keywords. If it matches, propose comment / reopen, not create.

```bash
GH_PAGER=cat gh search issues --repo elastic/kibana --limit 10 --json number,state,title,body \
  "<title and distinctive error strings>" \
  | python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py parse-search --input -
```

If both searches failed or returned nothing, use `{"matches":[]}` and tell the human search was inconclusive. Then:

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py decide \
  --matches matches.json
```

| `action` | Proposal |
|---|---|
| `create` | New issue |
| `comment` | Comment only |
| `reopen_comment` | Comment + reopen |
| `ask` (CLI exit 2) | Show candidates; do not write |

### 3. Draft and stop

Show title (create), labels, body or comment, and files to upload. The body must end with `Filed via security-file-bug` (`render-body` / `write` add it). Run `check-draft` and `scan-sensitive` before asking for a write-yes. Validate each label with `--search` (do not `gh label list --limit 1000` — that truncates `Team:*`):

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py validate-labels \
  --labels "bug,Team:…" --repo elastic/kibana
```

`--route` accepts either the nav label (`Security > Alerts`) or the path (`/app/security/alerts`). Always include `bug` on a new issue. Wait for an **explicit yes**. “Create a bug”, “file this ticket”, or “file finding 2” is permission to **prepare a draft**, not to write.

### 4. Write (only after yes)

Upload evidence first (user-attachments; no issue number), embed the URLs, then write so the filed body does not contain local paths:

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py upload \
  --repo elastic/kibana --file shot.png --file flow.mp4 > uploaded.json
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py embed-uploads \
  --body body.md --map uploaded.json > embedded.json
# write the embedded body

python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py write \
  --action create|comment|reopen_comment \
  --repo elastic/kibana --title "…" --body-file body.md --label bug --label "Team:…"
# comment / reopen_comment also need --number N
```

`upload` posts to `uploads.github.com/user-attachments/assets`. Reply with the issue URL, the action, uploaded URLs, and leftover local paths. Do not write back to `known_open_bugs` or knowledge files.

A failed **create** must not be retried. A **comment** is not retried (a retry can double-post). If `reopen_comment` reopens and then the comment fails, report the partial write (`#{N} is open again, comment missing`) and do not reopen again. Offer a new issue only if reopen is denied.

## Out of scope

Feature requests. Auto-filing. Changing `gh-create-issue`.
