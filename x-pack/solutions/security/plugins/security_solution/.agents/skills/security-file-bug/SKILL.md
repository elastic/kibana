---
name: security-file-bug
description: >
  Use when the user says "create a bug", "file a ticket", "post this bug",
  "comment this on #N", or "file this finding" for a Kibana Security
  Solution issue. Do not run unless someone asked to file a bug.
disable-model-invocation: true
---

# Security file-bug

Write a Kibana Security Solution bug to `elastic/kibana` only after an **explicit yes**. `disable-model-invocation: true`. Do not offer to file anything on your own initiative.

While collecting or drafting, read `references/drafting.md`. Scripts under `scripts/file-bug.py` are the source of truth for gaps, titles, labels, and writes.

## Quick reference

| Step | Do |
|---|---|
| 1. Collect | Path A (scratch/media) or Path B (named tester finding). One bug per loop. |
| 2. Search | Open **and** closed. `parse-search` → `decide`. Empty search is not “new”. |
| 3. Draft and stop | Show draft. `check-draft` + `scan-sensitive`. Wait for write-yes. |
| 4. Write | Upload → `embed-uploads --out embedded.md` → `write --body-file embedded.md`. |

“Create a bug”, “file this ticket”, or “file finding 2” means **prepare a draft**, not write.

## Inputs

Any of these (one bug per loop): pasted text + files; recording / snapshots; `.bug-fixer-session/reproduction-report.md`; existing `#N` / URL; exploratory-tester pack when the human **named** that finding.

**Several findings:** “File 2 and 5” means **two full loops** — two drafts, two searches, two confirms, **two issues**.

## Two collect paths

Same later steps. Fork only how you collect. Drafting rules: `references/drafting.md`.

**Path A — from scratch** — interview and/or watch media; hand-draft `templates/bug-report.md`; then `infer-team` + `format-title`.

**Path B — exploratory-tester pack** — do **not** hand-map markdown:

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/parse-findings.py \
  --session-dir "$SESSION_DIR"
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py from-findings \
  --jsonl "$SESSION_DIR/findings.jsonl" --title "$FINDING_TITLE"
```

Then `check-pack`, `infer-deployment`, `scan-sensitive`, `render-body` with `$SESSION_DIR/config.json`. Keep `source: exploratory-tester` on that JSON. Path B create always includes `sec-eng-prod:exploratory-tester` (`write --finding`).

## Fileable checklist

Do not ask for a write-yes until `check-draft` exits 0, or you have walked every remaining gap (`Unknown` is allowed). `check-draft` is the bar. Path B create also needs `sec-eng-prod:exploratory-tester`. Title: `[<team name>]` + symptom (`format-title`; no clipped title). Stamp: `Filed via security-file-bug`.

## Scripts

Every GitHub label read and write goes through `python3 …/scripts/file-bug.py <cmd>`. JSON on stdout. Exit `0` ok, `1` fail, `2` ask. Validate labels with `--search` (never `gh label list --limit 1000`).

## Flow

### 1. Collect

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py check-pack \
  --finding "$FINDING_JSON" --config "$CONFIG_JSON"
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py infer-deployment \
  --finding "$FINDING_JSON" --config "$CONFIG_JSON"
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py scan-sensitive \
  --finding "$FINDING_JSON"
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py render-body \
  --finding "$FINDING_JSON" --config "$CONFIG_JSON"
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py infer-team \
  --area "$AREA" --slug "$AREA_SLUG" --route "$ROUTE" \
  --knowledge x-pack/solutions/security/plugins/security_solution/.agents/references/security-domain-knowledge.md
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py format-title \
  --label "$TEAM_LABEL" --symptom "$SYMPTOM"
```

`--route` is the nav label (`Security > Alerts`) or the path (`/app/security/alerts`).

### 2. Search

You own the query. Search **open and closed**. Empty results are **not** proof the bug is new — run a **second** query before proposing create. `gh issue view` candidate bodies and match the *work*, not title keywords.

```bash
GH_PAGER=cat gh search issues --repo elastic/kibana --limit 10 --json number,state,title,body \
  "<title and distinctive error strings>" \
  | python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py parse-search --input -
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py decide \
  --matches matches.json
```

### 3. Draft and stop

Show title (create), labels, body or comment, and files to upload. Then:

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py validate-labels \
  --labels "bug,Team:…" --repo elastic/kibana
```

Always include `bug` on a new issue. Path B also `sec-eng-prod:exploratory-tester`. Wait for an **explicit yes**.

### 4. Write (only after yes)

Upload first, embed into a **new** body file, write **that** file (not the pre-embed `body.md`). `embed-uploads` wraps images as `![filename](url)` and videos as `<video src="url" controls></video>` on their own paragraph so GitHub shows a player. Never write a bare image or video URL (a URL in a sentence is a link).

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py upload \
  --repo elastic/kibana --file shot.png --file flow.mp4 > uploaded.json
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py embed-uploads \
  --body body.md --map uploaded.json --out embedded.md
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py write \
  --action create|comment|reopen_comment \
  --repo elastic/kibana --title "…" --body-file embedded.md \
  --label bug --label "Team:…" --label sec-eng-prod:exploratory-tester \
  --finding "$FINDING_JSON"
```

Comment / reopen also need `--number N`. `--finding` is required on Path B. `upload` posts to `uploads.github.com/user-attachments/assets`. Reply with the issue URL, action, uploaded URLs, leftovers. Do not write back to `known_open_bugs`.

A failed **create** must not be retried. A **comment** is not retried. If `reopen_comment` reopens and the comment fails, report the partial write and do not reopen again.

## Red flags

Stop. You are about to write without a yes, or to file the wrong body:

- “They said file finding 2, I can create now.” → draft only.
- “I’ll batch the always-ask questions.” → **Hard stop** after each.
- “2 and 5 are one ticket.” → two issues. Do not combine findings.
- “embed wrote JSON, I’ll `write --body-file body.md`.” → write `embedded.md`.
- “I’ll paste the uploaded image or video URL as-is.” → images must be `![filename](url)`; videos must be `<video src="url" controls></video>` on their own paragraph.
- “Title is long, I’ll clip it.” → `format-title` exit 2.
- Retrying a failed create or comment. Dropping `sec-eng-prod:exploratory-tester`. Writing `_unknown_`. Assuming Scout is always local.

## Out of scope

Feature requests. Auto-filing. Changing `gh-create-issue`.
