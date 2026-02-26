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
 * These are specific to the Defend Workflows (DW) Cypress test suite.
 */
const DYNAMIC_RUNNER_WEIGHTS: Record<string, number> = {
  getArtifactMockedDataTests: 40,
  getArtifactTabsTests: 12,
  createRbacPoliciesExistSuite: 27,
  createRbacHostsExistSuite: 27,
  createRbacEmptyStateSuite: 27,
  createNavigationEssSuite: 4,
};

/**
 * Reduced weights for runners when the spec file filters by a single SIEM version.
 * `getArtifactMockedDataTests` produces ~40 tests total but only ~8 per SIEM version.
 */
const FILTERED_RUNNER_WEIGHTS: Record<string, number> = {
  getArtifactMockedDataTests: 8,
};

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
};
