# Breaking and restoring a remote cluster (CCS sessions only)

Used from `phases/2-explore.md` → "CCS-specific techniques" → "Testing an unreachable remote cluster", when a flow's `expected` describes how the UI should behave while the remote cluster is unreachable or degraded.

**Requires:** an admin API key (`config.json → credentials.api_key`) and **explicit user confirmation before every run**. A remote cluster is shared, cluster-level infrastructure on the SOURCE deployment — not session-local state like a space or a test index. Breaking it affects every user and every app on that deployment until it is restored. **Never** run the break step without a fresh yes from the user, and **always** restore the exact original config before ending the session, even if a flow fails partway.

## Why capture-then-restore, not just break

The break is reversible only if you saved the exact original config first. `PUT /api/remote_clusters/<name>` overwrites the whole definition — if you break it without capturing `mode`, `serverName`, `skipUnavailable`, and `proxyAddress`/`seeds` first, you cannot put it back the way it was, and you have degraded a shared deployment with no undo. So the order is always: **capture → confirm → break → verify broken → test → restore → verify restored.** Restore is not optional and not "later" — it runs before you move to the next flow.

## Template

Fill in `<REMOTE_ALIAS>` (from `config.json → environment.ccs.remote_cluster_alias`), `<SOURCE_KIBANA_URL>` (= `environment.url`), `<SOURCE_ES_URL>` (= `environment.es_url`), and `<API_KEY>`.

### 1. Capture the exact live config — do this first
```bash
curl -s -H "Authorization: ApiKey <API_KEY>" \
  "<SOURCE_KIBANA_URL>/api/remote_clusters" | python3 -m json.tool
```
Save the object for `<REMOTE_ALIAS>` verbatim — you will restore it byte-for-byte. Note `mode` (`proxy` or `sniff`), `proxyAddress` or `seeds`, `serverName`, and `skipUnavailable`.

### 2. Get user confirmation

Show the user the captured config and ask, verbatim:

> "To test the unreachable-remote-cluster scenario I need to temporarily break the remote cluster `<REMOTE_ALIAS>` on the SOURCE deployment by pointing it at an invalid address. This affects the whole deployment until I restore it. I have saved the exact current config and will restore it as soon as the affected flows finish. Confirm I may proceed (yes/no)?"

Wait for an explicit yes. On anything else, skip the scenario and log the affected checklist step as `skipped: user declined remote-cluster break`.

### 3. Break it — invalid proxyAddress, everything else unchanged

Keep `mode`, `serverName`, and `skipUnavailable` exactly as captured; change only the address to something that cannot resolve:
```bash
curl -s -X PUT -H "Authorization: ApiKey <API_KEY>" -H "Content-Type: application/json" \
  "<SOURCE_KIBANA_URL>/api/remote_clusters/<REMOTE_ALIAS>" \
  -d '{ "mode": "<captured mode>", "proxyAddress": "invalid.broken.example:9400", "serverName": "<captured serverName>", "skipUnavailable": <captured skipUnavailable> }'
```
(For a `sniff`-mode cluster, replace `proxyAddress` with `"seeds": ["invalid.broken.example:9300"]`.)

### 4. Verify it is actually broken
```bash
curl -s -H "Authorization: ApiKey <API_KEY>" "<SOURCE_ES_URL>/_remote/info?pretty"
```
Confirm `<REMOTE_ALIAS>.connected` is `false` before running any test flow. If it still shows `connected: true`, the change has not propagated — wait a few seconds and re-check; do not start the flow against a still-connected cluster.

### 5. Run the affected flows

Run the CCS "unreachable remote" flows now. Capture evidence exactly as for any finding (`scripts/record-evidence.md`).

### 6. Restore the exact original config
```bash
curl -s -X PUT -H "Authorization: ApiKey <API_KEY>" -H "Content-Type: application/json" \
  "<SOURCE_KIBANA_URL>/api/remote_clusters/<REMOTE_ALIAS>" \
  -d '<the exact object captured in step 1>'
```

### 7. Verify reconnection before continuing
```bash
curl -s -H "Authorization: ApiKey <API_KEY>" "<SOURCE_ES_URL>/_remote/info?pretty"
```
Confirm `connected: true` again and that the socket/connection count matches what step 1 showed. **Do not proceed to the next flow, and do not end the session, until reconnection is verified.** If restore fails, tell the user immediately with the captured original config so they can restore it manually — treat a broken shared deployment as urgent.

## Notes

- Only the SOURCE deployment holds the remote-cluster definition; run every command here against the SOURCE URLs, never the REMOTE cluster's.
- Break as late as possible and restore as early as possible — keep the shared deployment degraded for the shortest window that still lets you observe the UI.
- If the session cap fires or the browser dies mid-scenario, restore first (steps 6-7), then handle the timeout/loss. Restoration takes priority over logging.
