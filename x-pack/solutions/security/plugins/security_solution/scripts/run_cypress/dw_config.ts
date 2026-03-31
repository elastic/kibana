/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoadBalancerConfig } from './utils';

/**
 * Approximate test counts for shared runner functions that dynamically generate `it()` calls.
 * Files importing these runners show 0 inline `it(` but actually produce many tests at runtime.
 *
 * Values are calibrated from CI runtimes (build 401746) using ~18.5s per weight unit baseline.
 * These are specific to the Defend Workflows (DW) Cypress test suite.
 */
const DYNAMIC_RUNNER_WEIGHTS: Record<string, number> = {
  getArtifactMockedDataTests: 40,
  getArtifactTabsTests: 10,
  createRbacPoliciesExistSuite: 19,
  createRbacHostsExistSuite: 19,
  createRbacEmptyStateSuite: 19,
  createNavigationEssSuite: 17,
};

/**
 * Reduced weights for runners when the spec file filters by a single SIEM version.
 * `getArtifactMockedDataTests` produces ~40 tests total but only ~5 per SIEM version
 * on serverless (no `read` role tests) and ~8 on ESS. Using 5 since most split specs
 * now skip serverless for non-latest versions, and the remaining v5 spec runs 5 tests.
 */
const FILTERED_RUNNER_WEIGHTS: Record<string, number> = {
  getArtifactMockedDataTests: 5,
};

/**
 * Per-spec weight overrides for specs where `it()` count doesn't reflect actual runtime.
 * Patterns are matched against the full file path; the first match wins.
 *
 * Recalibrated from CI build 419601 runtimes. Weight ≈ actual_minutes × 3.24
 * (based on 18.5 s per weight-unit baseline), minus per-spec overhead.
 */
