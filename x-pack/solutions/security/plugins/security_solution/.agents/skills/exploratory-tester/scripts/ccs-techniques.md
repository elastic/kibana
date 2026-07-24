# CCS Testing Techniques

Use these techniques for sessions where `config.json → environment.ccs` is set.

**Is this panel even CCS-aware? — inspect the request `index` param.** The most decisive CCS diagnostic: read the panel's own outbound request body to tell "genuinely CCS-aware but currently degraded" apart from "never built to query the remote at all."
1. After the panel loads, find the search/data request that populates it via `browser_network_requests`.
2. Read its request body's `index` (or `indices`/`pattern`) parameter.
3. **Includes a remote-prefixed pattern** (`<remote_cluster_alias>:*`) → the panel *is* CCS-aware; empty/wrong results are a degradation or data bug — investigate further. **Only local patterns, no `<alias>:` prefix** → the panel never queries remote; empty results mean "feature doesn't support CCS," not a runtime bug. **Always log which case applies.**

**Prove real data exists before concluding "unsupported" — positive control.** When a CCS panel shows nothing and you can't tell whether the feature is unsupported or there's simply no matching data, manufacture a genuinely rule-fired alert with `scripts/positive-control-alert.md`. If the control lands but the panel stays empty, the gap is the feature, not the data.

**Testing an unreachable remote cluster.** When a flow's `expected` describes UI behavior while the remote cluster is down, do **not** improvise. Follow `scripts/break-remote-cluster.md` exactly: capture the live config, get explicit user confirmation, break it, verify it's broken, run the flow, then restore the exact original config and verify reconnection before continuing. Restoration is mandatory — a remote cluster is shared deployment infrastructure, not session-local state.
