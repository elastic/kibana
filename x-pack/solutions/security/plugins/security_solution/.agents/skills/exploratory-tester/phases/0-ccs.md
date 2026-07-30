# Phase 0: Cross-Cluster Search (CCS) sessions

Read this file when the invocation targets a Cross-Cluster Search setup (testing against a
SOURCE cluster that issues cross-cluster queries against a REMOTE cluster). Ordinary
single-cluster sessions never need this file.

**The skill cannot create a CCS setup.** It can only test against one that already exists — a SOURCE cluster with a working, already-configured remote cluster connection to REMOTE. This means CCS sessions require a user-provided environment (never agent-managed/Scout) and the user must supply both SOURCE and REMOTE credentials directly. Before starting, verify the connection is real via `GET /api/remote_clusters` — if it doesn't exist or isn't connected, stop and tell the user to set it up first; do not attempt to create the remote cluster connection yourself.

This constrains Step 0a: proceed to `phases/0-user-provided-environment.md` using the **SOURCE**
cluster's credentials — never take the Agent-managed route for a CCS session.

## Step 0e — `config.json` additions

`environment.ccs` is `null` for the common single-cluster case — **omit or leave it `null` unless the session targets a CCS setup**. Top-level `environment.url` / `environment.es_url` always stay pointed at the **SOURCE** cluster.

When testing CCS, replace `null` with:
```json
"ccs": {
  "note": "SOURCE runs Kibana and issues cross-cluster queries; REMOTE holds the remote data",
  "source": { "role": "SOURCE", "url": "<SOURCE Kibana url — same as environment.url>" },
  "remote": {
    "role": "REMOTE",
    "url": "<REMOTE Kibana url>",
    "es_url": "<REMOTE elasticsearch url>",
    "credentials": {
      "api_key": "<REMOTE API key>",
      "username": "<REMOTE username for managed environments>",
      "password": "<REMOTE password for managed environments>"
    }
  },
  "remote_cluster_alias": "<alias configured on SOURCE — from GET /api/remote_clusters>",
  "remote_cluster_status_at_session_start": "<connected | not connected — from GET _remote/info>",
  "data_view_verified": false
}
```
Set `data_view_verified` to `true` only after confirming the tested data view's index pattern includes `<remote_cluster_alias>:*`.

Keep `ccs_state` as `"unchanged"` until a CCS snapshot is captured. Capture
sets it to `"captured"`; `break-remote-cluster.py` changes it to
`"mutation_pending"` before the request and to `"modified"` only after the
request succeeds. `restore-remote-cluster.py` sets it to `"restored"` only
after the original raw settings layers, configuration, provenance, and
connection have been verified. `"captured"` is pre-mutation — nothing has
been changed on the remote yet — so it does not block cleanup. Cleanup fails
closed for `"mutation_pending"` and `"modified"` (and for `"unchanged"` if a
snapshot was somehow captured without a state transition), since those mean
the remote may still differ from its original settings.

## During exploration

Read `scripts/ccs-techniques.md` for the full CCS diagnostic technique set before starting any flow — see `phases/2-flow-core.md`.

Return to `phases/0-setup.md` Step 0f once the `config.json` additions above are written.
