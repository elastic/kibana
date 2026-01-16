/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export const getEnabledRuleCount = (
  technique: CoverageOverviewMitreTechnique,
  activity?: CoverageOverviewRuleActivity[]
): number => technique.enabledRules.length;

export const getNumOfCoveredTechniques = (tactic: CoverageOverviewMitreTactic): number =>
  tactic.techniques.filter((technique) => technique.enabledRules.length !== 0).length;
