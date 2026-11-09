# Significant Events Plugin

This plugin provides an interface to manage significant events.

The data model (source-id keys, space scope, unchanged route paths) is documented in [`AGENTS.md`](./AGENTS.md#data-model). The UI lives in the [`nightshift`](../nightshift/README.md) plugin.

## CPS telemetry targets

Every Significant Events EBT event includes `space_id`. On CPS deployments it also includes:

- `target_cluster_scope`: `origin` for operations restricted to the Nightshift project or `all` for operations that can read linked projects.
- `target_cluster_ids`: stable, opaque serverless project IDs for the target scope. Project names, aliases, organization names, and customer data are never emitted.
- `target_cluster_ids_complete`: whether the ID set covers the full target scope. This is `false` when linked projects cannot be resolved for the request.

A deployment with no linked projects reports the current Nightshift project as a one-element `target_cluster_ids` array. Existing dashboards can continue to aggregate events without these additive fields. Consumers that attribute CPS activity to projects should expand `target_cluster_ids` and exclude rows where `target_cluster_ids_complete` is `false`.
