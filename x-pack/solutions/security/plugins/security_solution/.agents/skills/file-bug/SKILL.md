---
name: file-bug
description: >
  Drafts and files Kibana Security Solution bug reports using the Security
  template, with duplicate search, sensitive-content checks, and explicit
  human confirmation before any GitHub write. Use when the user asks to
  create, file, or comment a Security bug, or names exploratory-tester
  findings to file.
disable-model-invocation: true
---

# File bug

Write a Kibana Security Solution bug to `elastic/kibana` only after a **write-yes** (the explicit yes): a later message that clearly approves **this** shown draft (for example “yes, file it”). Do not offer to file anything on your own initiative. “Create a bug”, “file this ticket”, or “file finding 2” means **prepare a draft**, not write. Stamp: `Filed via file-bug`.

This skill is Security-specific (template, always-ask fields, tester handoff). It does not build on repo-level `gh-create-issue` and must not change that skill. Exploratory-tester may hand off here only after the human **names** the findings to file.

While collecting or drafting, read `references/drafting.md`. Scripts under `scripts/file-bug.py` are the source of truth. `scripts/file_bug.py` is the library — do not run it as a CLI.

```bash
FILE_BUG="x-pack/solutions/security/plugins/security_solution/.agents/skills/file-bug/scripts/file-bug.py"
```

## Quick reference

| Step | Do |
|---|---|
| 1. Collect | Path A (scratch/media) or Path B (named tester finding). One bug per loop. |
| 2. Search | Open **and** closed. Two issue queries, then open PRs. `parse-search` → `decide`. Empty search is not “new”. |
| 3. Draft and stop | Show the **full draft**, then **end the turn**. `check-draft` + `scan-sensitive` + `scan-wip`. Never write in that turn. |
| 4. Write | Upload → `embed-uploads --out embedded.md` → `write --body-file embedded.md`. |

## Inputs

Any of these (one bug per loop): pasted text + files; recording / snapshots; `.bug-fixer-session/reproduction-report.md`; existing `#N` / URL; exploratory-tester pack when the human **named** that finding.

**Several findings:** “File 2 and 5” means **two full loops** — two drafts, two searches, two write-yes, **two issues**.

## Two collect paths

Same later steps. Fork only how you collect. Drafting rules: `references/drafting.md`.

**Path A — from scratch** — interview and/or watch media; hand-draft `templates/bug-report.md`; then `infer-team` + `format-title`.

**Path B — exploratory-tester pack** — do **not** hand-map markdown:

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/parse-findings.py \
  --session-dir "$SESSION_DIR"
python3 "$FILE_BUG" from-findings \
  --jsonl "$SESSION_DIR/findings.jsonl" --title "$FINDING_TITLE" \
  --out "$FINDING_JSON"
```

`from-findings` prints the **bare** finding (`source: exploratory-tester`). Pass that file to later `--finding` flags. Then `check-pack`, `infer-deployment`, `scan-sensitive`, `render-body --out body.md` with `$SESSION_DIR/config.json`. Path B create always includes `sec-eng-prod:exploratory-tester` (`write --finding`). `--index` and `--title` skip `Observation` blocks.

## Fileable checklist

Do not ask for a write-yes until these gates pass, or you have walked every remaining gap (`Unknown` is allowed). Field rules: `references/drafting.md`.

1. `check-draft` exit 0 (create: pass `--title` and `--label`; comment/reopen: omit `--title`).
2. `scan-sensitive` — Cases UI text such as “Opening case 12345” may flag; confirm, then `check-draft --sensitive-ok`.
3. `scan-wip` — a `wip_or_limitation` hit needs **file anyway**, then `check-draft --wip-ok`.
4. Show the full draft (title, type, labels, body, files) and **end the turn**.

Path B create also needs `sec-eng-prod:exploratory-tester`. `write` sets GitHub Type to Bug.

## Scripts

Every GitHub label read and write goes through `python3 "$FILE_BUG" <cmd>`. JSON on stdout. Exit `0` ok, `1` fail, `2` ask. Validate labels with `--search` (never `gh label list --limit 1000`).

## Flow

### 1. Collect

```bash
python3 "$FILE_BUG" check-pack --finding "$FINDING_JSON" --config "$CONFIG_JSON"
python3 "$FILE_BUG" infer-deployment --finding "$FINDING_JSON" --config "$CONFIG_JSON"
python3 "$FILE_BUG" infer-release --finding "$FINDING_JSON" --config "$CONFIG_JSON"
python3 "$FILE_BUG" scan-sensitive --finding "$FINDING_JSON"
python3 "$FILE_BUG" render-body --finding "$FINDING_JSON" --config "$CONFIG_JSON" --out body.md
python3 "$FILE_BUG" infer-team --area "$AREA" --slug "$AREA_SLUG" --route "$ROUTE" \
  --knowledge x-pack/solutions/security/plugins/security_solution/.agents/references/security-domain-knowledge.md
