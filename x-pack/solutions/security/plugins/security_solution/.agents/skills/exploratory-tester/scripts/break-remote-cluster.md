# Breaking and restoring a remote cluster (CCS sessions only)

Used from `phases/2-explore.md` → "CCS-specific techniques" → "Testing an unreachable remote cluster", when a flow's `expected` describes how the UI should behave while the remote cluster is unreachable or degraded.

**Requires:** an admin API key (`config.json → credentials.api_key`) and **explicit user confirmation before every run**. A remote cluster is shared, cluster-level infrastructure on the SOURCE deployment — not session-local state like a space or a test index. Breaking it affects every user and every app on that deployment until it is restored. **Never** run the break step without a fresh yes from the user, and **always** restore the exact original config before ending the session, even if a flow fails partway.

## Why capture-then-restore, not just break

The break is reversible only if you saved the exact original config first. `PUT /api/remote_clusters/<name>` overwrites the whole definition — if you break it without capturing `mode`, `serverName`, `skipUnavailable`, and `proxyAddress`/`seeds` first, you cannot put it back the way it was, and you have degraded a shared deployment with no undo. So the order is always: **capture → confirm → break → verify broken → test → restore → verify restored.** Restore is not optional and not "later" — it runs before you move to the next flow.

## Template

Fill in `<REMOTE_ALIAS>` (from `config.json → environment.ccs.remote_cluster_alias`), `<SOURCE_KIBANA_URL>` (= `environment.url`), `<SOURCE_ES_URL>` (= `environment.es_url`), and `<API_KEY>`.

### 1. Capture the exact live config — do this first
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/capture-remote-cluster.py \
  --session-dir "$SESSION_DIR" \
  --alias "<REMOTE_ALIAS>"
```
The script persists only the writable update payload in
`config.json → ccs_restore.payload`; it excludes read-only status fields from
the GET response. It also persists the restoration provenance
(`isConfiguredByNode` and `hasDeprecatedProxySetting`) so a node-configured
cluster is restored by removing the temporary persistent override rather than
being converted into a persistent configuration. Inspect the payload and
provenance and show them to the user before continuing. Note `mode` (`proxy`
or `sniff`), `proxyAddress` or `seeds`, `serverName`, `skipUnavailable`, and
`hasDeprecatedProxySetting`.

### 2. Get user confirmation

Show the user the captured config and ask, verbatim:

> "To test the unreachable-remote-cluster scenario I need to temporarily break the remote cluster `<REMOTE_ALIAS>` on the SOURCE deployment by pointing it at an invalid address. This affects the whole deployment until I restore it. I have saved the exact current config and will restore it as soon as the affected flows finish. Confirm I may proceed (yes/no)?"

Wait for an explicit yes. On anything else, skip the scenario and log the affected checklist step as `skipped: user declined remote-cluster break`.

### 3. Mark the session state before breaking the shared cluster
```bash
PYTHONPATH=x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts \
python3 - "$SESSION_DIR" <<'PY'
import sys
from pathlib import Path

from session_resources import edit_session_config

with edit_session_config(Path(sys.argv[1]) / "config.json") as config:
    config["ccs_state"] = "modified"
    config["ccs_restored"] = False
PY
```

### 4. Break it — invalid proxyAddress, everything else unchanged

Build the complete writable update payload from the persisted snapshot. Keep
all fields unchanged except the address that makes the connection fail:
```bash
CCS_BREAK_BODY=$(PYTHONPATH=x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts \
python3 - "$SESSION_DIR" <<'PY'
import json
import sys
from pathlib import Path

from session_resources import load_session_config

config = load_session_config(Path(sys.argv[1]) / "config.json")
payload = dict(config["ccs_restore"]["payload"])
if payload["mode"] == "sniff":
    payload["seeds"] = ["invalid.broken.example:9300"]
    payload["proxyAddress"] = None
    payload["proxySocketConnections"] = None
else:
    payload["proxyAddress"] = "invalid.broken.example:9400"
    payload["seeds"] = None
    payload["nodeConnections"] = None
print(json.dumps(payload, separators=(",", ":")))
PY
)
curl -s -X PUT -H "Authorization: ApiKey <API_KEY>" \
  -H "kbn-xsrf: true" -H "Content-Type: application/json" \
  "<SOURCE_KIBANA_URL>/api/remote_clusters/<REMOTE_ALIAS>" \
  -d "$CCS_BREAK_BODY"
```

### 5. Verify it is actually broken
```bash
curl -s -H "Authorization: ApiKey <API_KEY>" "<SOURCE_ES_URL>/_remote/info?pretty"
```
Confirm `<REMOTE_ALIAS>.connected` is `false` before running any test flow. If it still shows `connected: true`, the change has not propagated — wait a few seconds and re-check; do not start the flow against a still-connected cluster.

### 6. Run the affected flows

Run the CCS "unreachable remote" flows now. Capture evidence exactly as for any finding (`scripts/record-evidence.md`).

### 7. Restore the exact original config
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/restore-remote-cluster.py \
  --session-dir "$SESSION_DIR"
```

The script restores from the durable snapshot, verifies the complete
configuration and provenance, polls until `<REMOTE_ALIAS>.connected == true`,
and only then sets `ccs_state="restored"`. **Do not proceed to the next flow,
and do not end the session, until this command succeeds.** If restore fails,
tell the user immediately with the persisted snapshot so they can restore it
manually — treat a broken shared deployment as urgent.

## Notes

- Only the SOURCE deployment holds the remote-cluster definition; run every command here against the SOURCE URLs, never the REMOTE cluster's.
- Break as late as possible and restore as early as possible — keep the shared deployment degraded for the shortest window that still lets you observe the UI.
- If the session cap fires or the browser dies mid-scenario, run step 7 first
  from the persisted `SESSION_DIR`, then handle the timeout/loss. Restoration
  takes priority over logging.
