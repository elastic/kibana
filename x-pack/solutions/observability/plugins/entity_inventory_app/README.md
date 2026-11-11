# Entity Inventory App

UI plugin for the Observability entity inventory. Renders an entity-centric view of your infrastructure, replacing the existing inventory, hosts, and metrics explorer pages.

## Results table

The Hosts and Kubernetes pages render one results table per entity type (`host` and `k8s.deployment`). All resources keeps a placeholder until grouping lands.

The table reads `GET /internal/entity_inventory/types` and `POST /internal/entity_inventory/entities/{type}/_list` of the `entity_inventory` server plugin through the HTTP client in `public/inventory_api/http_client.ts`, typed from that plugin's route repository. The contract types in `public/inventory_api/types.ts` are taken from the server's types. `createFixtureEntityInventoryApiClient()` serves static fixtures and exists for tests only.
