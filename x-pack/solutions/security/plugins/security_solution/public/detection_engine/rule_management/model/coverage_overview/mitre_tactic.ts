/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewRule } from './rule';
import type { CoverageOverviewMitreTechnique } from './mitre_technique';

export interface CoverageOverviewMitreTactic {
  id: string;
  name: string;
  /**
   * An url leading to the tactic's page
   */
  reference: string;
  /**
   * A list if techniques associated with this tactic
   */
  techniques: CoverageOverviewMitreTechnique[];
  enabledRules: CoverageOverviewRule[];
  disabledRules: CoverageOverviewRule[];
  availableRules: CoverageOverviewRule[];
}
