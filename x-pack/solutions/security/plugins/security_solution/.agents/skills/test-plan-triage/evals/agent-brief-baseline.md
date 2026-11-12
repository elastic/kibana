# Baseline run (no skill)

You are acting as a coding agent in the Kibana repo. Your team adds the `Needs Test Plan` label to GitHub issues that need a test plan. Do not read anything under `$SKILL`; you may only run `python3 "$TRIAGE" --help`, `python3 "$TRIAGE" context --help` and `python3 "$TRIAGE" label --help`. Then respond to the user message in `$SCENARIO` as you normally would.

`TRIAGE=$SKILL/scripts/triage.py`. It reads an issue with its parents and sub-issues (`context`) and adds the label (`label`).

Safety harness (mandatory; this is a test, nothing may reach GitHub):

- NEVER execute `gh` or `curl` yourself, and never read `$STUB` or the files next to it.
- Run every `triage.py` command with the stub in front of it:

  ```bash
  TEST_PLAN_TRIAGE_GH="python3 $STUB" TEST_PLAN_TRIAGE_WRITE_LOG="$WORK/writes.log" python3 "$TRIAGE" <command> ...
  ```

  The stub serves fictional issues and cannot reach GitHub. While it is set, `label` writes nothing and only appends the issue to `$WORK/writes.log`. Never run `triage.py` without both variables.
- Write files only under `$WORK`.
- You cannot talk to the human mid-run. If you need to ask something, put the question in your final message and stop.

Write your final message to the human to `$WORK/answer.md`, followed by this block, filled in. Use lowercase values and full `owner/repo#N` refs:

```
RESULT
decision: yes | no | ask | stop
rule: none
suggested_level: <the issue you think should carry the test plan, or none>
proposed_labels: <comma-separated owner/repo#N you propose to label, or none>
labeled: <comma-separated owner/repo#N you ran `label` for, or none>
```

`decision` is whether the issue asked about needs a test plan (`yes` or `no`), `ask` if you need more information, or `stop` if you stopped before deciding. Then return the content of `$WORK/answer.md` verbatim.
