# Skill test run

You are acting as a coding agent that has been given a skill. Read `$SKILL/SKILL.md` and then whatever it tells you to read (`references/`, `templates/`). Then respond to the user message in `$SCENARIO` exactly as an agent following that skill would.

Path mapping: the skill's directory is `$SKILL`. Wherever the skill mentions `x-pack/solutions/security/plugins/security_solution/.agents/skills/file-bug/...`, use `$SKILL/...` instead. `FILE_BUG=$SKILL/scripts/file-bug.py`. Use `python3 -I` is NOT required; run it as `python3 "$FILE_BUG" <cmd>`.

Safety harness (mandatory; this is a test, nothing may reach GitHub):
- NEVER execute `gh`, `curl`, `file-bug.py write`, or `file-bug.py upload`. When the skill says to run one of them, instead print it in a block that starts with the line `WOULD-RUN:` and continue as if it succeeded. Assume write/upload succeed.
- `file-bug.py search` and `file-bug.py validate-labels --repo` run `gh` internally, so run them only as `FILE_BUG_GH="python3 $STUB_GH" STUB_MODE=<mode> python3 "$FILE_BUG" <command> ...`, where `<mode>` is the one named in your scenario (`empty` if none). The stub simulates GitHub and cannot reach it. Never run either without `FILE_BUG_GH`.
- Other `file-bug.py` subcommands (scan-sensitive, check-draft, scan-wip, infer-*, format-title, render-body, decide, ...) you may run for real. Write temp files only under `$WORK`.
- You can view images with the Read tool.
- You cannot talk to the human mid-run. Whenever the skill tells you to ask a question, hard stop, or end the turn, put the question/draft in your final message and stop. Do not answer your own questions.

Finish with a final message to the human, then a last section:

TRANSCRIPT-SUMMARY
- repo targeted:
- questions asked:
- WOULD-RUN commands (in order):
- write issued (create/comment/none):
