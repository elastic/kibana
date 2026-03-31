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
 * Calibrated from CI runtimes (build 401746), adjusted for consolidated it() blocks
 * from PR #260152 — same runtime, fewer it() blocks, so overrides prevent
 * the load balancer from underweighting these specs.
 */
const SPEC_WEIGHT_OVERRIDES: LoadBalancerConfig['specWeightOverrides'] = [
  // Tamper protection: real Fleet agent ops (~4.7 min avg despite only 3 tests)
  { pattern: 'tamper_protection/', weight: 15 },

  // Response actions: real Endpoint operations (~5-7 min)
  { pattern: 'endpoint_operations.cy.ts', weight: 22 },
  { pattern: 'alerts_response_console.cy.ts', weight: 18 },
  { pattern: 'isolate.cy.ts', weight: 12 },
  { pattern: 'responder.cy.ts', weight: 12 },

  // Standalone artifact CRUD specs (~2-3 min each, consolidated it() blocks)
  { pattern: 'artifacts/blocklist.cy.ts', weight: 9 },
  { pattern: 'artifacts/trusted_apps.cy.ts', weight: 9 },
  { pattern: 'artifacts/event_filters.cy.ts', weight: 8 },
  { pattern: 'artifacts/host_isolation_exceptions.cy.ts', weight: 8 },
  { pattern: 'artifacts/endpoint_exceptions.cy.ts', weight: 8 },
  { pattern: 'artifacts/endpoint_exceptions.no_ff.cy.ts', weight: 5 },
  { pattern: 'artifacts/trusted_devices.cy.ts', weight: 7 },
  { pattern: 'artifacts/artifacts.cy.ts', weight: 8 },

  // Endpoint details (~2.5 min, consolidated from 10 to 7 it() blocks)
  { pattern: 'endpoint_details/insights.cy.ts', weight: 8 },

  // Endpoint list real tests (~3 min)
  { pattern: 'endpoint_list/endpoints.cy.ts', weight: 8 },

  // Serverless role specs: consolidated from per-page to per-category it() blocks.
  // Each spec still tests all pages (~1.5-2.5 min) despite only 1-3 it() blocks.
  { pattern: 'roles/complete_with_endpoint_roles_endpoint_operations_analyst', weight: 6 },
  { pattern: 'roles/complete_with_endpoint_roles_t3_analyst', weight: 6 },
  { pattern: 'roles/complete_with_endpoint_roles_', weight: 5 },
  { pattern: 'roles/essentials_with_endpoint_roles_', weight: 4 },
];

/**
 * Stack setup cost expressed in weight units. Each distinct ftrConfig requires a
 * full ES + Kibana + Fleet stack setup (~4 min). With stack sharing enabled,
 * specs sharing a config reuse the same stack, so the penalty only applies once
 * per unique config on an agent. Value of 20 provides optimal balance between
 * config consolidation and even weight distribution across agents.
 */
const SETUP_COST_WEIGHT = 20;

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
};
