---
name: file-bug
description: >
  Use when the user asks to create, file, or comment a Kibana Security Solution
  bug ("file this bug", "open a ticket for this"), or names exploratory-tester
  findings to file.
disable-model-invocation: true
---

# File bug

Write a bug to `$TARGET_REPO` only after a **write-yes** (the explicit yes): a later message that clearly approves **this** shown draft (for example “yes, file it”). Do not offer to file anything on your own initiative. “Create a bug”, “file this ticket”, or “file finding 2” means **prepare a draft**, not write. `write` ends every body with the visible stamp `Filed via file-bug` and a hidden marker `<!-- filed-via: file-bug v1 -->`.

Security-specific; does not build on repo-level `gh-create-issue` and must not change it. Exploratory-tester may hand off here only after the human **names** the findings. Read `references/drafting.md` while collecting or drafting. `scripts/file-bug.py` is the source of truth (`--help` per command); `scripts/file_bug.py` is the library — do not run it as a CLI.

```bash
FILE_BUG="x-pack/solutions/security/plugins/security_solution/.agents/skills/file-bug/scripts/file-bug.py"
TARGET_REPO="elastic/kibana"   # becomes elastic/security-team after Classify says so
```

All GitHub label reads and writes go through `python3 "$FILE_BUG" <cmd>`. JSON on stdout. Exit `0` ok, `1` fail, `2` ask. Validate labels with `--search` (never `gh label list --limit 1000`).

| Step | Do |
|---|---|
| 0. Classify | Security-sensitive signal → hard stop, `elastic/security-team`. Otherwise `elastic/kibana`. |
| 1. Collect | Path A (scratch/media) or Path B (named tester finding). One bug per loop. |
| 2. Search | Open **and** closed. Two issue queries, then open PRs. Empty search is not “new”. |
| 3. Draft and stop | Full draft + media review, then **end the turn**. |
| 4. Write | Upload → `embed-uploads --out embedded.md` → `write --body-file embedded.md`. |

“File 2 and 5” means **two full loops** — two drafts, two searches, two write-yes, **two issues**.

## Fileable checklist

Do not ask for a write-yes until `check-draft` exits 0 (create: pass `--title`, `--repo` and every `--label`; comment/reopen: omit `--title`) or you have walked every remaining gap (`Unknown` is allowed). Field rules: `references/drafting.md`.

| Gap or hit | Human must | Flag |
|---|---|---|
| `sensitive:*` (Cases UI text like “Opening case 12345” may flag) | confirm it is UI text, not a customer ID | `--sensitive-ok` |
| `security_issue:file_in_security_team` | file in `elastic/security-team`, or confirm it is **not** a vulnerability or secret | `--repo` / `--security-ok` |
| `wip_or_limitation` | say **file anyway** | `--wip-ok` |
| `media_review` | confirm every screenshot/recording is clean | `--media-ok` |

`--sensitive-ok` never unlocks `security_issue`. `write` sets GitHub Type to Bug.

## Flow

### 0. Classify

Ask once, then **Hard stop**: “Does this expose a vulnerability, credentials or secrets, customer data or PII, or an exploit path?” — but only if the report (text or media) shows one of: a user reading or changing data or actions they lack access to; script or markup running from user-controlled input; credentials, tokens or keys; customer or host data. Otherwise do not ask: use `elastic/kibana` and show the target repo in the draft.

- **Yes / unsure** → `TARGET_REPO="elastic/security-team"`; the human confirms the repo in the draft. Search, label, upload and write only against `$TARGET_REPO` — nothing in `elastic/kibana`.
- **No** → `TARGET_REPO="elastic/kibana"`. If `scan-sensitive` later raises `security_issue`, ask and switch repo instead of overriding.

Template, title format and `bug` / `triage_needed` are reused. `Team:*` and `v*` labels may not exist in `security-team`: `validate-labels --repo "$TARGET_REPO"`, drop what is missing, show the dropped labels in the draft.

### 1. Collect

Two collect paths; same later steps.

**Path A — from scratch** — interview and/or watch media (recording / snapshots, pasted text, `.bug-fixer-session/reproduction-report.md`, an existing `#N`); hand-draft `templates/bug-report.md`; then:

```bash
python3 "$FILE_BUG" infer-team --area "$AREA" --slug "$AREA_SLUG" --route "$ROUTE" \
  --knowledge x-pack/solutions/security/plugins/security_solution/.agents/references/security-domain-knowledge.md
python3 "$FILE_BUG" format-title --label "$TEAM_LABEL" --symptom "$SYMPTOM"
```

`--route` is the nav label (`Security > Alerts`) or the path (`/app/security/alerts`).

**Path B — exploratory-tester pack** — read `references/path-b.md`. It gives `parse-findings.py`, `from-findings`, `check-pack`, `infer-deployment`, `infer-release`, `scan-sensitive` and `render-body`; then `infer-team` and `format-title` as above.

