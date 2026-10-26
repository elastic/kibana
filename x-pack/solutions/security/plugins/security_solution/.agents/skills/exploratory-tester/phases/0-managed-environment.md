# Phase 0: Agent-managed environment

Taken when `Environment.url` is absent from the invocation and no profile was loaded.

| `Environment.type` | Command |
|---|---|
| `stateful-classic` (default) | `node scripts/scout start-server --arch stateful --domain classic &` |
| `serverless` | `node scripts/scout start-server --arch serverless --domain <domain> &` |

If Scout is already running on port 5620 — reuse it. Tell the user an existing session is being reused.

**Failure:** Scout not available within 10 min → **Stop.** Tell user to check `node scripts/scout start-server` logs.

Set `environment.managed` to `true` in `config.json` (Step 0e) — this route always takes the Agent-managed branch. Step 1a keys off this field to decide whether to poll the local Scout server for readiness.

Return to `phases/0-setup.md` Step 0b once the environment is up.
