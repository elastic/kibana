/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { getMitreFrameworkById } from '@kbn/security-mitre-attack-common';
import type { MitreFramework } from '@kbn/security-mitre-attack-common';
import type {
  CoverageOverviewRuleActivity,
  CoverageOverviewRuleSource,
} from '../../../../../common/api/detection_engine';
import type { CoverageOverviewDashboard } from '../../../rule_management/model/coverage_overview/dashboard';

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

/**
 * Keeps only the invalid MITRE IDs that belong to the given framework and drops rules left with none.
 */
export const filterInvalidlyMappedRulesByFramework = (
  invalidlyMappedRules: CoverageOverviewDashboard['invalidlyMappedRules'] | undefined,
  framework: MitreFramework
): CoverageOverviewDashboard['invalidlyMappedRules'] => {
  const filterRules = (rules: CoverageOverviewDashboard['invalidlyMappedRules']['enabledRules']) =>
    rules
      .map((rule) => ({
        ...rule,
        invalidMitreIds: rule.invalidMitreIds.filter(
          (id) => getMitreFrameworkById(id) === framework
        ),
      }))
      .filter((rule) => rule.invalidMitreIds.length > 0);

  return {
    enabledRules: filterRules(invalidlyMappedRules?.enabledRules ?? []),
    disabledRules: filterRules(invalidlyMappedRules?.disabledRules ?? []),
  };
};
