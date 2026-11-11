# Red flags — STOP

Read when tempted to shortcut phases. Violating the letter of these rules is violating the spirit.

| If you're thinking… | Reality |
|---------------------|---------|
| "PR merged ⇒ AC pass" | Run static + CI + live as tagged. |
| "VALIDATED is just paperwork — don't block shipping" | Merged ≠ QA-validated. Incomplete evidence → not VALIDATED. |
| "Re-run Scout to prove automation" | CI attestation first; Scout = fallback. |
| "Static passed — skip live" | `live_required` needs Phase 4. |
| "Post the comment now" | Phase 6 only after publish phrase. |
| "No AC — I'll infer" | BLOCKED; list gaps. |
| "Usual Cloud Security checks — infer AC from experience" | Only ticket AC. Missing → BLOCKED, not playbook folklore. |
| "Inline exploratory-tester" | Delegate that skill’s `SKILL.md`. |
| "Manual in test plan — skip CI" | Refresh plan; convert → live-steps and run. |
| "CI green — skip manual live" | Manual needs live-steps + Phase 4. |
| "Rewrite Gherkin as steps" | Keep Gherkin; write `qa-validation-#N-live-steps.md`. |
| "No test plan — invent scenarios" | `test-plan-generator` Steps 1–3, **draft only**. |
| "Looks like a bug — bug-validator verdicts" | Wrong skill; release AC PASS/FAIL only. |
| "Partial draft already says VALIDATED — just publish" | Finish Phases 0–5 honestly; Phase 6 only on user publish phrase. |
| "Draft already PASS from prior session — re-ship under time pressure" | Re-verify evidence; do not rubber-stamp a prior over-claim. |
| "Not inventing PASS — just packaging evidence that already exists" | Prior draft is not authoritative. Re-check AC/live gaps before any verdict. |
| "gh comment is faster than the publish script" | Use [`publish_validation_report.sh`](../scripts/publish_validation_report.sh) only. |

**All of these mean: stop the shortcut; resume the phase table in `SKILL.md`.**
