/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoverageOverviewRuleActivity } from '../../../../../common/api/detection_engine';
import type { CoverageOverviewRuleWithInvalidMitre } from '../../../rule_management/model/coverage_overview/dashboard';

/**
 * Prototype-only mock rule counts so we can exercise every legend color band.
 * Cycles: 0 (none) → 1 (≥1) → 4 (≥3) → 8 (≥7) → 12 (≥10).
 */
export const COVERAGE_PROTOTYPE_RULE_COUNTS = [0, 1, 4, 8, 12] as const;

/** Matches the print sample for the outdated MITRE mappings callout. */
export const COVERAGE_PROTOTYPE_INVALID_RULE_COUNT = 125;

export const COVERAGE_PROTOTYPE_INVALID_RULES: {
  enabledRules: CoverageOverviewRuleWithInvalidMitre[];
  disabledRules: CoverageOverviewRuleWithInvalidMitre[];
} = {
  enabledRules: [
    {
      id: 'proto-invalid-1',
      name: 'Suspicious Process Creation via Windows Management Instrumentation',
      invalidMitreIds: ['T1059.999'],
    },
    {
      id: 'proto-invalid-2',
      name: 'Potential Credential Access via LSASS Memory Dump',
      invalidMitreIds: ['TA9999', 'T1003.999'],
    },
    {
      id: 'proto-invalid-3',
      name: 'Unusual Remote File Creation',
      invalidMitreIds: ['T1105'],
    },
  ],
  disabledRules: [
    {
      id: 'proto-invalid-4',
      name: 'Legacy Network Share Enumeration',
      invalidMitreIds: ['T1135.001'],
    },
  ],
};

export const getPrototypeRuleCount = (techniqueIndex: number): number =>
  COVERAGE_PROTOTYPE_RULE_COUNTS[techniqueIndex % COVERAGE_PROTOTYPE_RULE_COUNTS.length];

export const getPrototypeEnabledDisabledCounts = (techniqueIndex: number) => {
  const total = getPrototypeRuleCount(techniqueIndex);
  const enabledRules = Math.ceil((total * 2) / 3);
  const disabledRules = total - enabledRules;
  return { enabledRules, disabledRules, total };
};

export const getPrototypeRuleCountsByActivity = (
  techniqueIndex: number,
  activity?: CoverageOverviewRuleActivity[]
): number => {
  const { enabledRules, disabledRules, total } = getPrototypeEnabledDisabledCounts(techniqueIndex);

  if (!activity || activity.length === 0) {
    return total;
  }

  let count = 0;
  if (activity.includes(CoverageOverviewRuleActivity.Enabled)) {
    count += enabledRules;
  }
  if (activity.includes(CoverageOverviewRuleActivity.Disabled)) {
    count += disabledRules;
  }
  return count;
};
