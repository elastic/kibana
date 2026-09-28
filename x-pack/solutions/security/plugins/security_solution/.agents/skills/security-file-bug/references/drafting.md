# Drafting a Security bug (load while collecting)

Field rules live here once. `check-pack`, `check-draft`, `infer-deployment`, `format-title`, and `scan-sensitive` are the source of truth — if prose and a script disagree, trust the script.

Repo: `elastic/kibana`. Body: this skill's `templates/bug-report.md` (not `.github/ISSUE_TEMPLATE/Bug_report.md`). Follow `.agents/skills/kbn-github` (explicit confirm, then `gh`).

Do not invent steps, expected behaviour, versions, or feature-flag names.

## Headings

Use the template headings. **Version** (stack). **Original install method** when known (`from source (dev)` for local/scout). **Steps to reproduce**, **Current behaviour (with screenshots and recordings)**, **Expected behavior**.

**Title** (new issues): `[<team name>] <short symptom>`. Run `format-title` after you have a `Team:*` label (human or `infer-team`). If inference is `ask`, ask the human before create. Do not invent a team. If `format-title` exits 2, the symptom is too long — ask the human to shorten it. Do not file a clipped title.

**Feature flags:** exact flag id, on/off, and **how to enable it**. If confirmed default/GA, write `No feature flag (default/GA)`.

**Role required to reproduce:** specific Kibana/Security role, or none / any.

**Spaces:** default space, custom space, or both. Prefill from `space_id` (session space, not “both”). Prefill **Role** from `setup.resolved_role` when present.

**Preconditions:** only when the repro needs setup before step 1 (data, integrations, flags already covered above, users, index state). Omit the heading when there are none.

Omit **Server OS version**, **Browser and Browser OS versions**, **Elastic Endpoint version**, **Errors in browser console**, and **Logs and/or server output** when empty. Same for any other heading with no value.

Write `Unknown` **only** when the human or JSON said they do not know. Never write `_unknown_`.

A filled heading that is still **vague** is a gap (same as missing): “an error appears”, “it doesn’t work”, “broken”, “works”, “as expected”. One follow-up, then `Unknown`.

**Hard stop:** after each always-ask, environment-setup, or vague follow-up, end the turn. Do not batch questions.

Never describe a failure only as an unspecified error. Put the **exact error message** (toast, flyout, console, stack) in **Current behaviour** and in **Errors in browser console** / **Logs** when that is where it showed up. Use full `https://github.com/elastic/kibana/issues/N` URLs.

## Always ask if missing

Do not treat the draft as complete (and do not ask for a write-yes) until these are answered or the human says they do not know. Ask one at a time. Applies to **both** from-scratch and exploratory-tester handoff.

1. Is the functionality behind a **feature flag**? If yes: exact flag id, on/off, and how to set it up.
2. Does the bug happen on **ECH**, **serverless**, or **both**?
3. Is a **specific role** required to reproduce?
4. Can it be reproduced in the **default space**, a **custom space**, or **both**?

If they do not know, **keep the heading** and write `Unknown`. If they stay vague after one follow-up, `Unknown`.

## Deployment

Run `infer-deployment`. Do not re-derive the mapping in your head.

- Pack names `deployment` → use that.
- Tester `environment.type`: `serverless` → Serverless; `stateful-ess` / `stateful-classic` / `stateful` → ECH.
- Scout `arch`/`domain`: `serverless` / `stateful` → same labels.
- A URL that contains `cloud` is a **hint** — still ask (`infer-deployment` exits 2).
- `kind: scout` or `kind: local` with no type/arch/URL → ask.
- `user-provided` without more signal → ask.
- Write **both** only if the human or pack says both.

Do not assume every session is local Scout. Read `config.json` / the session URL / Scout architecture. You may note Scout or local under install method or Preconditions as *how* it was exercised.

## Thin pack

A pack is **thin** when `check-pack` exits 2. `Unknown` counts as answered. Run environment-setup questions on a thin pack.

## Sanitize

Before draft-and-stop, run `scan-sensitive` on the finding and draft. Flag emails, `SDH…` / case IDs, NDA, “customer name/id”. Strip or ask to strip anything not needed to repro. Cases product language (`Opening case 12345`, `Cases table`) will flag — confirm and keep when it is UI text, not a customer ID. Default repo stays `elastic/kibana`. If they say the content is sensitive / NDA, **stop** and ask whether to file in `elastic/security-team` instead — do not switch silently.

## Environment setup questions

Ask what a reproducer needs to stand up the environment — one question at a time, only what is still unknown. From-scratch filings **and** a **thin** exploratory-tester pack.

- How they installed / which deployment they used (if not already answered)
- Sample data, Fleet, integrations, endpoint, or other products that must be present
- Users, privileges, or spaces beyond the always-ask role/space questions
- Anything else that belongs under **Preconditions:**

Do not assume a local or Scout session is what a triager will use. Write the answers into **Preconditions:** when they are needed to reproduce.

## Media

Given a recording and stills:

1. Watch them. Draft steps, current behaviour, and expected if the UI makes it obvious. Quote what was on screen; do not invent clicks you did not see.
2. Put screenshot and recording/video paths (`Screenshot:`, `Recording:`, `Video:`) under **Current behaviour**. Resolve `` `$SESSION_DIR/...` `` to the real session directory. Upload those files and embed the returned URLs before write.
3. Use a visible route or UI area for `Team:*` inference.
4. Ask for what media cannot provide: version, the always-ask items, console/network, server OS, endpoint version, expected if unclear.
5. If the video is unreadable or too long to trust, say so and ask for a still of the failure.

## Path A — from scratch

Paste, recording, snapshots, bug-fixer report, or “create a bug” with no tester pack.

1. Interview and/or watch media. Do not invent.
2. Draft the body **by hand** to match `templates/bug-report.md`.
3. Run always-ask + environment-setup + vague follow-ups for anything still missing. Hard stop after each question.
4. `infer-team` then `format-title`.

## Path B extras

`from-findings` sets `source: exploratory-tester` — keep it. Still run always-ask for gaps. If `check-pack` is thin, run environment-setup / vague follow-ups; do not re-ask what the finding already states. After answers, **edit the draft markdown** (do not throw away media mapping). Re-run `render-body` only if you update the JSON and want a clean rebuild.

On create, labels must include `bug`, `Team:*`, and **`sec-eng-prod:exploratory-tester`**. `write --finding` adds that last label if it is missing. On comment / reopen, `write` also `--add-label`s it onto `#N`. Do not drop it.

## Existing `#N`

Still search; still confirm. Prefer comment / reopen+comment. Still ask always-ask items that are **not already on that issue**. In the comment, add any missing repro context — do not only attach files. Do not retitle the existing issue unless the human asks.
