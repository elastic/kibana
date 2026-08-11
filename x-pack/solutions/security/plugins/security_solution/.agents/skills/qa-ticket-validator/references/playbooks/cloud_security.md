# Cloud Security Playbook

**Playbook id:** `cloud_security`  
**Teams:** `@elastic/core-analysis`, `@elastic/contextual-security-apps`, `@elastic/security-entity-analytics`  
**Scope:** Release QA validation for entity store, entity analytics, asset inventory, and related contextual security areas.

**Entity Store reference:** [`entity-store` SKILL](../../../../../../../.claude/skills/entity-store/SKILL.md) — route bases and API shapes (do not duplicate here).

**Scout config (entity store API):** `x-pack/solutions/security/plugins/entity_store/test/scout/api/playwright.config.ts`

**CI attestation (Phase 2 default):** query `kibana-pull-request` + `kibana-on-merge` on the PR merge commit via [`ci_attestation.sh`](../scripts/ci_attestation.sh). Local Scout commands below are **fallback only**.

```bash
node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/solutions/security/plugins/entity_store/test/scout/api/playwright.config.ts \
  --testFiles x-pack/solutions/security/plugins/entity_store/test/scout/api/tests/<spec>.spec.ts
```

---

## Pattern index (primary)

| Pattern id | Match hints (AC text / area) | Static paths | Automation | Live |
|------------|------------------------------|--------------|------------|------|
| `entity_store_extraction` | log extraction, ES\|QL, verification_exception, broken mapping, cast, force_log_extraction | `plugins/entity_store/server/domain/logs_extraction/` | Scout API specs below | Optional API-only |
| `entity_store_api` | install, uninstall, start, stop, CRUD, status, privileges, resolution | `plugins/entity_store/server/routes/` | Scout API specs below | Optional API-only |
| `entity_store_maintainers` | entity maintainer, maintainers API | `plugins/entity_store/server/tasks/entity_maintainers/` | `entity_maintainers.spec.ts` | Optional |
| `entity_analytics_management` | entity analytics, risk score, asset criticality, management page | `security_solution/public/entity_analytics/` | `entity_analytics/*.spec.ts` | Management page tabs |
| `asset_inventory` | asset inventory, attack surface | `security_solution/public/asset_inventory/` | Cypress `asset_inventory` e2e | Asset inventory UI |

---

## Pattern: `entity_store_extraction`

**Team:** `@elastic/core-analysis` / `Team: Core Analysis`

### Static

- PR touches `entity_store/server/domain/logs_extraction/`, `cast.ts`, or streamlang → ES|QL translation paths
- Related: `security_solution/server/lib/entity_analytics/entity_store/` when shared

### Automation

**ci_hints:**

```yaml
framework: scout
playwright_config: x-pack/solutions/security/plugins/entity_store/test/scout/api/playwright.config.ts
pipelines: [kibana-pull-request, kibana-on-merge]
job_name_fragments: [scout, entity_store, Scout]
```

| Check | Spec |
|-------|------|
| Broken / ambiguous mappings | `logs_extraction_broken_mapping.spec.ts` |
| Standard log extraction | `logs_extraction.spec.ts` |
| Volume cap | `logs_extraction_volume_cap.spec.ts` |
| Paginated extraction | `entity_extraction_paginated.spec.ts` |
| CCS extraction | `ccs_logs_extraction.spec.ts` |

```bash
node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/solutions/security/plugins/entity_store/test/scout/api/playwright.config.ts \
  --testFiles x-pack/solutions/security/plugins/entity_store/test/scout/api/tests/logs_extraction_broken_mapping.spec.ts
```

### Live

Usually `SKIPPED` if automation PASS and AC is API-only. Tag `live_required` when runtime extraction behavior must be observed in UI or against live data.

| Field | Value |
|-------|-------|
| `entry` | Security → Entity analytics (engine / extraction flows per AC) |
| `role` | `platform_engineer` |
| Area for exploratory | `Entity Analytics` |

---

## Pattern: `entity_store_api`

**Team:** `@elastic/core-analysis`

### Static

- PR touches `entity_store/server/routes/` or `entity_store/server/domain/crud_client/`
- Jest under `entity_store/server/**/*.test.ts`

### Automation

**ci_hints (Scout API):**

```yaml
framework: scout
playwright_config: x-pack/solutions/security/plugins/entity_store/test/scout/api/playwright.config.ts
pipelines: [kibana-pull-request, kibana-on-merge]
job_name_fragments: [scout, entity_store, Scout]
```

**ci_hints (Jest unit):**

```yaml
framework: jest
pipelines: [kibana-pull-request, kibana-on-merge]
job_name_fragments: [jest, Jest, ciGroup, entity_store]
```

| Check | Spec |
|-------|------|
| CRUD | `crud_api.spec.ts` |
| Install / update | `install_update.spec.ts` |
| Status | `status.spec.ts` |
| Start / stop | `start_stop.spec.ts`, `start.spec.ts`, `stop.spec.ts` |
| Privileges | `check_privileges.spec.ts`, `install_privileges.spec.ts` |
| Resolution | `resolution_api.spec.ts` |
| Not installed | `crud_not_installed.spec.ts` |

### Live

API-only AC → usually `SKIPPED` after automation PASS. Use `kibana_curl` smoke per entity-store SKILL route table when playbook lists API check without Scout spec.

---

## Pattern: `entity_store_maintainers`

**Team:** `@elastic/core-analysis`

### Static

- PR touches `entity_store/server/tasks/entity_maintainers/` or maintainer route handlers

