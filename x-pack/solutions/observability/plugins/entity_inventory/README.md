# Entity Inventory

Server plugin for the Observability entity inventory. It will serve inventory lists, details and counts for registered entity types straight from raw telemetry, using queries generated from the entity definitions held by the entity store (`entityStore` plugin).

The plugin is disabled by default. To enable it, add the following to `kibana.yml`:

```yaml
xpack.entityInventory.enabled: true
```

At start it logs the names of the entity definitions registered in the entity store. It has no routes, UI or query logic yet.
