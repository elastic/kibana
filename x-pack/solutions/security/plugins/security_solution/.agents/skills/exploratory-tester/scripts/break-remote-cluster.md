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
(`isConfiguredByNode` and `hasDeprecatedProxySetting`) and the exact
persistent/transient Elasticsearch settings layers. Legacy `proxy` settings
remain in the raw snapshot instead of being sent through the Kibana serializer,
and transient settings are restored to the transient layer. Inspect the
payload and provenance and show them to the user before continuing. Note `mode`
(`proxy` or `sniff`), `proxyAddress` or `seeds`, `serverName`,
`skipUnavailable`, and `hasDeprecatedProxySetting`.

### 2. Get user confirmation

Show the user the captured config and ask, verbatim:

> "To test the unreachable-remote-cluster scenario I need to temporarily break the remote cluster `<REMOTE_ALIAS>` on the SOURCE deployment by pointing it at an invalid address. This affects the whole deployment until I restore it. I have saved the exact current config and will restore it as soon as the affected flows finish. Confirm I may proceed (yes/no)?"

Wait for an explicit yes. On anything else, skip the scenario and log the affected checklist step as `skipped: user declined remote-cluster break`.

### 3. Journal and break it — invalid address, everything else unchanged
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/break-remote-cluster.py \
  --session-dir "$SESSION_DIR" \
  --alias "<REMOTE_ALIAS>"
```
The script records `ccs_state="mutation_pending"` before issuing the shared
cluster request, and changes it to `modified` only after the request succeeds.
If the process crashes or the request fails, cleanup still treats the pending
state as requiring restoration. For a persistent or transient snapshot it
mutates the original Elasticsearch settings layer directly; for a
node-configured cluster it uses the Kibana API to create a temporary
persistent override. It never sends `hasDeprecatedProxySetting` through the
Kibana serializer, so legacy proxy configuration is not silently converted to
`proxy: null`.

### 4. Verify it is actually broken
```bash
curl -s -H "Authorization: ApiKey <API_KEY>" "<SOURCE_ES_URL>/_remote/info?pretty"
```
Confirm `<REMOTE_ALIAS>.connected` is `false` before running any test flow. If it still shows `connected: true`, the change has not propagated — wait a few seconds and re-check; do not start the flow against a still-connected cluster.

### 5. Run the affected flows

Run the CCS "unreachable remote" flows now. Capture evidence exactly as for any finding (`scripts/record-evidence.md`).

### 6. Restore the exact original config
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/restore-remote-cluster.py \
  --session-dir "$SESSION_DIR"
```

The script restores the raw persistent/transient settings layers from the
durable snapshot, verifies the complete configuration and provenance, polls
until `<REMOTE_ALIAS>.connected == true`, and only then sets
`ccs_state="restored"`. **Do not proceed to the next flow, and do not end the
session, until this command succeeds.** If restore fails, tell the user
immediately with the persisted snapshot so they can restore it manually —
treat a broken shared deployment as urgent.

## Notes

- Only the SOURCE deployment holds the remote-cluster definition; run every command here against the SOURCE URLs, never the REMOTE cluster's.
- Capture, break, and restore take a deployment-scoped lock derived from
  `environment.es_url` (override directory with
  `EXPLORATORY_TESTER_CCS_LOCK_DIR`) so concurrent exploratory sessions against
  the same SOURCE cluster cannot mutate CCS at the same time.
- Break as late as possible and restore as early as possible — keep the shared deployment degraded for the shortest window that still lets you observe the UI.
- If the session cap fires or the browser dies mid-scenario, run step 6 first
  from the persisted `SESSION_DIR`, then handle the timeout/loss. Restoration
  takes priority over logging.