### Automation

**ci_hints:**

```yaml
framework: scout
playwright_config: x-pack/solutions/security/plugins/entity_store/test/scout/api/playwright.config.ts
pipelines: [kibana-pull-request, kibana-on-merge]
job_name_fragments: [scout, entity_store, Scout]
```

| Check | Spec |
|-------|------|
| Maintainers API | `entity_maintainers.spec.ts` |

### Live

Optional — tag `live_required` only when AC covers maintainer lifecycle in UI.

---

## Pattern: `entity_analytics_management`

**Team:** `@elastic/security-entity-analytics`

### Static

- PR touches `security_solution/public/entity_analytics/` or `test/scout/ui/parallel_tests/entity_analytics/`

### Automation

**ci_hints:**

```yaml
framework: scout
playwright_config: x-pack/solutions/security/plugins/security_solution/test/scout/ui/parallel.playwright.config.ts
pipelines: [kibana-pull-request, kibana-on-merge]
job_name_fragments: [scout, security_solution, Scout, entity_analytics]
```

| Spec | Path |
|------|------|
| Management page | `x-pack/solutions/security/plugins/security_solution/test/scout/ui/parallel_tests/entity_analytics/management_page.spec.ts` |
| Engine status | `.../engine_status_management.spec.ts` |
| Risk score | `.../risk_score_management.spec.ts` |
| Asset criticality | `.../asset_criticality_management.spec.ts` |
| Privileges | `.../privileges_management.spec.ts` |

Config: `x-pack/solutions/security/plugins/security_solution/test/scout/ui/parallel.playwright.config.ts`

```bash
node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/solutions/security/plugins/security_solution/test/scout/ui/parallel.playwright.config.ts \
  --testFiles x-pack/solutions/security/plugins/security_solution/test/scout/ui/parallel_tests/entity_analytics/management_page.spec.ts
```

### Live

| Field | Value |
|-------|-------|
| `entry` | Security → Admin and settings → Entity analytics |
| `role` | `platform_engineer` |
| Area for exploratory | `Entity Analytics` |

---

## Pattern: `asset_inventory`

**Team:** `@elastic/contextual-security-apps`

### Static

- PR touches `security_solution/public/asset_inventory/`

### Automation

**ci_hints:**

```yaml
framework: cypress
pipelines: [kibana-pull-request, kibana-on-merge]
job_name_fragments: [cypress, Cypress, asset_inventory, security_solution]
```

- Cypress: `security_solution_cypress/cypress/e2e/asset_inventory/`

### Live

| Field | Value |
|-------|-------|
| `entry` | Security → Asset inventory |
| Area | `Asset Inventory` |

---

## CPS local (detection engine scoping)

When AC mentions cross-cluster / origin-linked field dropdown:

```bash
node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/solutions/security/plugins/security_solution/test/scout_cps_local/ui/playwright.config.ts \
  --testFiles x-pack/solutions/security/plugins/security_solution/test/scout_cps_local/ui/tests/detection_engine/cps/field_dropdown_scoping.spec.ts
```

Pattern id: treat as custom — map AC mentioning "origin-only space" / "all-projects space".

---

## Legacy patterns (low priority — CSP)

Not default for QA validation. Use only when AC explicitly references CSP / cloud posture UI. May be removed in a future playbook revision.

| Pattern id | Match hints | Notes |
|------------|-------------|-------|
| `csp_ui_flow` | cloud connector, CSPM, CIS integration | Cloud connector Scout specs — deprioritized |
| `contextual_flyout` | misconfiguration / vulnerability contextual flyout | Cypress under `cloud_security_posture/` |
| `api_behavior` | `internal/cloud_security_posture` routes | FTR/API integration or `kibana_curl` |

### Pattern: `csp_ui_flow` (legacy)

#### Static

- Merged PR touches `cloud_security_posture/public/` or `kbn-cloud-security-posture/`

#### Automation

| Check | Command |
|-------|---------|
| Create cloud connector | `node scripts/scout run-tests --arch stateful --domain classic --config x-pack/solutions/security/plugins/cloud_security_posture/test/scout_cspm_agentless/ui/parallel.playwright.config.ts --testFiles x-pack/solutions/security/plugins/cloud_security_posture/test/scout_cspm_agentless/ui/parallel_tests/cloud_connectors/create_cloud_connector.spec.ts` |

#### Live

| Field | Value |
|-------|-------|
| `entry` | Security → Manage → Cloud Security Posture |
| Area | `Cloud Security Posture` |

### Pattern: `contextual_flyout` (legacy)

- Cypress: `misconfiguration_contextual_flyout.cy.ts`, `vulnerabilities_contextual_flyout.cy.ts` under `security_solution_cypress/cypress/e2e/cloud_security_posture/`
- Prefer live if Cypress tagged `@skipInServerless`

### Pattern: `api_behavior` (legacy)

- Handler under `cloud_security_posture/server/routes/`
- FTR: `x-pack/solutions/security/test/api_integration/apis/cloud_security_posture/`

---

## MKI / serverless / agentless cloud

AC requiring MKI, real cloud accounts, or Fleet agent install → tag `manual_blocked` in Phase 0. Document in report:

```
BLOCKED: requires MKI/cloud provisioning — out of scope for automated validation.
Manual QA: <link to pipeline or runbook>
```

---

## Playbook version

`cloud_security` v3 — CI attestation hints added; local Scout demoted to fallback. Update when team inventory or Scout paths change. Record playbook id + version in validation report footer.
