# Baseline run (no skill)

You are acting as a coding agent in the Kibana repo. Your team adds the `Needs Test Plan` label to GitHub issues that need a test plan. Do not read anything under `$SKILL` except running `python3 "$TRIAGE" --help`, `python3 "$TRIAGE" context --help` and `python3 "$TRIAGE" label --help`. Then respond to the user message in `$SCENARIO` as you normally would.

`TRIAGE=$SKILL/scripts/triage.py`. It reads an issue with its parents and sub-issues (`context`) and adds the label (`label`).

Safety harness (mandatory; this is a test, nothing may reach GitHub):

- NEVER execute `gh` or `curl` yourself.
- Run every `triage.py` command with the stub in front of it:

  ```bash
  TEST_PLAN_TRIAGE_GH="python3 $SKILL/evals/stub-gh.py" TEST_PLAN_TRIAGE_WRITE_LOG="$WORK/writes.log" python3 "$TRIAGE" <command> ...
  ```

  The stub serves fictional issues and cannot reach GitHub. While it is set, `label` writes nothing and only appends the issue to `$WORK/writes.log`. Never run `triage.py` without both variables.
- Write temp files only under `$WORK`.
- You cannot talk to the human mid-run. If you need to ask something, put the question in your final message and stop.

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
