---
name: file-bug
description: >
  Use when the user asks to create, file, or comment a Kibana Security Solution
  bug ("file this bug", "open a ticket for this"), or names exploratory-tester
  findings to file.
disable-model-invocation: true
---

# File bug

Write a bug to `$TARGET_REPO` only after a **write-yes** (the explicit yes): a later message that clearly approves **this** shown draft (for example “yes, file it”). Do not offer to file anything on your own initiative. “Create a bug”, “file this ticket”, or “file finding 2” means **prepare a draft**, not write.

Exploratory-tester may hand off here only after the human **names** the findings. Read `references/drafting.md` while collecting or drafting. `scripts/file-bug.py` is the source of truth (`--help` per command); `scripts/file_bug.py` is the library, not a CLI.

```bash
FILE_BUG="x-pack/solutions/security/plugins/security_solution/.agents/skills/file-bug/scripts/file-bug.py"
```

Step 0 sets the target repo: `elastic/kibana` or `elastic/security-team`. Shell variables do not persist between commands, so after Step 0 write the repo literally (`--repo elastic/security-team`) in **every** command; `write` and `upload` refuse any other repo. The examples below write `$TARGET_REPO` for brevity.

Run `python3 "$FILE_BUG" <cmd>`: JSON on stdout, exit `0` ok, `1` fail, `2` ask.

“File 2 and 5” means **two full loops** — two drafts, two searches, two write-yes, **two issues**.

## Fileable checklist

No write-yes request until `check-draft` exits 0 (create: pass `--title`, `--repo` and every `--label`; comment/reopen: `--action comment` and omit `--title`) or every remaining gap is walked (`Unknown` is allowed).

Each confirm-gate in `check-draft` output (`sensitive:*`, `security_issue:*`, `wip_or_limitation`, `media_review`) has a line under `help` saying what the human must confirm and which flag then applies (`sensitive:*` also fires on Cases UI text like “Opening case 12345”).

`--sensitive-ok` never unlocks `security_issue`. `write` sets GitHub Type to Bug.

## Flow

### 0. Classify

A **signal** is any of: a user reading or changing data or actions they lack access to; script or markup running from user-controlled input; credentials, tokens or keys; customer or host data.

| Path | Signal in the report (text or media) | Do |
|---|---|---|
| A | yes | Ask once, then **Hard stop**: “Does this expose a vulnerability, credentials or secrets, customer data or PII, or an exploit path?” Never answer it yourself, even when the report already calls it a vulnerability or asks you not to ask. Yes or unsure → `elastic/security-team`; no → `elastic/kibana`. |
| B | yes | Do not ask. Decide right after Step 1's `prepare`, before searching: set `elastic/security-team`, search and label only there, and state the repo and the signal in one line in the draft. If the human replies it is not sensitive, switch to `elastic/kibana` and redo Search. |
| A or B | no | Do not ask: `elastic/kibana`; show the target repo in the draft. |

Later, if `scan-sensitive`, `check-draft` or `prepare` reports `security_issue` (a CVE id, key or token), switch to `elastic/security-team`; `--security-ok` only for a human-confirmed false positive. `hints` (`security_hint`) are normal UI wording too: never a gate, only a prompt to re-read the report for a signal.

`Team:*` and `v*` labels may not exist in `security-team`: `validate-labels --repo "$TARGET_REPO"`, drop what is missing, show the dropped labels in the draft.

### 1. Collect

Two collect paths; same later steps.

**Path A — from scratch** — interview and/or watch media (recording / snapshots, pasted text, `.bug-fixer-session/reproduction-report.md`, an existing `#N`); hand-draft `templates/bug-report.md`; then `infer-team` (`--route` is the nav label or path; `--knowledge x-pack/solutions/security/plugins/security_solution/.agents/references/security-domain-knowledge.md`) and `format-title` (see `--help`).

**Path B — exploratory-tester pack** — read `references/path-b.md`: one `prepare` command runs the whole collect pipeline; then `infer-team` and `format-title` as above.

### 2. Search

