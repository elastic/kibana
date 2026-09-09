---
name: security-file-bug
description: >
  File a Kibana Security bug from an evidence pack after the human names the
  target and confirms the draft. Use when the user says "file this finding",
  "create a bug", "post this ticket", or "comment this on #N". Do not run at
  the end of an exploratory session unless the human named findings.
disable-model-invocation: true
---

# Security file-bug

File **only the findings a human names**. Never file the whole report. Do not offer to file anything on your own initiative.

Repo: `elastic/kibana`. Template: `.github/ISSUE_TEMPLATE/Bug_report.md`. Follow `.agents/skills/kbn-github` (explicit confirm, then `gh`).

`disable-model-invocation: true` — this skill does not load during exploratory testing. Entry points: the human names findings, or they say to follow this skill.

## Inputs

One evidence pack per loop:

1. Exploratory finding (block from `findings-flow-*.md` / `report.md` + listed media + `config.json`)
2. `.bug-fixer-session/reproduction-report.md` (+ evidence)
3. Pasted description + optional local files
4. Existing `#N` / URL meaning “attach this evidence there” (still search; still confirm)

Missing steps / expected / actual: ask one question at a time. Do not invent.

## Scripts

Every GitHub read for labels and every GitHub write goes through `scripts/file-bug.py`. Each subcommand prints one JSON object and exits `0` on success, `1` on failure (message on stderr), `2` when it needs the human to decide.

| Subcommand | Purpose |
|---|---|
| `render-body` | Evidence pack → bug template body |
| `infer-team` | Area / slug / route → `Team:*` |
| `decide` | Search matches → write path |
| `validate-labels` | Drop labels the repo does not have |
| `write` | The agreed `gh issue create` / `comment` / `reopen` |
| `upload` | Attach evidence to the issue |

## Flow

### 1. Collect

Map the pack onto the bug template via:

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py render-body \
  --finding "$FINDING_JSON" --config "$CONFIG_JSON"
```

Infer `Team:*`:

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py infer-team \
  --area "$AREA" --slug "$AREA_SLUG" --route "$ROUTE" \
  --knowledge x-pack/solutions/security/plugins/security_solution/.agents/references/security-domain-knowledge.md
```

Exact area/slug/route hit → use that label. Otherwise ask.

### 2. Search

```bash
GH_PAGER=cat gh search issues --repo elastic/kibana --limit 10 "<title and distinctive error strings>"
```

Write matches to `matches.json` as `{"matches":[{"number":N,"state":"open|closed","title":"..."}]}` (empty list if search failed or returned nothing — tell the human search was inconclusive). Then:

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

Show title (create), labels, body or comment, and files to upload. Validate labels:

```bash
GH_PAGER=cat gh label list --repo elastic/kibana --limit 1000 --json name > catalog.json
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py validate-labels \
  --labels "bug,Team:…" --catalog catalog.json
```

Always include `bug` on a new issue. Wait for an **explicit yes**. “File finding 2” is not that yes — it is permission to prepare a draft.

### 4. Write (only after yes)

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py write \
  --action create|comment|reopen_comment \
  --repo elastic/kibana --title "…" --body-file body.md --label bug --label "Team:…"
# comment / reopen_comment also need --number N

python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/security-file-bug/scripts/file-bug.py upload \
  --issue N --repo elastic/kibana --file shot.png --file flow.mp4
```

`write` prints the `number` to pass to `upload --issue`.

Reply with the issue URL, the action, uploaded URLs, and leftover local paths. Do not write back to `known_open_bugs` or knowledge files.

A failed **create** must not be retried. Offer a new issue only if reopen is denied.

## Out of scope

Feature requests. Auto-filing. Changing `gh-create-issue`.
