# Entity Inventory App

UI plugin for the Observability entity inventory. Renders an entity-centric view of your infrastructure, replacing the existing inventory, hosts, and metrics explorer pages.

The app requires the `entityInventory` server plugin: set both `xpack.entityInventory.enabled: true` and `xpack.entityInventoryApp.enabled: true`. With only `xpack.entityInventoryApp.enabled`, core disables the app at startup and logs that its `entityInventory` dependency is disabled.

## Results table

The app loads `GET /internal/entity_inventory/types` once per app mount (`EntityTypesProvider`, again on a reload or a retry, not on a page change). Each page renders one collapsible section per entity type of the page, in response order, titled by the type's `name`. Each section requests its own `_list` by type id and has its own loading, error and empty states; the header counts the listed entities, with a `+` when the list is truncated. The Hosts and Kubernetes pages list `host` and `k8s.deployment` today. All resources lists every type of the `types` response.

The states, from the top of the results area down:

- While `types` loads, the page shows a spinner and no sections. When `types` fails, the page shows one error with a retry and no sections, on every page. A type a page asks for that `types` does not return shows "not available" and is never listed.
- While a section loads its first `_list`, it shows a table skeleton. A later load keeps the rows up under a progress bar; a failed load replaces them with an error and a retry.
- When any section shows a truncated list with rows, one warning callout above the sections names the row limit (`MAX_LIST_LIMIT`, 9,999) and each truncated type.
- When some sources failed, a warning icon in the section header lists them in its tooltip; the table stays up. With no rows, the empty state says the result may be incomplete. The response's `unavailableColumns` are not shown.

The table renders the columns the `_list` response returns, in response order, all visible by default. A header is the column name, except the `id` and `last_seen` kinds ("Entity ID", "Last seen"); a cell is rendered by its column's `kind`. The app holds no per-type display config. The one exception is the page-to-type map in `public/routes/config.tsx`, which stays until definitions carry a category (elastic/observability-dev#6239); a test fails if another production file names a type. The filters' stand-in types in `public/mock_inventory_api/` also name types until they read the routes (elastic/observability-dev#6355).

The table reads `GET /internal/entity_inventory/types` and `POST /internal/entity_inventory/entities/{type}/_list` of the `entity_inventory` server plugin through the HTTP client in `public/inventory_api/http_client.ts`, typed from that plugin's route repository. The response types and `MAX_LIST_LIMIT` come from that plugin's `common/` (`@kbn/entity-inventory-plugin/common`); only the route repository type comes from its `server/`. `createFixtureEntityInventoryApiClient()` in `public/__fixtures__/` serves static fixtures and exists for tests only; a test fails if a production file imports a fixture or `public/mocks.tsx`.
