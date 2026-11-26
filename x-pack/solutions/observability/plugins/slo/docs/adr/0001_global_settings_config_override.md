# Config overrides of global SLO settings are applied at read time, never persisted

Global SLO settings (first: SLI retention) are stored in a hidden, namespace-agnostic saved object that an SLO global admin edits through the API or the UI. An operator can fix a setting in `kibana.yml` (a config override). The effective setting is resolved on every read: config override, else stored value, else default. The override is never written to the saved object. While an override is set, the API and the UI still save changes to that setting, and the override stays effective. An admin can then set the value to keep before the operator removes the override, so that removing it does not fall back to a stored value or default that deletes data on the next retention run.

Status: the saved object, the `xpack.slo.sliRetention` override and the resolver ship first (#307326) and nothing reads them yet. Setting the override has no effect until the API (#307327), the UI (#307410) and the retention task (#307411) consume it.

## Considered Options

- **Write the `kibana.yml` value into the saved object at startup**: rejected. Each Kibana node reads its own `kibana.yml`, so nodes with different values would overwrite each other on every restart. Removing the override would also leave its value stored as if an admin had chosen it.
- **Saved object only, no `kibana.yml`**: rejected. Operators of self-managed and ECH deployments need to enforce a value that admins cannot change.

## Consequences

- The GET API returns the stored value in its writable fields, so automation that PUTs and then GETs sees no drift. The effective value and its source (`default`, `settings`, `config`) are read-only fields.
- Removing an override restores the stored value, or the default when nothing was ever stored.
- An override must be set identically on every Kibana node. A task applies the value of the node it runs on.
- Every config override needs an ECH user-settings allow-list entry before customers can set it.
- Future global settings, such as the SLI index rounding, follow the same rule. This reverses the rejection of a `kibana.yml` rounding setting made during the rollover design.
