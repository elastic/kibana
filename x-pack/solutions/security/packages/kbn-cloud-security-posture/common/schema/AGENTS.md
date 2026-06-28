# CSP API schemas

**Audience:** agents editing `@kbn/config-schema` route schemas here (`graph/`, `graph_entities/`, `graph_events/`, `rules/`).

CodeQL [`js/kibana/unbounded-array-in-schema`](.github/codeql/custom-queries/dos/UnboundedArrayInRoute.ql) flags `schema.arrayOf` without `maxSize`. Goal: bound **untrusted request input** (DoS), not server-built responses. Suppression quality: [`.agents/skills/codeql/SKILL.md`](.agents/skills/codeql/SKILL.md).

| Schema role | Action |
|-------------|--------|
| Request (`*RequestSchema`, `graphRequestSchema`) | `{ maxSize: N }` + brief comment; add/extend `*.test.ts` for request limits only |
| Response (`*ResponseSchema`, nested item fields in responses) | `// codeql[js/kibana/unbounded-array-in-schema] <server/ES-populated, not user HTTP input>` immediately above each `arrayOf`. **Do not** use `maxSize` (dev output validation only; caps can 500 when ES exceeds N). |

Request limits: import shared constants from [`graph/v1.ts`](graph/v1.ts) (`INDEX_PATTERNS_MAX_SIZE`, `ENTITY_IDS_MAX_SIZE`, etc.) — do not duplicate magic numbers or reintroduce response-only caps.

**References:** [`role_response.ts`](x-pack/platform/plugins/shared/security/server/routes/authorization/roles/model/role_response.ts) (suppression style); live examples in `graph_entities/v1.ts`, `graph_events/v1.ts`, `graph/v1.ts`.

**Do not:** `maxSize` on response schemas to silence CodeQL; generic suppressions (`false positive`, `safe`).
