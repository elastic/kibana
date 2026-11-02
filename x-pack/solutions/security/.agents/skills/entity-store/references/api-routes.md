# Entity Store API Routes

> Constants in `entity_store/common/index.ts` as `ENTITY_STORE_ROUTES`.
> Two route bases exist — **public** and **internal** — with different API versions.

## API Versioning

| Scope | Base path | API version | Header |
|-------|-----------|-------------|--------|
| **Public** | `/api/security/entity_store/` | `2023-10-31` | `elastic-api-version: 2023-10-31` |
| **Internal** | `/internal/security/entity_store/` | `2` | `elastic-api-version: 2` |

All routes require: `kbn-xsrf: true`, `x-elastic-internal-origin: kibana`.

## Public Routes (`/api/security/entity_store/...`)

### Lifecycle

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/security/entity_store/install` | Install entity store |
| PUT | `/api/security/entity_store/start` | Start/reschedule extraction tasks (both processes for user when the dual-process flag is on) |
| PUT | `/api/security/entity_store/stop` | Stop extraction tasks (both processes for user when the dual-process flag is on) |
| POST | `/api/security/entity_store/uninstall` | Uninstall entity store |
| GET | `/api/security/entity_store/status` | Status (`?include_components=true`). With the dual-process flag on, the user engine also has a `nonPriority` block for the non-priority process (shape in `server/routes/apis/status.ts`) |
| PUT | `/api/security/entity_store` | Update `logExtraction` (store-wide, all types), `excludedUserNames` and/or `historySnapshot` (`frequency`, `retentionDays`) config without reinstall. Per-type config goes through internal `PUT /{entityType}` |
| PUT | `/api/security/entity_store/history_snapshot/enable` | Enable history snapshot |
| PUT | `/api/security/entity_store/history_snapshot/disable` | Disable history snapshot |

### CRUD

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/security/entity_store/entities/{entityType}` | Create entity (sync) |
| PUT | `/api/security/entity_store/entities/{entityType}` | Update entity (sync) |
| PUT | `/api/security/entity_store/entities/bulk` | Bulk upsert (async, writes to UPDATES data stream) |
| DELETE | `/api/security/entity_store/entities/` | Delete entity by EUID |
| GET | `/api/security/entity_store/entities` | List entities with filtering/pagination |

#### CRUD Details

- **Create**: `esClient.index()` with `op_type: 'create'`, returns 409 on conflict
- **Update**: `esClient.update()` with `doc_as_upsert: false`, `retry_on_conflict: 3`
- **Bulk**: `esClient.bulk()` with `create` ops to UPDATES data stream (async)
- **Delete**: `esClient.delete()` on LATEST index by hashed EUID
- **`?force=true`** needed to update fields without `allowAPIUpdate: true`

### Resolution

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/security/entity_store/resolution/link` | Link entities to target |
| POST | `/api/security/entity_store/resolution/unlink` | Remove resolution links |
| GET | `/api/security/entity_store/resolution/group` | Get resolution group |

## Internal Routes (`/internal/security/entity_store/...`)

### Entity Maintainers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/internal/security/entity_store/entity_maintainers` | List maintainers |
| PUT | `/internal/security/entity_store/entity_maintainers/start/{id}` | Start maintainer |
| PUT | `/internal/security/entity_store/entity_maintainers/stop/{id}` | Stop maintainer |
| POST | `/internal/security/entity_store/entity_maintainers/run/{id}` | Run maintainer immediately |
| POST | `/internal/security/entity_store/entity_maintainers/init` | Initialize maintainers |

### Lifecycle and config

| Method | Path | Description |
|--------|------|-------------|
| GET | `/internal/security/entity_store/check_privileges` | Check security privileges |
| PUT | `/internal/security/entity_store/{entityType}` | Per-type log extraction config. Body `{ logExtraction?, nonPriorityOverride? }`. `logExtraction` applies to every process of the type, except that non-priority ignores its volume fields (`maxLogsPerPage`, `maxTimeWindowSize`, `maxLogsPerWindow`, `maxLogsPerWindowCapBehavior`, `docsLimit`). `nonPriorityOverride` (incl. `samplingRate`) applies to non-priority only, and is 400 with the dual-process flag off or for a type without a priority gate. `null` clears a field; arrays replace, they do not merge |
| PUT | `/internal/security/entity_store/start` | Start one or both processes. Body `{ entityTypes?, process?: "priority" \| "nonPriority" \| "both" }`, default `both`. 404 with the dual-process flag off |
| PUT | `/internal/security/entity_store/stop` | Stop one or both processes. Same body and flag rule as `start` |

