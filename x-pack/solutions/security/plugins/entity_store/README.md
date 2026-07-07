# Entity Store

Central place for Entities management and logs extraction.

## Entity AI Summary — index privileges

The Entity AI Summary is persisted to the entity **metadata** datastream
(`.entities.v2.metadata.security_{namespace}`), not to the entity latest index.
Its access-control model separates generation from display:

- **Generation** is gated only on feature-level permissions — the Security Solution
  Kibana feature plus its `entity-analytics` sub-privilege — and an **Enterprise**
  license. The persisted document is written with the Kibana **internal** user
  (`asInternalUser`), so a user does **not** need their own write privilege on the
  metadata index to generate and persist a summary.
- **Display** is gated on the user's **own** read privilege on
  `.entities.v2.metadata.security_*`. With read access the persisted summary is shown
  (including the original `generated_by` / `generated_at`, so a second user sees the
  first user's generation); without it the flyout gracefully falls back to on-demand
  generation and nothing is persisted for that view.

### Serverless

Serverless project roles already grant the required access (see
`src/platform/packages/shared/kbn-es/src/serverless_resources/project_roles/security/roles.yml`):
`viewer` / `t1_analyst` get `read` on `.entities.v2.metadata.security_*`, while
`editor` / `t2_analyst` / `detections_admin` get `read` + `write`.

### Self-managed / ECH (stateful)

To **see** a persisted AI summary on self-managed or Elastic Cloud Hosted deployments,
a user needs, in addition to the Security Solution Kibana feature privileges:

- `read` on the entity metadata indices `.entities.v2.metadata.security_*`.

No metadata **write** privilege is required for any user, because persistence always
goes through the Kibana internal user. Users lacking metadata read still get on-demand
generation (graceful degradation).

> Note: Elasticsearch built-in roles (e.g. `detections_admin`) are defined in the
> Elasticsearch repository, not in this fork. Whether they already include
> `.entities.v2.metadata.security_*` read is a verification item against a live cluster,
> not something enforced here. Kibana test fixtures cover the model via custom roles
> (see `security_solution/test/scout/entity_analytics/api/tests/ai_summary`).

## Entity Maintainers Framework

The Entity Store plugin exposes an **Entity Maintainers Framework** so that other plugins can register recurring tasks that run in the context of the entity store. Registration is part of the plugin setup contract: consumers call `registerEntityMaintainer` during their plugin’s `setup` phase and supply a configuration object.

### Setup contract and registration config

From the setup contract:

```ts
interface EntityStoreSetupContract {
  registerEntityMaintainer: RegisterEntityMaintainer;
}
```

`RegisterEntityMaintainer` accepts a `RegisterEntityMaintainerConfig`:

```ts
interface RegisterEntityMaintainerConfig {
  id: string;
  description?: string;
  interval: string;
  initialState: EntityMaintainerState;
  run: EntityMaintainerTaskMethod;
  setup?: EntityMaintainerTaskMethod;
}
```

- **id** - Unique identifier for the maintainer (used for task type and scheduling).
- **interval** - Cron-like interval at which the task runs (e.g. `5m`, `1h`).
- **initialState** - Initial state object for the maintainer, used on the first run before any `setup` or `run` has executed.
- **run** - Required. Called on every run (including the first). Must return the current state it manages.
- **setup** - Optional. If provided, it runs once before the first `run`. Useful for one-time initialization. 

### Scheduling and namespaces

The framework schedules all registered maintainers when the Entity Store is installed for a given space. 
The framework is **namespace aware**: each Kibana space gets its own task instance per maintainer (e.g. one task per `id` per namespace). Registration is global, scheduling is per namespace at install time.

### Run and setup behavior

- **run** is invoked on every execution at the configured interval. It receives a context (see below) and must return the **current state** it manages. That state is persisted and passed back in the context on the next run.
- **setup** is optional. When supplied, it runs a single time before the first **run**. It receives the same context shape and also returns state, that state becomes the initial state for the first **run**. If setup performs heavy work, the first iteration can be noticeably longer than subsequent ones.

Both methods must return the state object they manage so the framework can store it and expose it in the context for the next iteration.

### Callback context

Both `run` and `setup` receive a single context argument with:

- **status** - Object containing:
  - **metadata** - Maintained by the framework: `namespace`, `runs` (execution count), `lastSuccessTimestamp`, `lastErrorTimestamp`.
  - **state** - The state returned by the previous `run` (or by `setup` on the first run, or `initialState` before any execution).
- **abortController** - For cooperative cancellation if needed.
- **logger** - Scoped logger for the task.
- **fakeRequest** - Request-scoped utilities for the task execution environment.
- **esClient** - An Elasticsearch client scoped to the current context, using the permissions of the user who triggered the Entity Store plugin installation process.

Consumers implement their maintenance logic in `run` (and optionally in `setup`) using this context and return the updated state so the framework can keep it for the next run.
