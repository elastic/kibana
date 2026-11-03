# Significant Events Plugin

This plugin provides an interface to manage significant events.

The data model (source-id keys, space scope, unchanged route paths) is documented in [`AGENTS.md`](./AGENTS.md#data-model). The UI lives in the [`nightshift`](../nightshift/README.md) plugin.

## Setting up a space

The detection engine runs as one service account per deployment, `nightshift_detection`, bound to each space separately. A space that is not set up answers `503 Nightshift is not set up in this space`; there is no fallback to the caller's own privileges. Setup is a manual admin step because binding needs an authenticated user with the `manage_security` cluster privilege, so it cannot happen at startup.

1. **The role must exist.** Nightshift never creates it, it only checks. On Serverless the role is `_nightshift_detection`, defined by elasticsearch-controller (locally, in `kbn-es` `project_roles/oblt/roles.yml`). On stateful it is `nightshift_detection`, created by whoever sets up the deployment as a native role (the check uses the Query Role API, which does not list roles defined in files); `ensureNightshiftServiceAccountRoles` in `@kbn/nightshift-shared` holds its grants, which tests and local development use.
2. **Find or create the account** with `ensureNightshiftServiceAccount(api, { kind: 'detection', isServerless })` from `@kbn/nightshift-shared`. It reuses an existing account of that name that holds the role, so a second space reuses the first space's account. It returns the account id.
3. **Bind the space:** `POST /internal/significant_events/service_account/_enable` with `{ "serviceAccountId": "<id>" }`, in the space to set up. Calling it again with another id rebinds the space.

The role reads source data with the `viewer` index pattern: every index except system ones (dot-prefixed) and `ilm-history-*`, with `read`, `view_index_metadata` and `read_view_metadata`, plus `read_project_routing`. A source's ES|QL can name any index, and a view is read with the caller's own privileges: an explicit index the account cannot read fails the query with a 403, and a wildcard silently skips it. System indices are left out on purpose; `.rule-events` and `.alert-actions` are covered by the `nightshift` feature privilege.

`GET /internal/significant_events/service_account` returns the account the space runs as (`null` when not set up), the role it must hold, and whether the current user can set the space up.

`_enable` binds the id it is given and does not check that the account exists or holds the role; `ensureNightshiftServiceAccount` is what guarantees both, so bind the id it returns. `_enable` also installs the space's bound workflows (`system-*-bound`, suffixed with the space id), each with `settings.run_as` set to the account. They refuse runs not started by the detection engine or its schedule. Nothing in the engine starts them yet, so setting a space up does not move any work onto the account until the routes are switched on in a later change. The bound sync and cleanup are installed switched off.