python3 "$FILE_BUG" format-title --label "$TEAM_LABEL" --symptom "$SYMPTOM"
```

`--route` is the nav label (`Security > Alerts`) or the path (`/app/security/alerts`).

### 2. Search

You own the query. Search **open and closed issues** and **open PRs** (include drafts). Empty issue results are **not** proof the bug is new — run a **second** issue query before proposing create. Combine each `gh search` JSON (issues, then PRs) through `parse-search` into one `matches.json`, or pass raw `gh search` JSON to `decide --matches -`. `decide` exits 0 with `create` only when there are **no** matches. **One or more** matches exit 2 (`ask`) — show the candidates, match the *work* (not title keywords), and let the human pick create / comment / reopen. `gh issue view` / `gh pr view` candidate bodies. A matching **draft or WIP PR**, or a known/intentional limitation, is a pre-file stop — do not treat a note in Additional information as clearance.

```bash
GH_PAGER=cat gh search issues --repo elastic/kibana --limit 10 --json number,state,title,body \
  "<title and distinctive error strings>" \
  | python3 "$FILE_BUG" parse-search --input - > matches.json
python3 "$FILE_BUG" decide --matches matches.json
```

### 3. Draft and stop

**Always present the complete draft before opening a ticket.** Show title (create), GitHub Type, labels, full body or comment, and files to upload. Then **end the turn**. Never write in the same turn you first show the draft.

```bash
python3 "$FILE_BUG" validate-labels --labels "bug,Team:…" --repo elastic/kibana
python3 "$FILE_BUG" scan-wip --finding "$FINDING_JSON" --body body.md
python3 "$FILE_BUG" check-draft --finding "$FINDING_JSON" --body body.md \
  --title "[Entity Analytics] [Bug] …" \
  --label bug --label triage_needed --label "Team:…"
```

On comment / reopen, omit `--title`. Always include `bug` and `triage_needed` on a new issue. If `infer-release` is confident, also that `vX.Y.Z` label (`validate-labels`). If version is `Unknown`, omit the `v*` label (do not invent one). If it exits 2 on a concrete unparseable version, ask. Path B also `--label sec-eng-prod:exploratory-tester`.

If `scan-wip` or `check-draft` reports `wip_or_limitation`, ask whether to **file anyway**. Do not ask for a write-yes until they say file anyway; then `check-draft --wip-ok`.

### 4. Write (only after write-yes)

Upload first, embed into a **new** body file, write **that** file (not the pre-embed `body.md`). `embed-uploads` wraps images as `![filename](url)` and videos as `<video src="url" controls></video>` on their own paragraph so GitHub shows a player. Never write a bare image or video URL (a URL in a sentence is a link).

```bash
python3 "$FILE_BUG" upload --repo elastic/kibana --file shot.png --file flow.mp4 > uploaded.json
python3 "$FILE_BUG" embed-uploads --body body.md --map uploaded.json --out embedded.md
python3 "$FILE_BUG" write \
  --action create|comment|reopen_comment \
  --repo elastic/kibana --title "…" --body-file embedded.md \
  --label bug --label triage_needed --label "Team:…" --label sec-eng-prod:exploratory-tester \
  --finding "$FINDING_JSON"
```

Comment / reopen also need `--number N`. `--finding` is required on Path B. `upload` posts to `uploads.github.com/user-attachments/assets` (undocumented GitHub upload; can change). Reply with the issue URL, action, uploaded URLs, leftovers. Do not write back to `known_open_bugs` (the tester session’s already-open-bug list).

A failed **create** must not be retried. A **comment** is not retried. If `reopen_comment` reopens and the comment fails, report the partial write and do not reopen again.

## Red flags

Stop. You are about to write without a write-yes, or to file the wrong body:

- “They said file finding 2, I can create now.” → draft only. Show the draft and end the turn.
- “Draft looks good, I’ll write in this same turn.” → stop. Write-yes is a later message.
- “I noted the draft PR in Additional, I can file.” → `scan-wip` hit. Ask **file anyway** first.
- “I’ll batch the always-ask questions.” → **Hard stop** after each.
- “2 and 5 are one ticket.” → two issues. Do not combine findings.
- “Same class of bug, I’ll add it to Expected / suggest they fix it together.” → confirmed finding only. Never suggest the fix. Adjacent notes go in Additional information or a second ticket.
- “embed wrote JSON, I’ll `write --body-file body.md`.” → write `embedded.md`.
- “I’ll paste the uploaded image or video URL as-is.” → images must be `![filename](url)`; videos must be `<video src="url" controls></video>` on their own paragraph.
- “Title is long, I’ll clip it.” → `format-title` exit 2.
- Retrying a failed create or comment. Dropping `sec-eng-prod:exploratory-tester`. Writing `_unknown_`. Assuming Scout is always local (read `config.json` / URL / arch; Scout can be local, ECH, or serverless).

## Out of scope

Feature requests. Auto-filing. Changing `gh-create-issue`.
