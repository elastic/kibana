# Entity Inventory App

UI plugin for the Observability entity inventory. Renders an entity-centric view of your infrastructure, replacing the existing inventory, hosts, and metrics explorer pages.

## Results table

The Hosts and Kubernetes pages render one results table per entity type (`host` and `k8s.deployment`). All resources keeps a placeholder until grouping lands.

The table reads its data through the `EntityInventoryApiClient` interface in `public/inventory_api/client.ts`. Until the entity inventory routes exist, `renderApp` provides `createFixtureEntityInventoryApiClient()`, which returns static fixture data and ignores the requested time range.

To use the routes, implement `EntityInventoryApiClient` over `core.http` and replace the `inventoryApi` service in `renderApp` (`public/application/index.tsx`). The contract types in `public/inventory_api/types.ts` mirror the route responses; delete them in favour of the types the routes export once those exist.
