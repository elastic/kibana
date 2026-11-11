# Entity Inventory App

UI plugin for the Observability entity inventory. Renders an entity-centric view of your infrastructure, replacing the existing inventory, hosts, and metrics explorer pages.

## Results table

Each page loads `GET /internal/entity_inventory/types` once (`EntityTypesProvider`, again on a page change, a reload or a retry) and renders one collapsible section per entity type of the page, in response order, titled by the type's `name`. Each section requests its own `_list` by type id and has its own loading, error and empty states; the header counts the listed entities. The Hosts and Kubernetes pages list `host` and `k8s.deployment` today. All resources keeps a placeholder until grouping lands.

The table renders the columns the `_list` response returns, in response order, all visible by default. A header is the column name, except the `id` and `last_seen` kinds ("Entity ID", "Last seen"); a cell is rendered by its column's `kind`. The app holds no per-type display config. The one exception is the page-to-type map in `public/routes/config.tsx`, which stays until definitions carry a category (elastic/observability-dev#6239); a test fails if another production file names a type. The filters' stand-in types in `public/mock_inventory_api/` also name types until they read the routes (elastic/observability-dev#6355).

The table reads `GET /internal/entity_inventory/types` and `POST /internal/entity_inventory/entities/{type}/_list` of the `entity_inventory` server plugin through the HTTP client in `public/inventory_api/http_client.ts`, typed from that plugin's route repository. The contract types in `public/inventory_api/types.ts` are taken from the server's types. `createFixtureEntityInventoryApiClient()` serves static fixtures and exists for tests only.
