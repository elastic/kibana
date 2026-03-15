# Security Solution — Test Directories Reference

This file maps Security Solution feature areas to their test directories, file naming conventions, and test types. Use it when building the test coverage catalog in Step 1 to locate existing tests for any feature area.

---

## Contents

- [Repo-level skill locations](#repo-level-skill-locations)
- [Test type overview](#test-type-overview)
- [Feature area → test directory mapping](#feature-area--test-directory-mapping)
  - [Detection Engine & Rules Management](#detection-engine--rules-management)
  - [Alerts](#alerts)
  - [Timelines & Timeline Templates](#timelines--timeline-templates)
  - [Cases](#cases)
  - [Entity Analytics](#entity-analytics-risk-engine-entity-store-entity-details)
  - [Explore](#explore-hosts-network-users-overview)
  - [Exceptions & Value Lists](#exceptions--value-lists)
  - [AI Assistant / GenAI](#ai-assistant--genai-attack-discovery-conversations-knowledge-base)
  - [AI4DSOC / Security AI Features](#ai4dsoc--security-ai-features)
  - [SIEM Migrations](#siem-migrations)
  - [Flyout / Expandable Flyout](#flyout--expandable-flyout)
  - [Asset Inventory](#asset-inventory)
  - [Cloud Security Posture](#cloud-security-posture-cspm--kspm--cdr)
  - [Endpoint Security / EDR Workflows](#endpoint-security--edr-workflows)
  - [Telemetry](#telemetry)
  - [Investigations](#investigations-cross-feature-dashboards-data-view-threat-intelligence)
  - [Notes](#notes)
  - [Onboarding / Sourcerer / Common](#onboarding--sourcerer--common)
- [File naming conventions](#file-naming-conventions)
- [Notes for test coverage catalog](#notes-for-test-coverage-catalog)

---

## Repo-level skill locations

| Skill | Path |
|---|---|
| Scout UI testing | `.agents/skills/scout-ui-testing/SKILL.md` |
| Scout API testing | `.agents/skills/scout-api-testing/SKILL.md` |
| FTR testing | `.agents/skills/ftr-testing/SKILL.md` |

These skills describe test file conventions, runner commands, authentication patterns, and fixture extension rules. Read the relevant skill when generating or reviewing test scenarios that involve those test types.

---

## Test type overview

| Type | File pattern | Runner |
|---|---|---|
| Unit | `*.test.ts` (co-located with source) | `yarn test:jest` |
| Integration (Jest) | `*.test.ts` under `__tests__/` or adjacent; `jest.integration.config.js` | `yarn test:jest_integration` |
| API integration (FTR) | `x-pack/solutions/security/test/security_solution_api_integration/` | `node scripts/functional_tests` |
| Functional / E2E (FTR) | `x-pack/solutions/security/test/functional/` | `node scripts/functional_tests` |
| Cypress E2E | `x-pack/solutions/security/test/security_solution_cypress/cypress/e2e/**/*.cy.ts` | Cypress runner |
| Scout API | `<plugin>/test/scout*/api/**/*.spec.ts` | `node scripts/scout.js run-tests` |
| Scout UI | `<plugin>/test/scout*/ui/**/*.spec.ts` | `node scripts/scout.js run-tests` |

---

## Feature area → test directory mapping

### Detection Engine & Rules Management

| Test type | Directory |
|---|---|
| Unit | `plugins/security_solution/public/detection_engine/**/*.test.ts` |
| Unit | `plugins/security_solution/public/detections/**/*.test.ts` |
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/detection_response/detection_engine/` |
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/detection_response/rule_management/` |
| API integration | `test/security_solution_api_integration/test_suites/detections_response/detection_engine/` |
| API integration | `test/security_solution_api_integration/test_suites/detections_response/rules_management/` |

### Alerts

| Test type | Directory |
|---|---|
| Unit | `plugins/security_solution/public/detections/**/*.test.ts` |
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/investigations/alerts/` |
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/detection_response/detection_engine/` |

### Timelines & Timeline Templates

| Test type | Directory |
|---|---|
| Unit | `plugins/security_solution/public/timelines/**/*.test.ts` |
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/investigations/timelines/` |
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/investigations/timeline_templates/` |
| API integration | `test/security_solution_api_integration/test_suites/investigation/timeline/` |

### Cases

| Test type | Directory |
|---|---|
| API integration | `test/cases_api_integration/` |
| Cypress E2E | Covered under investigations area |

### Entity Analytics (Risk Engine, Entity Store, Entity Details)

| Test type | Directory |
|---|---|
| Unit | `plugins/security_solution/public/entity_analytics/**/*.test.ts` |
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/entity_analytics/` |
| Cypress E2E (dashboards) | `test/security_solution_cypress/cypress/e2e/entity_analytics/dashboards/` |
| Cypress E2E (hosts/watchlists) | `test/security_solution_cypress/cypress/e2e/entity_analytics/hosts/`, `watchlists/` |
| API integration | `test/security_solution_api_integration/test_suites/entity_analytics/entity_details/` |
| API integration | `test/security_solution_api_integration/test_suites/entity_analytics/entity_store/` |
| API integration | `test/security_solution_api_integration/test_suites/entity_analytics/risk_engine/` |
| Scout API | `plugins/entity_store/test/scout/api/` |

### Explore (Hosts, Network, Users, Overview)

| Test type | Directory |
|---|---|
| Unit | `plugins/security_solution/public/explore/**/*.test.ts` |
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/explore/` |
| API integration | `test/security_solution_api_integration/test_suites/explore/hosts/` |
| API integration | `test/security_solution_api_integration/test_suites/explore/network/` |
| API integration | `test/security_solution_api_integration/test_suites/explore/overview/` |
| API integration | `test/security_solution_api_integration/test_suites/explore/users/` |

### Exceptions & Value Lists

| Test type | Directory |
|---|---|
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/detection_response/rule_management/` |
| API integration | `test/security_solution_api_integration/test_suites/lists_and_exception_lists/exception_lists_items/` |
| API integration | `test/security_solution_api_integration/test_suites/lists_and_exception_lists/lists_items/` |
| API integration | `test/security_solution_api_integration/test_suites/lists_and_exception_lists/authorization/` |

### AI Assistant / GenAI (Attack Discovery, Conversations, Knowledge Base)

| Test type | Directory |
|---|---|
| Unit | `plugins/security_solution/public/assistant/**/*.test.ts` |
| Unit | `plugins/security_solution/public/attack_discovery/**/*.test.ts` |
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/ai_assistant/` |
| API integration | `test/security_solution_api_integration/test_suites/genai/attack_discovery/` |
| API integration | `test/security_solution_api_integration/test_suites/genai/conversations/` |
| API integration | `test/security_solution_api_integration/test_suites/genai/knowledge_base/` |
| API integration | `test/security_solution_api_integration/test_suites/genai/evaluations/` |
| API integration | `test/security_solution_api_integration/test_suites/genai/startup/` |

### AI4DSOC / Security AI Features

| Test type | Directory |
|---|---|
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/ai4dsoc/` |
| API integration | `test/security_solution_api_integration/test_suites/ai4dsoc/` |

### SIEM Migrations

| Test type | Directory |
|---|---|
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/investigations/siem_migrations/` |
| API integration | `test/security_solution_api_integration/test_suites/siem_migrations/rules/` |

### Flyout / Expandable Flyout

| Test type | Directory |
|---|---|
| Unit | `plugins/security_solution/public/flyout/**/*.test.ts` |
| Unit (package) | `packages/expandable-flyout/src/**/*.test.ts` |

### Asset Inventory

| Test type | Directory |
|---|---|
| Unit | `plugins/security_solution/public/asset_inventory/**/*.test.ts` |
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/asset_inventory/` |

### Cloud Security Posture (CSPM / KSPM / CDR)

| Test type | Directory |
|---|---|
| Unit | `plugins/cloud_security_posture/public/**/*.test.ts` |
| Functional (FTR) | `test/cloud_security_posture_functional/` |
| API integration | `test/cloud_security_posture_api/` |
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/cloud_security_posture/` |

### Endpoint Security / EDR Workflows

| Test type | Directory |
|---|---|
| Functional (FTR) | `test/security_solution_endpoint/` |
| Cypress E2E | `test/defend_workflows_cypress/` |
| API integration | `test/security_solution_api_integration/test_suites/edr_workflows/` |

### Telemetry

| Test type | Directory |
|---|---|
| API integration | `test/security_solution_api_integration/test_suites/telemetry/` |
| API integration | `test/security_solution_api_integration/test_suites/detections_response/telemetry/` |

### Investigations (Cross-feature: dashboards, data view, threat intelligence)

| Test type | Directory |
|---|---|
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/investigations/dashboards/` |
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/investigations/data_view/` |
| Cypress E2E | `test/security_solution_cypress/cypress/e2e/investigations/threat_intelligence/` |

### Notes

| Test type | Directory |
|---|---|
| Unit | `plugins/security_solution/public/notes/**/*.test.ts` |

### Onboarding / Sourcerer / Common

| Test type | Directory |
|---|---|
| Unit | `plugins/security_solution/public/onboarding/**/*.test.ts` |
| Unit | `plugins/security_solution/public/sourcerer/**/*.test.ts` |
| Unit | `plugins/security_solution/public/common/**/*.test.ts` |

---

## File naming conventions

| Scenario | Convention | Example |
|---|---|---|
| Unit test | Co-located with source file | `alerts_table.tsx` → `alerts_table.test.ts` |
| Jest integration test | Adjacent or in `__tests__/` | `my_hook.test.ts` with `jest.integration.config.js` |
| Cypress spec | `*.cy.ts` inside `cypress/e2e/` | `rule_creation.cy.ts` |
| Scout UI spec | `*.spec.ts` inside `test/scout*/ui/` | `alerts_page.spec.ts` |
| Scout API spec | `*.spec.ts` inside `test/scout*/api/` | `rules_api.spec.ts` |
| FTR API integration test | `*.ts` inside `test_suites/` | `create_rules.ts` |

---

## Notes for test coverage catalog

- When reading PR diffs, look for changed files matching any of the paths above to find associated tests.
- Unit tests are always the first coverage signal — check for `*.test.ts` files adjacent to any modified source file before assuming there is no coverage.
- Cypress tests are the legacy E2E layer. Scout is the current standard — new E2E and API tests should use Scout.
- FTR API integration tests under `security_solution_api_integration/` remain the primary API test layer for Security Solution until Scout coverage reaches parity.
- The `entity_store` plugin has its own Scout API scaffold at `plugins/entity_store/test/scout/api/`.