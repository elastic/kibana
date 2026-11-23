# Nightshift detection

The detection engine of Nightshift. It runs detection strategies per space on a schedule and stores
what they find as detection signals. This plugin is server-only and built with Kibana DI
(`server/setup/`).

## Availability

The plugin is off by default (`xpack.nightshiftDetection.enabled: false`) and off in every shipped
config. When loaded, `AvailabilityService` also requires the `nightshift.enabled` feature flag, an
Observability project on Serverless, the `nightshift:detection-engine` pricing feature and an
Enterprise license.

## Layout

Server code is grouped by what it does, so a new feature adds a folder instead of growing a shared one:

- `server/lib/<domain>/`: the logic. `engine/` runs a tick, `strategies/` holds what a tick runs, `signals/` and `state/` store what it finds and where it stopped, `service_account/` binds a space to its account, `workflows/` installs the managed workflows.
- `server/routes/<feature>/`: one folder of routes per feature, built on `BaseEngineRoute`.
- `server/setup/bind_<feature>.ts`: the DI bindings of one feature, loaded from `server/index.ts`.

## Managed workflows

`WorkflowInstaller` installs and turns on every workflow listed in `DETECTION_WORKFLOW_IDS`
(`server/lib/workflows/workflow_registry.ts`). It installs each one off, bound to the space's service
account, and checks it runs as that account. The setup turns them on as its last step, so a setup that
fails or loses a race leaves nothing running. A workflow that cannot follow the others is turned off
again.

To add a workflow:

1. Define it in `@kbn/workflows/managed` with `defineBoundWorkflow`, with `pluginId: 'nightshiftDetection'`,
   under `managed/definitions/nightshift_detection/`, and register it in `managed/definitions/index.ts`.
2. List its id in `DETECTION_WORKFLOW_IDS`.
3. If it calls the plugin, add the route in `server/routes/<feature>/` and bind what it needs in
   `server/setup/bind_<feature>.ts`.

## Elasticsearch clients

Two clients, two identities:

- `DetectionEngineDataClient`: the space's detection service account, request-scoped. Generators read
  customer data with it.
- `DetectionEngineSystemClient`: `asInternalUser` (kibana_system). Every read and write on
  `.nightshift-detection_engine-*` goes through it, and so does the per-space run lock that
  `SpaceRunLock` takes in `.kibana_locks` (`@kbn/lock-manager`).

## Running it locally

Add to `config/kibana.dev.yml`:

```yaml
xpack.nightshiftDetection.enabled: true
xpack.security.serviceAccounts.enabled: true
```

## Setting up a space

The engine runs a space as the deployment's `nightshift_detection` service account. Kibana never
creates the account: a user with the `manage_security` cluster privilege and the Nightshift manage
privilege runs the setup, and the server only binds the space to the account it is given.

`POST /internal/nightshift/detection/service_account/_enable` with `{ "serviceAccountId": "<id>" }`
binds the space to an existing account. Calling it again with the same id changes nothing; another
space can reuse the account. Two `_enable` calls for the same space never run together: the second answers 409 while the first
holds the space's setup lock, and succeeds when called again.

Setting a space up also installs and enables its continuous detection workflow, `system-nightshift-continuous-detection-<space>`,
bound to the same account. It runs every minute and calls `POST /internal/nightshift/detection/_tick`
as the account. A user with `manage_nightshift` can call `_tick` too, and runs as the account;
`{ "skip_backlog": true }` starts every due strategy at its latest settled step instead of replaying
what it missed, and reports the minutes it skipped.

`GET /internal/nightshift/detection/service_account` reports the account a space runs as, the role
it must hold and whether the current user may set the space up.

The account's role must exist, and the engine never creates it:

- Stateful: create `nightshift_detection` with `ensureNightshiftServiceAccountRoles` from
  `@kbn/nightshift-shared` (tests, evals and local development do).
- Serverless: the role `_nightshift_detection` is predefined.

## Watching ticks

Each `_tick` answers with its `run_id`, a `status` (`completed`, `busy` when another tick holds the
space's run lock, `unavailable` when the engine turns off between the route's check and the run; an engine that is off answers 404 before that) and, per strategy, the window it covered, the
signals it wrote, the minutes it skipped, its notes and its error if it failed. A workflow run that
shows `busy` is normal while a long tick outlives its minute. A tick whose strategies failed still answers 200, so the workflow step succeeds: the `error` of each strategy in the body and the server logs are the signal until a later phase decides what should fail the run. The signals are in Alerting v2's
`.rule-events` data stream, with `source: elastic.nightshift_detection_engine`, and each strategy's
progress in the hidden `nightshift-detection-state` saved objects of the space. The runs themselves are in the workflow's execution history in
the Workflows app, under the space.

A setup that fails after it rebound a space to another account keeps the new binding, and the workflow keeps running as the previous account until a retry of `_enable` succeeds. Every tick is refused with 403 in between, so detection is paused for that space.

Turning the plugin off leaves the installed workflow calling a route that answers 404 every minute.
That is accepted, and there is no cleanup.
