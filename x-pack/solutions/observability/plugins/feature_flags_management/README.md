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
- `public/`: the management app at `/app/feature_flags`.

## UI

Stack Management → Feature flags has three screens.

- **Flags** lists flags and filters them by search text, app, environment, tag and team owner. The editor sets the key, variations, apps and, for each environment, the default variation, prerequisites and rules.
- The rule composer orders rules so the first match wins. A match rule has an attribute, an operator and values. Suggestions come from observed evaluation contexts, and free text is allowed. The rule then either serves a variation or nests further rules, which are combined with AND. A percentage rule splits traffic across variations and the weights must sum to 100. The same rules can be edited as JSON.
- **Apps** creates apps and, for each environment, a credential. Creating or rotating a key shows the SDK key once. The client ID can be copied later.
- **Environments** creates the environments flags target.

The read privilege can open these screens. Creating, editing, deleting and rotating keys requires the save privilege.
