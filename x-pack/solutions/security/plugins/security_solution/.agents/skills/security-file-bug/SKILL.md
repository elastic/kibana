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

Repo: `elastic/kibana`. Body template: this skill's `templates/bug-report.md` (not `.github/ISSUE_TEMPLATE/Bug_report.md`). Follow `.agents/skills/kbn-github` (explicit confirm, then `gh`).

`disable-model-invocation: true` — run only when someone asks to file a bug or to comment on an existing ticket.

## What a good ticket needs

- Headings from `templates/bug-report.md`.
- **Version** (stack). **Original install method** when known (`from source (dev)` for local/scout).
- **Steps to reproduce**, **Current behaviour (with screenshots and recordings)**, **Expected behavior**.
- **Feature flags:** when the behaviour is behind a flag, name the **exact flag id** and whether it is on or off. If you confirmed the feature is default/GA, write `No feature flag (default/GA)`. Never guess a flag name — ask. Omit the heading only when flags were not discussed and the pack has none.
- Omit **Server OS version**, **Browser and Browser OS versions**, and **Elastic Endpoint version** unless the pack has a value.
- Ask one question at a time for missing steps, expected, current behaviour, or version. Do not pad with `_unknown_` while a human can still answer.

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
2. Put screenshot and recording paths under **Current behaviour (with screenshots and recordings):**. Attach the files on write.
3. Use a visible route or UI area for `Team:*` inference.
4. Ask for what media cannot provide: version, flag id, console/network, server OS, endpoint version, expected if unclear.
5. If the video is unreadable or too long to trust, say so and ask for a still of the failure.

If the input is already finding JSON + config, map it with `render-body`. If the input is media or prose, draft markdown that matches `templates/bug-report.md` (you may call `render-body` once you have JSON).

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

Always include `bug` on a new issue. Wait for an **explicit yes**. “Create a bug”, “file this ticket”, or “file finding 2” is permission to **prepare a draft**, not to write.

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
