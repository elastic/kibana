# Confirm before logging (Level 1 / Level 2 candidates only)

You reached this file because `phases/2-flow-core.md` produced a candidate
Level 1 or Level 2 finding — from a detector or from agent judgment. Level 3
observations never come here; log them directly from `2-flow-core.md`.

Every candidate Level 1 or Level 2 finding gets a cheap reproduction check
before it becomes a finding. A single observation cannot distinguish a
genuine bug from a one-off race, a stale session, or an artifact of the
exact moment you looked. This has produced confirmed false-positive
findings before.

**1. Reproduce it once more.** Re-trigger the same action from a fresh state (reload the page, or repeat the interaction) and confirm the same result occurs a second time.
- **Does not reproduce** → do not log it, not even at Level 3. Note in your own scratch tracking that you checked it, so you don't re-investigate the same non-issue later in the flow.
- **Reproduces identically** → proceed to step 2.

If the candidate finding is specifically an **absent element** ("X never appeared", "X is missing" — not a wrong state, just total absence), the reproduction check needs more rigor than a second identical glance, because the exact race that produces false absences resolves within seconds and won't be caught by immediately repeating the same quick look:
- Re-check with a longer, explicit wait: reload or re-trigger, then either call `browser_wait_for(text: "<the missing element's visible text>", time: 10)` or take a second `browser_snapshot` at least 5 seconds after the first.
- Corroborate with Detector C — check whether the network call(s) that would populate the element were made at all:
  - **Never called** → genuine gating/blocking (e.g. a frontend privilege pre-check). Reproduces — proceed to step 2.
  - **Called and still pending** → not settled yet; extend the wait, not confirmed yet.
  - **Called and failed (4xx/5xx)** → log the failed call itself via Detector C's normal path instead; the missing element is a downstream symptom, not a separate finding.
  - **Called and succeeded, but the element still didn't render** → genuine rendering bug. Reproduces — proceed to step 2, and include the successful response in the evidence so the finding can't later be mistaken for a privilege or data problem.
  - **Called and succeeded, but the response body is genuinely empty** → the element may be absent simply because there is no data, not because of a bug. Before logging "no data" as expected, consider whether real data *should* exist: if so, manufacture a positive control (`scripts/positive-control-alert.md`) and re-check. Only conclude "unsupported/broken" if the panel stays empty after a verified positive control lands.

**2. Record video evidence.** Once a Level 1 or Level 2 finding reproduces, capture it on video using the split-screen technique in `scripts/record-evidence.md`: the real product on one side, untouched, and a live evidence panel on the other side driven by Playwright's own `response`/`console` listeners (not narration added after the fact). Save to `$SESSION_DIR/videos/findings-flow-<N>[-<slug>].mp4` and reference it in the finding's Evidence section (`- Video: $SESSION_DIR/videos/findings-flow-<N>.mp4`).

This step requires the `browser_run_code_unsafe` tool and a working `ffmpeg` install. **Verify both directly before writing "unavailable" — do not assume.** Confirming availability is a near-zero-cost check (e.g. `which ffmpeg`, milliseconds), not the recording itself, so being short on time is never a valid reason to skip the check. "I didn't have time to verify ffmpeg was installed" is not a real constraint — running the check costs less time than writing that sentence did. If the check genuinely fails (tool errors out, `ffmpeg` not found), skip the recording, do not block on it, and note `- Video: unavailable (<reason from the actual failed check>)` in the finding's Evidence section instead — the finding still gets logged from step 1's reproduction evidence.

If several Level 1/2 findings surface from the same checklist step in close succession (e.g. two related findings during one flyout open), one recording covering all of them is fine — do not re-record the same setup repeatedly. Use a slug suffix to distinguish them in the filename when one video covers more than one finding title.

**3. Write the finding.** Only now write the entry to `findings-flow-<N>.md`, including the video reference from step 2.

## Mini-probe (Level 1 or Level 2 finding)

Before moving to the next checklist step:
- Budget: **2 extra minutes** or 2 targeted actions, whichever fires first.
- Try 1–2 variations: different data item, adjacent navigation path, or related action. **When the finding involves a shared UI component** (picker, KPI card, data view selector), visiting 1–2 adjacent pages that use the same component is the highest-value probe — it distinguishes page-specific from systemic issues.
- Log new findings immediately (same flow, same step label, suffix "— mini-probe").
- Do **not** claim a new flow's timebox. If the parent flow's timebox fires during a mini-probe, stop and log remaining steps as `skipped: time budget exhausted`.

## What's next

Return to `phases/2-flow-core.md` and continue the checklist — unless the
finding you just logged was **Level 1** and the mini-probe left its scope
unresolved (you don't know whether it's isolated to this flow or a
cross-feature blocker). In that case:

- **Single mode, or you are the orchestrator itself:** read
  `phases/2-investigation.md` and follow it.
- **Parallel-mode sub-agent:** do **not** open an investigation flow
  yourself (see the Worker deny-list in `2-flow-core.md`) — finish this
  flow normally. The orchestrator reads your findings file after Wave 1
  and decides whether to open one.
