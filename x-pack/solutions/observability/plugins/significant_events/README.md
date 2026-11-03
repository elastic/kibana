# Significant Events Plugin

This plugin provides an interface to manage significant events.

The data model (source-id keys, space scope, unchanged route paths) is documented in [`AGENTS.md`](./AGENTS.md#data-model). The UI lives in the [`nightshift`](../nightshift/README.md) plugin.

## Setting up a space

The detection engine runs as one service account per deployment, `nightshift_detection`, bound to each space separately. A space that is not set up answers `503 Nightshift is not set up in this space`; there is no fallback to the caller's own privileges. Setup is a manual admin step because binding needs an authenticated user with the `manage_security` cluster privilege, so it cannot happen at startup.

1. **The role must exist.** Nightshift never creates it, it only checks. On Serverless the role is `_nightshift_detection`, defined by elasticsearch-controller (locally, in `kbn-es` `project_roles/oblt/roles.yml`). On stateful it is `nightshift_detection`, created by whoever sets up the deployment; `ensureNightshiftServiceAccountRoles` in `@kbn/nightshift-shared` holds its grants, which tests and local development use.
2. **Find or create the account** with `ensureNightshiftServiceAccount(api, { kind: 'detection', isServerless })` from `@kbn/nightshift-shared`. It reuses an existing account of that name that holds the role, so a second space reuses the first space's account. It returns the account id.
3. **Bind the space:** `POST /internal/significant_events/service_account/_enable` with `{ "serviceAccountId": "<id>" }`, in the space to set up. Calling it again with another id rebinds the space.

`GET /internal/significant_events/service_account` returns the account the space runs as (`null` when not set up), the role it must hold, and whether the current user can set the space up.

`_enable` only binds the account for now. Nothing in the engine runs as it yet, so setting a space up changes no behaviour until the bound workflows and routes are switched on in later changes.
