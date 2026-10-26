# Graph Enrichment: NULLIFY Workarounds

This document explains why `SET unmapped_fields="NULLIFY"` is used in the graph ES|QL query
instead of `"LOAD"`, what problems NULLIFY caused, the research done to address them, and why
reverting to `"LOAD"` is blocked by a second ES|QL limitation.

---

## Background: LOAD vs NULLIFY

The graph ES|QL query begins with:

```sql
SET unmapped_fields="NULLIFY";
FROM <index-patterns> METADATA _id, _index
...
```

`unmapped_fields` controls how ES|QL handles fields that exist in a document's `_source` but are
not declared in the index mapping.

| Setting | Behaviour |
|---|---|
| `"LOAD"` | Field is surfaced from `_source` as-is, with a dynamic value type |
| `"NULLIFY"` | Field gets a `null` value and is assigned the schema type `null` at plan time |

### Why LOAD was the original choice

The graph query is intentionally **multi-integration**: it is evaluated against any index,
regardless of which integration produced the data. Many fields referenced in enrichment CASE
branches will not be present in every index — they will be absent from the mapping entirely.

With `"LOAD"`, those absent fields came back as null values at runtime with no plan-time type
assigned. ES|QL type functions (`TO_STRING`, `TO_BOOLEAN`, etc.) worked fine because the plan-time
type check was skipped.

### Why LOAD was switched to NULLIFY

Elasticsearch had a bug that caused `SET unmapped_fields="LOAD"` to crash with
`java.lang.UnsupportedOperationException` in `IndexResolver.mergedMappings` when a keyword field
with multi-fields (e.g. `user.id.analyzed`) was partially unmapped across the queried indices.

