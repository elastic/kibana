# Drafting a Security Solution bug (load while collecting)

Field rules live here; `SKILL.md` is the procedure. `check-pack`, `check-draft`, `infer-deployment`, `format-title`, and `scan-sensitive` are the source of truth — if prose and a script disagree, trust the script. On create (`--title`), `check-draft` also requires a visible stamp and filled Describe / Version / Steps / Current / Expected sections. Filled template headings count as pack answers even when the finding JSON does not mirror them. Comment / reopen omit `--title`.

Repo: `$TARGET_REPO` (SKILL.md Classify; `elastic/kibana` unless security-sensitive). Body: this skill's `templates/bug-report.md` (not `.github/ISSUE_TEMPLATE/Bug_report.md`). Follow `.agents/skills/kbn-github` (explicit confirm, then `gh`).

Do not invent steps, expected behaviour, versions, or feature-flag names.

**Stamp:** every create body ends with the visible line `Filed via file-bug` (`check-draft` gaps `stamp` without it). `write` also appends the hidden marker `<!-- filed-via: file-bug v1 -->` so skill-filed tickets can be found by tooling; it adds each line only if missing, so never add the marker by hand.

## Scope

**Confirmed finding only.** Title, steps, **Current behaviour**, and **Expected behavior** cover the named defect and nothing adjacent.

**Expected** is the user-visible close condition for that finding (what the user should see). It is not a design, an implementation, or a punch list.

Never suggest the fix. Do not write how to implement it, what to change in the URL/API/code, or “probably worth fixing X together.”

Related things you noticed (other controls, similar gaps, “same category”) do **not** join Expected or the title. Put them under **Any additional information:** as “also noticed, not part of this defect,” or file a second ticket. Do not expand this issue.

## Ready to file

`scan-wip` hits — draft/WIP PR, work in progress, known or intentional limitation, by design, not yet implemented, or a matching open or draft PR from search — are not cleared by a note under Additional information. Ask **file anyway?** Hard stop. Only then `check-draft --wip-ok`.

## Headings

Use the template headings. Each heading stays on its own line with the value on the next line (`**Version:**` then `9.3.0`); `check-draft` reads sections that way, so an inline `**Version:** 9.3.0` counts as a gap. **Version** (stack). **Original install method** when known (`from source (dev)` for local/scout). **Steps to reproduce**, **Current behaviour (with screenshots and recordings)**, **Expected behavior**.

**Title** (new issues): `[<team name>] [Bug] <short symptom>` from `format-title`, after a `Team:*` label from `infer-team` or the human (ask when inference is `ask`; never invent a team). If `format-title` exits 2 the symptom is too long: ask for a shorter one; do not file a clipped title.

**Release label:** `infer-release`; pass the `vX.Y.Z` it returns on `check-draft` and `write` (`write` does not infer one). `Unknown` is not a gap: omit the label; an unparseable version asks; never invent one. Create always gets `bug` and `triage_needed`, and `write` sets `--type Bug`.

**Preconditions:** only when the repro needs setup before step 1 (data, integrations, users, index state). Omit the heading when there are none.

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

If they do not know, **keep the heading** and write `Unknown`; the same after one vague follow-up. Confirmed default/GA is `No feature flag (default/GA)`. Prefill **Spaces** from `space_id` (the session space, not “both”) and **Role** from `setup.resolved_role` when present.

## Deployment

Run `infer-deployment`; do not re-derive the mapping (`serverless` → Serverless, `stateful*` → ECH, a URL that contains `cloud` is only a hint and asks, write **both** only if the human or pack says so). Do not assume every session is local Scout: read `config.json` / the session URL / Scout architecture, and note Scout or local under install method or Preconditions as *how* it was exercised.

## Sanitize

Before draft-and-stop, run `scan-sensitive` on the finding and draft. Flag emails, `SDH…` / case IDs, NDA, “customer name/id”. Strip or ask to strip anything not needed to repro. Cases product language (`Opening case 12345`, `Cases table`) will flag — confirm and keep when it is UI text, not a customer ID, then `check-draft --sensitive-ok`. Security-sensitive bugs go to `elastic/security-team` (SKILL.md Classify); `--sensitive-ok` never unlocks `security_issue`, which only high-precision patterns (CVE id, key block, token or key value) raise; wording such as "vulnerability" or "exploit" is reported as a `security_hint` and never gates.

## Environment setup questions

On from-scratch filings **and** a **thin** exploratory-tester pack (`check-pack` exits 2; `Unknown` counts as answered), ask what a reproducer needs, one question at a time and only what is unknown: install method or deployment, sample data / Fleet / integrations / endpoint, users, privileges or spaces beyond the always-ask items, and anything else for **Preconditions:**. Do not assume a local or Scout session is what a triager will use.

## Media

Given a recording and stills:

1. Watch them. Draft steps, current behaviour, and expected if the UI makes it obvious. Quote what was on screen; do not invent clicks you did not see.
2. Put screenshot and recording/video paths (`Screenshot:`, `Recording:`, `Video:`) under **Current behaviour**. Resolve `` `$SESSION_DIR/...` `` to the real session directory. Upload those files (GitHub's undocumented `user-attachments` endpoint, which can change); `embed-uploads` writes images as `![name](url)` and videos as `<video src="url" controls></video>` on their own paragraph (GitHub inlines both).
3. Use a visible route or UI area for `Team:*` inference.
4. Ask for what media cannot provide: version, the always-ask items, console/network, server OS, endpoint version, expected if unclear.
5. If the video is unreadable or too long to trust, say so and ask for a still of the failure.

## Path B pack (collect steps live in SKILL.md)

`from-findings` sets `source: exploratory-tester` — keep it. After answers, **edit the draft markdown** (do not throw away media mapping). `check-draft` reads those headings; you do not have to copy the answers back into the JSON. Re-run `render-body` only if you update the JSON and want a clean rebuild.

## Existing `#N`

Still search; still confirm. Prefer comment / reopen+comment. With no `--finding`, `check-draft` on a comment skips the template-field gaps (the existing issue holds them) and still runs the sensitive, security, WIP and media gates. Still ask always-ask items that are **not already on that issue**. In the comment, add any missing repro context — do not only attach files. Do not retitle the existing issue unless the human asks.