Run `python3 "$FILE_BUG" search --repo "$TARGET_REPO" --token <distinctive error identifier> --words "<other distinctive words>" [--screen "<screen or control words>"]` (omit `--token` when there is no identifier). It searches open and closed issues and open PRs (drafts included) with the token alone, the token plus words with `in:title` and with `in:body`, and plain-language words unqualified and split the same way — GitHub returns nothing for an unqualified identifier-plus-words query, so an empty plain query proves nothing. One or more matches exit 2 with candidates; only when every query is empty does it exit 0 with `create`; a `gh` failure exits 1 and is never read as empty. Show candidates (`gh issue view` / `gh pr view`), match the *work* not title keywords, and let the human pick create / comment / reopen. (`parse-search` and `decide --matches` still work on pre-fetched `gh` JSON.)

### 3. Draft and stop

Show the complete draft: title (create), GitHub Type, labels, full body or comment, files to upload, target repo, media reviewed. Then **end the turn**. Never write in the same turn you first show the draft.

```bash
python3 "$FILE_BUG" check-draft --body body.md \
  --title "[Entity Analytics] [Bug] …" --repo "$TARGET_REPO" \
  --label bug --label triage_needed --label "Team:…"
```

Run `validate-labels --repo "$TARGET_REPO"` (it uses `--search`; never `gh label list --limit 1000`) and `scan-wip` first. `--finding "$FINDING_JSON"` is Path B only; on Path A omit it everywhere. A Path A draft ends with the visible `Filed via file-bug` line (`check-draft` requires it); `write` adds the hidden marker itself. New issues always get `bug` and `triage_needed`; add the `vX.Y.Z` label when `infer-release` is confident (omit it on `Unknown`), and `sec-eng-prod:exploratory-tester` on Path B.

**Media review.** Text scans do not read images. Open every screenshot and recording before upload (video: start, middle and failure frames). Real customer or host data — hostnames, IPs, emails, org names, cluster URLs, keys or tokens, including the URL bar and console/network panels — means the file is **not uploaded**: ask for a redacted or synthetic-data replacement. List each file under **Media reviewed** (file → clean / needs redaction), say what you could not check, and pass `--media-ok` only after the human confirms.

### 4. Write (only after write-yes)

Upload first, embed into a **new** body file, write **that** file (not the pre-embed `body.md`). `embed-uploads` wraps images as `![filename](url)` and videos as `<video src="url" controls></video>` on their own paragraph so GitHub shows a player. Never write a bare image or video URL.

```bash
python3 "$FILE_BUG" upload --repo "$TARGET_REPO" --file shot.png --file flow.mp4 > uploaded.json
python3 "$FILE_BUG" embed-uploads --body body.md --map uploaded.json --out embedded.md
python3 "$FILE_BUG" write \
  --action create|comment|reopen_comment \
  --repo "$TARGET_REPO" --title "…" --body-file embedded.md \
  --label bug --label triage_needed --label "Team:…"
```

Path B adds `--label sec-eng-prod:exploratory-tester --finding "$FINDING_JSON"`; Path A passes neither. Always pass `--agent claude-code|codex|cursor` (the tool you run in) and `--model <your model name>`; `write` records them in the hidden marker.

Comment / reopen also need `--number N`. Reply with the issue URL, action, uploaded URLs, leftovers.

Never retry a failed **create** or **comment**. Never fall back to `elastic/kibana` because a search, upload or create against `elastic/security-team` failed (404, no access): stop and report it. If `reopen_comment` reopens and the comment fails, report the partial write and do not reopen again. If `upload` fails or leaves leftovers, do not `write`: ask whether to retry once, hold, or file without the file — dropping it changes the approved draft, so re-show it and wait for a fresh write-yes.

## Red flags

Stop. You are about to write without a write-yes, or to file the wrong thing:

- “They said file finding 2, I can create now.” / “Draft looks good, I’ll write this same turn.” → draft only; write-yes is a later message.
- “It's probably fine to file the vulnerability in `elastic/kibana` and fix it later.” → `TARGET_REPO=elastic/security-team`. Public issues are cached and indexed even if deleted.
- “The text scan passed, so the screenshot is fine.” → do the media review.