### 2. Search

Search **open and closed issues** and **open PRs** (include drafts). Empty issue results are **not** proof the bug is new — run a **second** issue query before proposing create. Pipe each `gh search` JSON through `parse-search` into one `matches.json` (or pass raw JSON to `decide --matches -`). `decide` exits 0 with `create` only when there are **no** matches. **One or more** matches exit 2 — show candidates (`gh issue view` / `gh pr view`), match the *work* not title keywords, and let the human pick create / comment / reopen. A matching **draft or WIP PR**, or a known limitation, is a pre-file stop; a note in Additional information is not clearance.

```bash
GH_PAGER=cat gh search issues --repo "$TARGET_REPO" --limit 10 --json number,state,title,body \
  "<title and distinctive error strings>" \
  | python3 "$FILE_BUG" parse-search --input - > matches.json
python3 "$FILE_BUG" decide --matches matches.json
```

### 3. Draft and stop

Show the complete draft before opening a ticket: title (create), GitHub Type, labels, full body or comment, files to upload, target repo, media reviewed. Then **end the turn**. Never write in the same turn you first show the draft.

```bash
python3 "$FILE_BUG" validate-labels --labels "bug,Team:…" --repo "$TARGET_REPO"
python3 "$FILE_BUG" scan-wip --finding "$FINDING_JSON" --body body.md
python3 "$FILE_BUG" check-draft --finding "$FINDING_JSON" --body body.md \
  --title "[Entity Analytics] [Bug] …" --repo "$TARGET_REPO" \
  --label bug --label triage_needed --label "Team:…"
```

New issues always get `bug` and `triage_needed`. If `infer-release` is confident, pass that `vX.Y.Z` as `--label` on `check-draft` and `write` (`validate-labels` first; `write` does not infer one). Version `Unknown` → omit the `v*` label. Path B also `--label sec-eng-prod:exploratory-tester`.

If `check-draft` reports `security_issue:file_in_security_team`, switch `TARGET_REPO` to `elastic/security-team` and re-run Search there; `write` refuses `elastic/kibana` for that hit unless `--security-ok`. On `wip_or_limitation`, ask whether to **file anyway** before any write-yes.

**Media review.** Text scans do not read images. Open every screenshot and recording before upload (video: start, middle and failure frames). Real customer or host data — hostnames, IPs, emails, org names, cluster URLs, keys or tokens, including the URL bar and console/network panels — means the file is **not uploaded**: ask for a redacted or synthetic-data replacement. List each file under **Media reviewed** (file → clean / needs redaction), say what you could not check, and pass `--media-ok` only after the human confirms all files are clean.

### 4. Write (only after write-yes)

Upload first, embed into a **new** body file, write **that** file (not the pre-embed `body.md`). `embed-uploads` wraps images as `![filename](url)` and videos as `<video src="url" controls></video>` on their own paragraph so GitHub shows a player. Never write a bare image or video URL.

```bash
python3 "$FILE_BUG" upload --repo "$TARGET_REPO" --file shot.png --file flow.mp4 > uploaded.json
python3 "$FILE_BUG" embed-uploads --body body.md --map uploaded.json --out embedded.md
python3 "$FILE_BUG" write \
  --action create|comment|reopen_comment \
  --repo "$TARGET_REPO" --title "…" --body-file embedded.md \
  --label bug --label triage_needed --label "Team:…" --label sec-eng-prod:exploratory-tester \
  --finding "$FINDING_JSON"
```

Comment / reopen also need `--number N`. `--finding` is required on Path B. `upload` posts to `uploads.github.com/user-attachments/assets` (undocumented; can change). Reply with the issue URL, action, uploaded URLs, leftovers.

Never retry a failed **create** or **comment**. If `reopen_comment` reopens and the comment fails, report the partial write and do not reopen again.

## Red flags

Stop. You are about to write without a write-yes, or to file the wrong thing:

- “They said file finding 2, I can create now.” / “Draft looks good, I’ll write this same turn.” → draft only; write-yes is a later message.
- “I noted the draft PR in Additional, I can file.” → `scan-wip` hit. Ask **file anyway** first.
- “I’ll batch the always-ask questions.” → **Hard stop** after each.
- “Same class of bug, I’ll add it to Expected.” → confirmed finding only. Never suggest the fix. Adjacent notes go in Additional information or a second ticket.
- “I’ll `write --body-file body.md`.” → write `embedded.md`.
- “It's probably fine to file the vulnerability in `elastic/kibana` and fix it later.” → `TARGET_REPO=elastic/security-team`. Public issues are cached and indexed even if deleted.
- “The text scan passed, so the screenshot is fine.” → do the media review.
- “Title is long, I’ll clip it.” → `format-title` exit 2.
- Writing `_unknown_`. Assuming Scout is always local (read `config.json` / URL / arch).
