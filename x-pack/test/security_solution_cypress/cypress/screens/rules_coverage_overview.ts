/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const COVERAGE_OVERVIEW_TECHNIQUE_PANEL =
  '[data-test-subj="coverageOverviewTechniquePanel"]';

export const COVERAGE_OVERVIEW_TECHNIQUE_PANEL_IN_TACTIC_GROUP = (id: string) =>
  `[data-test-subj="coverageOverviewTacticGroup-${id}"] [data-test-subj="coverageOverviewTechniquePanel"]`;

export const COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES =
  '[data-test-subj="coverageOverviewEnabledRulesList"]';

export const COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES =
  '[data-test-subj="coverageOverviewDisabledRulesList"]';

export const COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON =
  '[data-test-subj="enableAllDisabledButton"]';

export const COVERAGE_OVERVIEW_ACTIVITY_FILTER_BUTTON =
  '[data-test-subj="coverageOverviewRuleActivityFilterButton"]';

export const COVERAGE_OVERVIEW_SOURCE_FILTER_BUTTON =
  '[data-test-subj="coverageOverviewRuleSourceFilterButton"]';

export const COVERAGE_OVERVIEW_FILTER_LIST = '[data-test-subj="coverageOverviewFilterList"]';

export const COVERAGE_OVERVIEW_SEARCH_BAR = '[data-test-subj="coverageOverviewFilterSearchBar"]';

export const COVERAGE_OVERVIEW_TACTIC_PANEL = '[data-test-subj="coverageOverviewTacticPanel"]';

export const COVERAGE_OVERVIEW_TACTIC_ENABLED_STATS =
  '[data-test-subj="ruleStatsEnabledRulesCount"]';

export const COVERAGE_OVERVIEW_TACTIC_DISABLED_STATS =
  '[data-test-subj="ruleStatsDisabledRulesCount"]';
