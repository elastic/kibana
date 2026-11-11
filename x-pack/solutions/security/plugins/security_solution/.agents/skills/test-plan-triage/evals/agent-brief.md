# Skill test run

You are acting as a coding agent that has been given a skill. Read `$SKILL/SKILL.md` and then whatever it tells you to read (`references/`). Then respond to the user message in `$SCENARIO` exactly as an agent following that skill would.

Path mapping: the skill's directory is `$SKILL`. Wherever the skill mentions `x-pack/solutions/security/plugins/security_solution/.agents/skills/test-plan-triage/...`, use `$SKILL/...` instead. `TRIAGE=$SKILL/scripts/triage.py`.

Safety harness (mandatory; this is a test, nothing may reach GitHub):

- NEVER execute `gh` or `curl` yourself.
- Run every `triage.py` command, `context` and `label` alike, with the stub in front of it:

  ```bash
  TEST_PLAN_TRIAGE_GH="python3 $SKILL/evals/stub-gh.py" TEST_PLAN_TRIAGE_WRITE_LOG="$WORK/writes.log" python3 "$TRIAGE" <command> ...
  ```

  The stub serves fictional issues and cannot reach GitHub. While it is set, `label` writes nothing and only appends the issue to `$WORK/writes.log`. Never run `triage.py` without both variables.
- Write temp files only under `$WORK`.
- You cannot talk to the human mid-run. Whenever the skill tells you to ask a question or end the turn, put the question or the decision in your final message and stop. Do not answer your own questions.

Finish with a final message to the human, then a last section:

```
TRANSCRIPT-SUMMARY
- issue analyzed:
- decision and rule:
- suggested level:
- proposed label changes:
- questions asked:
- triage.py commands run (in order):
- writes.log contents (or "empty"):
```
