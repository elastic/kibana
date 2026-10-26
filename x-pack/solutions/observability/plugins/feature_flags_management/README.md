# Feature flags management

Manages feature flags, the apps that evaluate them, their environments and SDK credentials. Fleet Server serves the evaluations through OFREP.

The plugin is disabled by default. Enable it with:

```yaml
xpack.featureFlagsManagement.enabled: true
```

When it is disabled, Kibana doesn't load it, so it creates no indices, registers no routes and schedules no tasks.

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `xpack.featureFlagsManagement.enabled` | `false` | Enables the plugin. |
| `xpack.featureFlagsManagement.observedContexts.retention` | `30d` | Observed evaluation contexts whose `last_seen` is older than this are deleted by a background task. |

## Layout

- `common/`: API paths, the API version, privileges, Zod request and response schemas, the inferred TypeScript types, and pure flag validation. Both the server and the UI use it.
- `server/storage/`: index names, mappings, index bootstrap and the definitions repository.
- `server/services/`: domain services (environments, apps, credentials, flags, observed contexts) and auditing.
- `server/routes/`: the public versioned HTTP API under `/api/feature_flags`.
- `server/tasks/`: the observed-contexts retention task.
- `public/`: the management app.
