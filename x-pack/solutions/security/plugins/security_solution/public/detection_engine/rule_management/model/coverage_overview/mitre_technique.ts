/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoverageOverviewRuleActivity } from '../../../../../common/api/detection_engine';
import type { CoverageOverviewMitreSubTechnique } from './mitre_subtechnique';
import type { CoverageOverviewMitreTactic } from './mitre_tactic';
import type { CoverageOverviewRule } from './rule';

export interface CoverageOverviewMitreTechnique {
  id: string;
  name: string;
  /**
   * An url leading to the technique's page
   */
  reference: string;
  subtechniques: CoverageOverviewMitreSubTechnique[];
  enabledRules: CoverageOverviewRule[];
  disabledRules: CoverageOverviewRule[];
  availableRules: CoverageOverviewRule[];
}

export const getTotalRuleCount = (
  technique: CoverageOverviewMitreTechnique,
  activity?: CoverageOverviewRuleActivity[]
): number => {
  if (!activity) {
    return technique.enabledRules.length + technique.disabledRules.length;
  }
  let totalRuleCount = 0;
  if (activity.includes(CoverageOverviewRuleActivity.Enabled)) {
    totalRuleCount += technique.enabledRules.length;
  }
  if (activity.includes(CoverageOverviewRuleActivity.Disabled)) {
    totalRuleCount += technique.disabledRules.length;
  }
  return totalRuleCount;
};

export const getNumOfCoveredTechniques = (tactic: CoverageOverviewMitreTactic): number =>
  tactic.techniques.filter((technique) => technique.enabledRules.length !== 0).length;
