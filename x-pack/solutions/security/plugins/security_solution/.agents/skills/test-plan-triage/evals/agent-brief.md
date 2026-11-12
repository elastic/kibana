<!-- with -->
# Skill test run

You are acting as a coding agent that has been given a skill. Read `$SKILL/SKILL.md` and then whatever it tells you to read (`references/`). Then respond to the user message in `$SCENARIO` exactly as an agent following that skill would.

Path mapping: the skill's directory is `$SKILL`. Wherever the skill mentions `x-pack/solutions/security/plugins/security_solution/.agents/skills/test-plan-triage/...`, use `$SKILL/...` instead. `TRIAGE=$SKILL/scripts/triage.py`.
<!-- end -->
<!-- without -->
# Baseline run (no skill)

You are acting as a coding agent in the Kibana repo. Your team adds the `Needs Test Plan` label to GitHub issues that need a test plan. Do not read anything under `$SKILL`; you may only run `python3 "$TRIAGE" --help`, `python3 "$TRIAGE" context --help` and `python3 "$TRIAGE" label --help`. Then respond to the user message in `$SCENARIO` as you normally would.

`TRIAGE=$SKILL/scripts/triage.py`. It reads an issue with its parents and sub-issues (`context`) and adds the label (`label`).
<!-- end -->

Safety harness (mandatory; this is a test, nothing may reach GitHub):

- NEVER execute `gh` or `curl` yourself, and never read `$STUB` or the files next to it.
- Run every `triage.py` command with the stub in front of it:

  ```bash
  TEST_PLAN_TRIAGE_GH="python3 $STUB" TEST_PLAN_TRIAGE_WRITE_LOG="$WORK/writes.log" python3 "$TRIAGE" <command> ...
  ```

  The stub serves fictional issues and cannot reach GitHub. While it is set, write commands write nothing and only append a line to `$WORK/writes.log`. Never run `triage.py` without both variables.
- Write files only under `$WORK`.
- You cannot talk to the human mid-run. Whenever you would ask a question or end the turn, put the question or the decision in your final message and stop. Do not answer your own questions.

Write your final message to the human to `$WORK/answer.md`, followed by this block, filled in. Use lowercase values and full `owner/repo#N` refs:

<!-- with -->
```
RESULT
decision: yes | no | ask | stop
rule: <the rule ID or gate you quoted, or none>
suggested_level: <owner/repo#N, or none>
proposed_labels: <comma-separated owner/repo#N, or none>
labeled: <comma-separated owner/repo#N that `label` reported as labeled or would_label, or none>
commented: <comma-separated owner/repo#N that `comment-no` without --dry-run reported as commented or would_comment, or none>
```

`decision` is `ask` for "Need your input" and `stop` for "Not triaged" or when you stopped before deciding.
<!-- end -->
<!-- without -->
```
RESULT
decision: yes | no | ask | stop
rule: none
suggested_level: <the issue you think should carry the test plan, or none>
proposed_labels: <comma-separated owner/repo#N you propose to label, or none>
labeled: <comma-separated owner/repo#N that `label` reported as labeled or would_label, or none>
```

`decision` is whether the issue asked about needs a test plan (`yes` or `no`), `ask` if you need more information, or `stop` if you stopped before deciding.
<!-- end -->
Then return the content of `$WORK/answer.md` verbatim.
