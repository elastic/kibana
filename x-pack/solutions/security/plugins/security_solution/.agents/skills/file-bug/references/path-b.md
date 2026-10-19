# Path B — exploratory-tester pack (load only for a named tester finding)

Do **not** hand-map markdown. Parse, pick the finding, then run the checks:

```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/parse-findings.py \
  --session-dir "$SESSION_DIR"
python3 "$FILE_BUG" from-findings \
  --jsonl "$SESSION_DIR/findings.jsonl" --title "$FINDING_TITLE" \
  --out "$FINDING_JSON"
```

`from-findings` prints the **bare** finding (`source: exploratory-tester`); pass that file to later `--finding` flags. `--index` is **1-based** (`--index 2` is the second fileable finding) and skips `Observation` blocks; prefer `--title`. `CONFIG_JSON` is `$SESSION_DIR/config.json`.

```bash
python3 "$FILE_BUG" check-pack --finding "$FINDING_JSON" --config "$CONFIG_JSON"
python3 "$FILE_BUG" infer-deployment --finding "$FINDING_JSON" --config "$CONFIG_JSON"
python3 "$FILE_BUG" infer-release --finding "$FINDING_JSON" --config "$CONFIG_JSON"
python3 "$FILE_BUG" scan-sensitive --finding "$FINDING_JSON"
python3 "$FILE_BUG" render-body --finding "$FINDING_JSON" --config "$CONFIG_JSON" --out body.md
```

Then `infer-team` and `format-title` as in SKILL.md.

Path B create always includes `--label sec-eng-prod:exploratory-tester`, and `write` needs `--finding "$FINDING_JSON"`; never drop that label. Do not write back to `known_open_bugs` (the tester session’s already-open-bug list).
