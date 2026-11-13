/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import type { MitreFramework } from '@kbn/security-mitre-attack-common';
import type {
  CoverageOverviewRuleActivity,
  CoverageOverviewRuleSource,
} from '../../../../../common/api/detection_engine';
import type { CoverageOverviewDashboard } from '../../../rule_management/model/coverage_overview/dashboard';
import type { CoverageOverviewRule } from '../../../rule_management/model/coverage_overview/rule';

export const extractSelected = <
  T extends CoverageOverviewRuleSource | CoverageOverviewRuleActivity
>(
  options: EuiSelectableOption[]
): T[] => {
  return options.filter((option) => option.checked === 'on').map((option) => option.label as T);
};

export const populateSelected = <
  T extends CoverageOverviewRuleSource | CoverageOverviewRuleActivity
>(
  allOptions: Array<EuiSelectableOption<{ label: T }>>,
  selected: string[]
): Array<EuiSelectableOption<{ label: T }>> =>
  allOptions.map((option) =>
    selected.includes(option.label) ? { ...option, checked: 'on' } : option
  );

/** A rule paired with only the invalid MITRE IDs of one framework. */
export interface CoverageOverviewRuleWithFrameworkInvalidMitreIds extends CoverageOverviewRule {
  invalidMitreIds: string[];
}

export interface FrameworkInvalidlyMappedRules {
  enabledRules: CoverageOverviewRuleWithFrameworkInvalidMitreIds[];
  disabledRules: CoverageOverviewRuleWithFrameworkInvalidMitreIds[];
}

/**
 * Keeps only the invalid MITRE IDs reported for the given framework and drops rules left with none.
 */
export const filterInvalidlyMappedRulesByFramework = (
  invalidlyMappedRules: CoverageOverviewDashboard['invalidlyMappedRules'] | undefined,
  framework: MitreFramework
): FrameworkInvalidlyMappedRules => {
  const filterRules = (
    rules: CoverageOverviewDashboard['invalidlyMappedRules']['enabledRules']
  ): CoverageOverviewRuleWithFrameworkInvalidMitreIds[] =>
    rules.flatMap(({ invalidMitreIdsByFramework, ...rule }) => {
      const invalidMitreIds = invalidMitreIdsByFramework[framework] ?? [];
      return invalidMitreIds.length > 0 ? [{ ...rule, invalidMitreIds }] : [];
    });

  return {
    enabledRules: filterRules(invalidlyMappedRules?.enabledRules ?? []),
    disabledRules: filterRules(invalidlyMappedRules?.disabledRules ?? []),
  };
};