- **Issue**: [elastic/elasticsearch#150667](https://github.com/elastic/elasticsearch/issues/150667)
- **Fix PR**: [elastic/elasticsearch#150676](https://github.com/elastic/elasticsearch/pull/150676)
  — merged, targeted at **v9.4.4** and **v9.5.0**

The root cause was `Collections.emptyMap()` (immutable) being used as the properties map for
`PotentiallyUnmappedKeywordEsField`. When the resolver later tried to insert a child multi-field
into that map, it hit `AbstractMap.put` → `UnsupportedOperationException`. The fix replaced it
with `new HashMap<>()`.

The switch to NULLIFY was made in commit `eba071276e21` with the note:

```
// TODO: TEMPORARY USING NULLIFY INSTEAD OF LOAD
// https://github.com/elastic/elasticsearch/issues/150667
```

The TODO comment was later removed (`ac225f7d525b`) once NULLIFY was confirmed as the stable
working mode, and the workarounds described below were put in place.

**Kibana 9.5.0 includes the ES fix** ([elastic/elasticsearch#150676](https://github.com/elastic/elasticsearch/pull/150676),
confirmed in snapshot SHA `ba0b1375`). However, `"LOAD"` cannot be used yet because of a
second ES|QL limitation: accessing subfields of `flattened`-type parents is not supported under
`unmapped_fields="LOAD"`. See **Why LOAD is Still Blocked** below.

---

## Why LOAD is Still Blocked

When `unmapped_fields="LOAD"` was tested against real integration indices (2026-07-09), ES|QL
rejected the query with:

```
verification_exception: Found 9 problems
Loading subfield [m365_defender.event.additional_fields.SourceAccountSid] when parent
  [m365_defender.event.additional_fields] is of flattened field type is not supported
  with unmapped_fields="load"
Loading subfield [snyk.audit_logs.content.targetId] when parent [snyk.audit_logs.content]
  is of flattened field type is not supported with unmapped_fields="load"
... (7 more: snyk.audit_logs.content.*, greenhouse.audit.event.meta.name,
     cisco_meraki.*.vap fields)
```

The affected integrations and fields:

| Integration | Field | Used as |
|---|---|---|
| `m365_defender` | `m365_defender.event.additional_fields.SourceAccountSid` | CASE result (user.target.id) |
| `m365_defender` | `m365_defender.event.additional_fields.DestinationComputerObjectGuid` | CASE result (entity.target.id) |
| `snyk` | `snyk.audit_logs.content.email` | CASE result (user.target.id) |
| `snyk` | `snyk.audit_logs.content.targetId` | CASE result (entity.target.id) |
| `snyk` | `snyk.audit_logs.content.serviceAccountPublicId` | CASE result (entity.target.id) |
| `greenhouse` | `greenhouse.audit.event.meta.name` | `TO_STRING(...)` function argument |
| `cisco_meraki` | `cisco_meraki.8021x_eap_success.vap` | CASE result (entity.target.id) |
| `cisco_meraki` | `cisco_meraki.wpa_auth.vap` | CASE result (entity.target.id) |
| `cisco_meraki` | `cisco_meraki.splash_auth.vap` | CASE result (entity.target.id) |

All parent fields (`m365_defender.event.additional_fields`, `snyk.audit_logs.content`,
`greenhouse.audit.event.meta`, `cisco_meraki.8021x_eap_success`, etc.) are mapped as the
`flattened` type in the real integration indices. ES|QL's `LOAD` mechanism cannot load
individual subfields from a flattened parent — it is a fundamental limitation, not a bug.

Under `NULLIFY`, the same subfields are accessible as keyword (the `flattened` type exposes
all leaf values as keyword in ES|QL schema), so the query works correctly.

**Blocker to LOAD revert:** a second ES issue needs to be opened/tracked for this limitation
before the revert guide at the bottom of this document can be executed.

---

## Problems Introduced by NULLIFY

Under `"NULLIFY"`, any field that is absent from the index mapping is given the schema type `null`.
ES|QL performs **plan-time type checking** over all CASE branches — even branches guarded by a
dataset condition that will never match at runtime. This caused three distinct error classes.

### Error 1 — `LIKE does not support type [long]`

**Root cause**: `aws_bedrock.ts` used `user.id LIKE "arn:aws:sts:*:assumed-role/*"` directly.
When the query ran against an index where `user.id` is mapped as `long` (which is the actual
mapping in `aws_bedrock.invocation`), ES|QL rejected the LIKE at plan time because LIKE requires
a keyword operand.

**Fix**: Changed to `TO_STRING(user.id) LIKE "arn:..."` directly in `aws_bedrock.ts`. The
TO_STRING call makes the operand always keyword regardless of the underlying mapping type.

### Error 2 — `argument of [CASE] must be [long]`

**Root cause**: Sixteen integration files write to `user.id` via a merged CASE expression.
After all per-integration snippets are merged, the CASE starts with a **preserve branch**:

```sql
user.id = CASE(
  user.id IS NOT NULL, user.id,     -- returns long if user.id is mapped long
  ...integration branches...        -- all return keyword strings
  null
)
```

ES|QL infers the CASE return type from ALL branches at plan time. If the preserve branch returns
`long` and other branches return `keyword`, the plan-time type check fails.

**Fix**: Added `| EVAL user.id = TO_STRING(user.id)` before `buildEnrichmentQuery()` in
`fetch_events_graph.ts`. After this cast, the preserve branch always returns `keyword`,
consistent with all other branches.

```
| EVAL data_stream.dataset = COALESCE(event.dataset, data_stream.dataset)
| EVAL user.id = TO_STRING(user.id)
${buildEnrichmentQuery({ skipColumns: [...] })}
```

### Error 3 — `illegal data type [null]` (EUID computation and integration fields)

**Root cause**: Two sources generate `TO_STRING(field) IS NOT NULL` patterns:

1. **EUID computation** (`getEuidEsqlEvaluation` / `getFieldEvaluationsEsql` in `@kbn/entity-store`):
   generates this pattern for all entity identity fields:
   `user.id`, `user.name`, `user.email`, `user.domain`, `host.name`, `host.id`, `host.hostname`,
   `service.name`, `event.dataset`, `event.kind`, `event.module`, `cloud.provider`, and all
   `.target` variants.

2. **Integration CASE branches**: TO_STRING / TO_BOOLEAN calls on integration-specific fields
   (e.g. `TO_STRING(gitlab.audit.target_id)`, `TO_BOOLEAN(citrix.cef_format)`) fail when those
   fields are absent from the test index mapping.

   `IsNotNull.toEvaluator` in ES|QL's execution engine internally calls
   `AbstractConvertFunction.toEvaluator`. So `TO_STRING(null_typed_field) IS NOT NULL` throws at
   execution-planning time, not just at actual conversion.

**Fix**: The functional test index mapping was extended to include all EUID identity fields
(keyword) and all integration function-argument fields. In production, these fields are present
in the real integration indices, so this is a test-only fix.

---

## Research: Cross-referencing Integration Queries Against elastic/integrations

To verify there were no other unprotected type-sensitive operations, all 46 integration files
were audited and cross-referenced against the `elastic/integrations` GitHub repo field definitions.

### Method

1. Each integration file was read and all type-sensitive ES|QL operations extracted:
   `LIKE`, `STARTS_WITH`, `ENDS_WITH`, `TO_LOWER`, `MV_FIRST`, `TO_STRING`, `TO_BOOLEAN`,
   `TO_INTEGER`, `IS NOT NULL`, and direct `== "string"` comparisons.

2. For each non-ECS field, the corresponding `packages/{package}/data_stream/{ds}/fields/fields.yml`
   was fetched from `raw.githubusercontent.com/elastic/integrations/main/` to confirm the
   actual field type.

### Findings

**Confirmed bugs: 0** — all 259 verifiable type-sensitive operations used fields whose real
mapping type is compatible with the operation.

**Additional bug found during manual verification**: `sysdig.ts` referenced `resource.id` as a
CASE return value for the `sysdig.vulnerability` data stream. The field does not exist in that
data stream; the correct field is `sysdig.vulnerability.resource_id` (keyword). Because the wrong
field was absent from every sysdig vulnerability index, `entity.target.id` was always null for
vulnerability events. This was a silent data bug, not a crash.

**Fix**: Changed `resource.id` → `sysdig.vulnerability.resource_id` in `sysdig.ts`.

### Notable cases reviewed

| Integration | Field | Finding |
|---|---|---|
| `aws_securityhub` | `resource.type`, `resource.id`, `metadata.product.*` | All **keyword** — safe |
| `cisco_meraki` | `cisco_meraki.event.alertData.local` → `host.target.ip` | `alertData` is `flattened`; ES|QL treats sub-fields as keyword so no crash, but value is not guaranteed to be a valid IP string (Meraki's alertData schema varies by alert type) — data quality risk only |
| `corelight` | `dest_host`, `intel.seen.indicator` | Corelight package has no `data_stream` dir (dashboard-only wrapper of native Zeek data); both are Zeek string fields — safe |
| `sysdig` | `resource.id` | **Wrong field name** — fixed to `sysdig.vulnerability.resource_id` |

---

## Research: user.id Mapping Across All 47 Integrations

The global `| EVAL user.id = TO_STRING(user.id)` cast would crash at plan time if `user.id`
were absent from **all** queried index mappings (null-typed). An audit of the 47 integration
packages queried by the graph was performed to determine whether this scenario can occur in
practice.

### Method

Each integration's `kibana.jsonc` was checked for `type: "content"` (no data streams) and
`format_version`. For packages with real data streams, presence of `user.id` in field
definitions was checked. Additionally, all integrations with `format_version >= 2.0.0` are
known to automatically include `ecs@mappings` as a component template on all their index
templates, which maps `user.id` as keyword regardless of whether the integration's own
`fields.yml` references it.

### Results

| Category | Count | Details |
|---|---|---|
| **HAS_USER_ID** — user.id confirmed as keyword (via `ecs@mappings`) | 33 | aws_bedrock, aws_bedrock_agentcore, aws_securityhub, azure_ai_foundry, azure_app_service, cisco_meraki, cisco_secure_email_gateway, cisco_umbrella, cyera, entityanalytics_ad, entityanalytics_okta, extrahop, forgerock, fortinet_fortigate, gitlab, infoblox_bloxone_ddi, jamf_pro, linux, m365_defender, microsoft_dhcp, microsoft_intune, ping_one, prisma_cloud, qualys_vmdr, servicenow, slack, suricata, sysdig, tanium, ti_misp, wiz, zscaler_zia, darktrace |
| **NO_USER_ID** — user.id absent | 3 | aws_cloudtrail_otel, aws_vpcflow_otel, corelight |
| **UNCERTAIN** — ECS template applies (format_version ≥ 3.0) but audit couldn't confirm statically | 10 | azure_openai, checkpoint_email, citrix_waf, greenhouse, osquery, ping_federate, salesforce, snort, snyk, gcp_vertexai |

### Why NO_USER_ID is not a crash risk

All three NO_USER_ID packages (`aws_cloudtrail_otel`, `aws_vpcflow_otel`, `corelight`) are
**content-only packages** (`type: "content"` in `kibana.jsonc`). They have no data streams, no
index templates, and no associated Elasticsearch indices. They are Kibana dashboard bundles that
display data from separate ingest paths. There is no `logs-aws_cloudtrail_otel.*` index for
the graph query to target — the index patterns simply don't match anything. Querying these
patterns returns empty results rather than a schema error.

### Why UNCERTAIN is not a crash risk

All 10 UNCERTAIN integrations have `format_version >= 3.0` and real data streams, which means
the `ecs@mappings` component template is applied automatically to every index template they
create. `ecs@mappings` maps `user.id` as keyword. The audit flagged them as uncertain only
because the static field definitions in their `fields.yml` files do not list `user.id`
explicitly — the mapping comes from the shared ECS template, not from the package's own
field list.

### Conclusion

The global `| EVAL user.id = TO_STRING(user.id)` cast is safe for all integrations the graph
queries in practice:

- 33 integrations have `user.id` mapped as keyword via `ecs@mappings` — no crash, no wrong type.
- 3 content-only packages have no data and no indices — crash scenario is unreachable.
- 10 UNCERTAIN integrations all use `ecs@mappings` via `format_version >= 3.0` — user.id is
  keyword at runtime even without explicit field definitions.

The only theoretical crash scenario is a completely custom non-ECS index with no `user.id`
mapping at all, queried in complete isolation. This is outside the scope of the integration
support this feature is designed for.

---

## Summary of Changes

| File | Change |
|---|---|
| `integrations/aws_bedrock.ts` | `user.id LIKE "arn:..."` → `TO_STRING(user.id) LIKE "arn:..."` |
| `integrations/sysdig.ts` | `resource.id` → `sysdig.vulnerability.resource_id` in `entity.target.id` CASE |
| `fetch_events_graph.ts` | Added `\| EVAL user.id = TO_STRING(user.id)` before `buildEnrichmentQuery()` |
| `enrichment_query.test.ts` | Tests that `TO_STRING(user.id) LIKE` is emitted; tests sysdig field name |
| `fetch_events_graph.test.ts` | Tests that `EVAL user.id = TO_STRING(user.id)` appears before enrichment |
| `test/.../graph.ts` (FTR) | Added `Field type mismatch resilience` test; index mapping covers all EUID identity fields and integration function-argument fields; asserts `user.id` surfaces as string `"42"` |

---

## How to Revert to LOAD Once Both Issues Are Fixed

Two ES issues must be resolved before LOAD can be used:

1. **[elastic/elasticsearch#150667](https://github.com/elastic/elasticsearch/issues/150667)**
   — `UnsupportedOperationException` when a keyword field with multi-fields is partially unmapped.
   **Status: FIXED** in ES PR #150676, included in 9.5.0-SNAPSHOT from 2026-07-07 onwards.

2. **Flattened subfield access under LOAD** — accessing `parent.child` when `parent` is of
   `flattened` type throws `verification_exception: Loading subfield … is not supported with
   unmapped_fields="load"`. **Status: OPEN** — file an ES issue and track it before reverting.

When both are fixed, follow these steps:

### Step 1 — Switch the setting

In `fetch_events_graph.ts`, change:

```diff
- const query = `SET unmapped_fields="NULLIFY";
+ const query = `SET unmapped_fields="LOAD";
```

### Step 2 — Keep (and expand) the global pre-casts

The global `| EVAL user.id = TO_STRING(user.id)` is **not a NULLIFY workaround** and must be
kept under LOAD. It fixes a distinct problem: `user.id` is mapped as `long` in real integration
indices (e.g. aws_bedrock). LOAD only helps with *absent* (unmapped) fields — a field that IS
in the mapping but with the wrong type is still typed as `long` at plan time regardless of the
`unmapped_fields` setting.

Under LOAD, absent fields become dynamically typed (fixing the null-type errors), but
wrong-type fields still cause CASE return-type conflicts and LIKE failures. The correct pattern
is therefore to add more global casts — one for each field known to be mapped with a non-keyword
type in some integration:

```
| EVAL user.id = TO_STRING(user.id)
// add similar casts here for any other field found to have a wrong mapping type
```

Think of these casts as a permanent layer that normalises field types across heterogeneous
integration indices, independent of LOAD vs NULLIFY.

### Step 3 — Simplify the functional test index mapping

Under LOAD, absent fields are dynamically typed — not null-typed. The extended mapping in
`test/cloud_security_posture_api/routes/graph.ts` can be reduced to:

```typescript
mappings: {
  properties: {
    '@timestamp': { type: 'date' },
    'event.id': { type: 'keyword' },
    'event.action': { type: 'keyword' },
    'event.dataset': { type: 'keyword' },
    'data_stream.dataset': { type: 'keyword' },
    'user.name': { type: 'keyword' },
    'user.id': { type: 'long' },  // Deliberately wrong type — the core scenario
    'host.name': { type: 'keyword' },
  },
}
```

Update the test document comment accordingly.

### Checklist

- [ ] Verify ES #150667 is fixed in the target version
- [ ] Verify the flattened-subfield LOAD limitation is fixed in the target version
- [ ] Confirm LOAD does not break m365_defender, snyk, greenhouse, cisco_meraki enrichment
- [ ] Confirm EUID computation still works (no `TO_STRING(null)` errors)
- [ ] Confirm `user.id` typed as `long` still surfaces correctly (keep or revert global EVAL)
- [ ] Simplify functional test mapping (Step 3 above)
- [ ] Verify sysdig vulnerability events still populate `entity.target.id` (unrelated to LOAD)
