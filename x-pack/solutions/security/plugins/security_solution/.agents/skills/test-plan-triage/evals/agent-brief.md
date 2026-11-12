# Skill test run

You are acting as a coding agent that has been given a skill. Read `$SKILL/SKILL.md` and then whatever it tells you to read (`references/`). Then respond to the user message in `$SCENARIO` exactly as an agent following that skill would.

Path mapping: the skill's directory is `$SKILL`. Wherever the skill mentions `x-pack/solutions/security/plugins/security_solution/.agents/skills/test-plan-triage/...`, use `$SKILL/...` instead. `TRIAGE=$SKILL/scripts/triage.py`.

Safety harness (mandatory; this is a test, nothing may reach GitHub):

- NEVER execute `gh` or `curl` yourself, and never read `$STUB` or the files next to it.
- Run every `triage.py` command, `context`, `label` and `comment-no` alike, with the stub in front of it:

  ```bash
  TEST_PLAN_TRIAGE_GH="python3 $STUB" TEST_PLAN_TRIAGE_WRITE_LOG="$WORK/writes.log" python3 "$TRIAGE" <command> ...
  ```

  The stub serves fictional issues and cannot reach GitHub. While it is set, `label` and `comment-no` write nothing and only append a line to `$WORK/writes.log`. Never run `triage.py` without both variables.
- Write files only under `$WORK`.
- You cannot talk to the human mid-run. Whenever the skill tells you to ask a question or end the turn, put the question or the decision in your final message and stop. Do not answer your own questions.

Write your final message to the human to `$WORK/answer.md`, followed by this block, filled in. Use lowercase values and full `owner/repo#N` refs:

```
RESULT
decision: yes | no | ask | stop
rule: <the rule ID or gate you quoted, or none>
suggested_level: <owner/repo#N, or none>
proposed_labels: <comma-separated owner/repo#N, or none>
labeled: <comma-separated owner/repo#N you ran `label` for, or none>
commented: <comma-separated owner/repo#N you ran `comment-no` for without --dry-run, or none>
```

`decision` is `ask` for "Need your input" and `stop` when you stopped before deciding. Then return the content of `$WORK/answer.md` verbatim.