### Utility / Debugging

| Method | Path | Description |
|--------|------|-------------|
| POST | `/internal/security/entity_store/{entityType}/force_log_extraction` | Force manual extraction. Body `{ fromDateISO, toDateISO, process?: "single" \| "priority" \| "nonPriority" \| "all" }`. Without `process` it runs the mode the task would run: `priority` for user with the dual-process flag on, `single` otherwise. `all` runs priority and non-priority at the same time. Anything but `single` is 400 for a type without a priority gate |
| POST | `/internal/security/entity_store/force_history_snapshot` | Force history snapshot |

## curl Examples

```bash
# Link entities (PUBLIC route)
curl -s -X POST "http://localhost:5601/kbn/api/security/entity_store/resolution/link" \
  -u elastic:changeme -H "Content-Type: application/json" -H "kbn-xsrf: true" \
  -H "x-elastic-internal-origin: kibana" -H "elastic-api-version: 2023-10-31" \
  -d '{"target_id": "user:emily@okta", "entity_ids": ["user:echen@azure"]}'

# Unlink entities (PUBLIC)
curl -s -X POST "http://localhost:5601/kbn/api/security/entity_store/resolution/unlink" \
  -u elastic:changeme -H "Content-Type: application/json" -H "kbn-xsrf: true" \
  -H "x-elastic-internal-origin: kibana" -H "elastic-api-version: 2023-10-31" \
  -d '{"entity_ids": ["user:echen@azure"]}'

# Get resolution group (PUBLIC)
curl -s "http://localhost:5601/kbn/api/security/entity_store/resolution/group?entity_id=user:emily@okta" \
  -u elastic:changeme -H "x-elastic-internal-origin: kibana" -H "elastic-api-version: 2023-10-31"

# Get entity store status (PUBLIC)
curl -s "http://localhost:5601/kbn/api/security/entity_store/status?include_components=true" \
  -u elastic:changeme -H "x-elastic-internal-origin: kibana" -H "elastic-api-version: 2023-10-31"

# List entities (PUBLIC)
curl -s "http://localhost:5601/kbn/api/security/entity_store/entities?entity_types=user&page=1&per_page=10&sort_field=@timestamp&sort_order=desc" \
  -u elastic:changeme -H "x-elastic-internal-origin: kibana" -H "elastic-api-version: 2023-10-31"

# List maintainers (INTERNAL)
curl -s "http://localhost:5601/kbn/internal/security/entity_store/entity_maintainers" \
  -u elastic:changeme -H "x-elastic-internal-origin: kibana" -H "elastic-api-version: 2"

# Run a maintainer (INTERNAL)
curl -s -X POST "http://localhost:5601/kbn/internal/security/entity_store/entity_maintainers/run/risk-score" \
  -u elastic:changeme -H "kbn-xsrf: true" -H "x-elastic-internal-origin: kibana" -H "elastic-api-version: 2"

# Force extraction (INTERNAL)
curl -s -X POST "http://localhost:5601/kbn/internal/security/entity_store/user/force_log_extraction" \
  -u elastic:changeme -H "Content-Type: application/json" -H "kbn-xsrf: true" \
  -H "x-elastic-internal-origin: kibana" -H "elastic-api-version: 2" \
  -d '{"fromDateISO": "2026-01-01T00:00:00.000Z", "toDateISO": "2026-01-01T01:00:00.000Z", "process": "all"}'

# Set a per-type override (INTERNAL)
curl -s -X PUT "http://localhost:5601/kbn/internal/security/entity_store/user" \
  -u elastic:changeme -H "Content-Type: application/json" -H "kbn-xsrf: true" \
  -H "x-elastic-internal-origin: kibana" -H "elastic-api-version: 2" \
  -d '{"logExtraction": {"frequency": "2m"}, "nonPriorityOverride": {"samplingRate": 0.5}}'
```
