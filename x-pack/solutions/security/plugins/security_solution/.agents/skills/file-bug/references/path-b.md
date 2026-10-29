# Path B — exploratory-tester pack (load only for a named tester finding)

Do **not** hand-map markdown. One command runs the collect pipeline:

```bash
python3 "$FILE_BUG" prepare --session-dir "$SESSION_DIR" --out-dir "$OUT" --title "$FINDING_TITLE"
```

`prepare` runs `parse-findings.py`, `from-findings` (pick one finding; `--index` is **1-based** and skips `Observation` blocks — prefer `--title`), `check-pack`, `infer-deployment`, `infer-release`, `scan-sensitive` and `render-body` in order. It writes `$OUT/finding.json` (the bare finding, `source: exploratory-tester`) and `$OUT/body.md`, and prints the pack gaps, deployment, release and sensitive hits. Exit `2` means something needs the human (pack gaps, a deployment or release `ask`, or `sensitive` hits such as an email); walk those one at a time. The `security` block is separate and never causes exit `2`: `security.issue` (a CVE id, key or token) or a signal you judge from the finding sets the repo as in SKILL.md Step 0, and `security.hints` only prompts you to re-read the finding. Then `FINDING_JSON=$OUT/finding.json` and `CONFIG_JSON=$SESSION_DIR/config.json`. Each step is also a standalone command (`--help`) for one-off use.

Then `infer-team` and `format-title` as in SKILL.md.

Path B create always includes `--label sec-eng-prod:exploratory-tester`, and `write` needs `--finding "$FINDING_JSON"`; never drop that label. Do not write back to `known_open_bugs` (the tester session’s already-open-bug list).