const SPEC_WEIGHT_OVERRIDES: LoadBalancerConfig['specWeightOverrides'] = [
  // Tamper protection: real Fleet agent ops (~4.7 min avg despite only 3 tests)
  { pattern: 'tamper_protection/', weight: 15 },

  // Response actions: real Endpoint operations (~5-10 min each)
  { pattern: 'endpoint_operations_document_signing.cy.ts', weight: 14 },
  { pattern: 'endpoint_operations_responder.cy.ts', weight: 10 },
  { pattern: 'alerts_response_console.cy.ts', weight: 18 },
  { pattern: 'response_console/execute_and_file_operations.cy.ts', weight: 25 },
  { pattern: 'response_console/process_operations.cy.ts', weight: 12 },
  { pattern: 'response_console/scan.cy.ts', weight: 8 },
  { pattern: 'response_console/isolate.cy.ts', weight: 12 },
  { pattern: 'response_console/release.cy.ts', weight: 8 },
  { pattern: 'response_actions/isolate.cy.ts', weight: 12 },
  { pattern: 'responder.cy.ts', weight: 12 },
  { pattern: 'response_actions/response_actions_history.cy.ts', weight: 8 },
  { pattern: 'isolate_mocked_data.cy.ts', weight: 10 },

  // Standalone artifact CRUD specs (~2-3 min each, consolidated it() blocks)
  { pattern: 'artifacts/blocklist.cy.ts', weight: 9 },
  { pattern: 'artifacts/trusted_apps.cy.ts', weight: 9 },
  { pattern: 'artifacts/event_filters.cy.ts', weight: 8 },
  { pattern: 'artifacts/host_isolation_exceptions.cy.ts', weight: 8 },
  { pattern: 'artifacts/endpoint_exceptions.cy.ts', weight: 8 },
  { pattern: 'artifacts/endpoint_exceptions.no_ff.cy.ts', weight: 5 },
  { pattern: 'artifacts/trusted_devices.cy.ts', weight: 10 },
  { pattern: 'artifacts/artifacts.cy.ts', weight: 8 },

  // RBAC split specs: dynamic runner weights underestimate these significantly.
  // The mocked-data empty-state RBAC specs run ~6 min each on ESS despite
  // the filtered getArtifactMockedDataTests weight of 5.
  { pattern: 'endpoints_rbac_mocked_data_empty_state', weight: 15 },
  { pattern: 'endpoints_rbac_mocked_data_hosts_exist', weight: 12 },
  { pattern: 'endpoints_rbac_mocked_data_policies_exist', weight: 12 },
  // RBAC version-filtered artifact specs (~3-6 min each on SL)
  { pattern: 'trusted_devices_rbac_siem', weight: 10 },

  // Automated response actions: real Fleet/Endpoint ops despite few it() blocks
  { pattern: 'automated_response_actions/automated_response_actions.cy.ts', weight: 10 },
  { pattern: 'automated_response_actions/form.cy.ts', weight: 10 },
  { pattern: 'automated_response_actions/results.cy.ts', weight: 6 },

  // Policy specs: consolidated it() blocks but same runtime (~2-3 min each)
  { pattern: 'policy/policy_details_policy_settings.cy.ts', weight: 7 },
  { pattern: 'policy/policy_details_protection_updates.cy.ts', weight: 8 },
  { pattern: 'policy/policy_details_mocked_data.cy.ts', weight: 7 },

  // Endpoint details (~3.6 min on SL, consolidated from 10 to 7 it() blocks)
  { pattern: 'endpoint_details/insights.cy.ts', weight: 10 },

  // Endpoint list tests (endpoints.cy.ts: ~5.9 min ESS, endpoints_mocked_data: ~3 min)
  { pattern: 'endpoint_list/endpoints.cy.ts', weight: 15 },
  { pattern: 'endpoint_list/endpoints_mocked_data.cy.ts', weight: 8 },

  // Navigation ESS: dynamic runner (~3 min per version)
  { pattern: 'navigation_ess_siem_', weight: 8 },

  // Serverless role specs: consolidated from per-page to per-category it() blocks.
  // Each spec still tests all pages (~1.5-2.5 min) despite only 1-3 it() blocks.
  { pattern: 'roles/complete_with_endpoint_roles_endpoint_operations_analyst', weight: 6 },
  { pattern: 'roles/complete_with_endpoint_roles_t3_analyst', weight: 6 },
  { pattern: 'roles/complete_with_endpoint_roles_', weight: 5 },
  { pattern: 'roles/essentials_with_endpoint_roles_', weight: 4 },
];

/**
 * Stack setup cost expressed in weight units. Each distinct ftrConfig requires a
 * full ES + Kibana + Fleet stack setup (~4-5 min). With stack sharing enabled,
 * specs sharing a config reuse the same stack, so the penalty only applies once
 * per unique config on an agent. Value of 32 aggressively penalizes multi-config
 * assignments so the LB avoids stacking heavy specs on agents that already pay
 * a double-boot cost. Bumped from 30 (build 419601) to better account for
 * actual ESS setup overhead (~8.2 min ≈ 27 weight-units at 18.5 s/unit).
 */
const SETUP_COST_WEIGHT = 32;

/**
 * Per-spec overhead in weight units. Each additional spec on an agent adds Cypress
 * boot, browser init, and test framework overhead (~20-30s) that isn't captured
 * by the test-count-based weight.
 */
const PER_SPEC_OVERHEAD = 3;

/**
 * Minimum weight for any spec file. Even a 1-test spec incurs Cypress boot,
 * browser init, and test setup overhead that typically takes 30-60s.
 */
const MIN_SPEC_WEIGHT = 3;

export const DW_LOAD_BALANCER_CONFIG: LoadBalancerConfig = {
  dynamicRunnerWeights: DYNAMIC_RUNNER_WEIGHTS,
  filteredRunnerWeights: FILTERED_RUNNER_WEIGHTS,
  setupCostWeight: SETUP_COST_WEIGHT,
  perSpecOverhead: PER_SPEC_OVERHEAD,
  minSpecWeight: MIN_SPEC_WEIGHT,
  specWeightOverrides: SPEC_WEIGHT_OVERRIDES,
  isolateNonDefaultConfigs: true,
  targetWeightPerAgent: 40,
};
