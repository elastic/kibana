# Entity Store

Central place for Entities management and logs extraction.

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
