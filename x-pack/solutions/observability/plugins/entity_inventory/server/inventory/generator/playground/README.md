# List ES|QL playground (standalone HTML)

**Not** a Kibana app route. Open `index.html` in a browser (double-click or “Open with Live Server”). Edit the definition JSON → **Generate plans**.

Mirrors generator rules (metric-filter × TS|FROM, STATS per agg×engine, presence, scale/offset). It does **not** import production `planSources` / `generateListQueries` (Kibana’s module graph is too heavy for a one-file browser playground). Keep the two in sync by eye when changing the generator.

Path:

`x-pack/solutions/observability/plugins/entity_inventory/server/inventory/generator/playground/index.html`
