/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoadBalancerConfig } from './utils';

/**
 * Per-spec weight overrides for Security Solution (non-DW) Cypress specs where
 * `it()` count doesn't reflect actual runtime. Patterns are matched against
 * the full file path; the first match wins.
 *
 * Heavy specs that involve prebuilt rule installation, complex indicator match
 * creation, or large navigation suites need runtime-calibrated weights.
 */
const SPEC_WEIGHT_OVERRIDES: LoadBalancerConfig['specWeightOverrides'] = [
  // Navigation suite: 47 it() calls but mostly lightweight assertions (~8 min)
  { pattern: 'navigation/navigation.cy.ts', weight: 25 },

  // Prebuilt rules upgrade with preview: 29 tests, each with mock package install (~12 min)
  { pattern: 'upgrade_with_preview.cy.ts', weight: 35 },
  { pattern: 'upgrade_without_preview.cy.ts', weight: 20 },
  { pattern: 'upgrade_notifications.cy.ts', weight: 20 },

  // Indicator match: 29 it() but many are skipped via nested describe.skip (~5 min active)
  { pattern: 'indicator_match_rule.cy.ts', weight: 15 },

  // Large alert tables and bulk actions
  { pattern: 'bulk_edit_rules.cy.ts', weight: 18 },
  { pattern: 'rule_customization.cy.ts', weight: 18 },
  { pattern: 'unsaved_timeline.cy.ts', weight: 12 },

  // Overview tab has many assertions but shares a single alert setup (~6 min)
  { pattern: 'alert_details_right_panel_overview_tab.cy.ts', weight: 10 },

  // Detection response dashboard: 13 tests with complex data setup (~8 min)
  { pattern: 'detection_response.cy.ts', weight: 14 },

  // Privileges specs: role switching takes extra time
  { pattern: 'detection_alerts/privileges.cy.ts', weight: 10 },
  { pattern: 'rule_details/privileges.cy.ts', weight: 10 },

  // Value lists: 13 tests with file upload operations (~7 min)
  { pattern: 'value_lists/value_lists.cy.ts', weight: 12 },

  // URL state: 14 tests, many page navigations (~7 min)
  { pattern: 'urls/state.cy.ts', weight: 12 },

  // Install error handling / table: many mock operations
  { pattern: 'install_error_handling.cy.ts', weight: 10 },
  { pattern: 'install_with_preview.cy.ts', weight: 10 },
  { pattern: 'install_table.cy.ts', weight: 10 },
];

const SETUP_COST_WEIGHT = 20;
const PER_SPEC_OVERHEAD = 3;
const MIN_SPEC_WEIGHT = 3;

export const SECURITY_SOLUTION_LOAD_BALANCER_CONFIG: LoadBalancerConfig = {
  dynamicRunnerWeights: {},
  filteredRunnerWeights: {},
  setupCostWeight: SETUP_COST_WEIGHT,
  perSpecOverhead: PER_SPEC_OVERHEAD,
  minSpecWeight: MIN_SPEC_WEIGHT,
  specWeightOverrides: SPEC_WEIGHT_OVERRIDES,
};
