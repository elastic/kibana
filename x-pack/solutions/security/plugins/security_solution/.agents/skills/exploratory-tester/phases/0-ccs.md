# Phase 0: Cross-Cluster Search (CCS) sessions — environment routing

Read this from `phases/0-setup.md` Step 0a when the session targets a CCS setup. Ordinary
single-cluster sessions never need this file. The `config.json` schema for CCS lives in a
separate file, `phases/0-ccs-config.md`, read later from Step 0e — not from here, and not on this
visit; see the pointer at the end of this file.

**The skill cannot create a CCS setup.** It can only test against one that already exists — a SOURCE cluster with a working, already-configured remote cluster connection to REMOTE. This means CCS sessions require a user-provided environment (never agent-managed/Scout) and the user must supply both SOURCE and REMOTE credentials directly. Before starting, verify the connection is real via `GET /api/remote_clusters` — if it doesn't exist or isn't connected, stop and tell the user to set it up first; do not attempt to create the remote cluster connection yourself.

This constrains Step 0a: proceed to `phases/0-user-provided-environment.md` using the **SOURCE**
cluster's credentials — never take the Agent-managed route for a CCS session.
`0-user-provided-environment.md` returns to `phases/0-setup.md` Step 0b on its own; continue the
normal Step 0b–0d flow from there. When Step 0e is reached, read `phases/0-ccs-config.md` for the
`config.json` additions and its own return instruction — that file, not this one, again.

## During exploration

Read `scripts/ccs-techniques.md` for the full CCS diagnostic technique set before starting any flow — see `phases/2-flow-core.md`.
