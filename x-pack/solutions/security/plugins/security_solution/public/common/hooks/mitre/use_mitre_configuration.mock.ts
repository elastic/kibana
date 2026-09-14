/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MitreTacticSummary,
  MitreTechniqueSummary,
  MitreSubtechniqueSummary,
  MitreEntitySummaryBuckets,
} from '@kbn/security-mitre-attack-common';
import type { MitreConfiguration } from './use_mitre_configuration';

export const mockTactic: MitreTacticSummary = {
  framework: 'enterprise',
  framework_version: '16.1',
  id: 'TA0001',
  name: 'Initial Access',
  reference: 'https://attack.mitre.org/tactics/TA0001/',
  revoked: false,
  deprecated: false,
  type: 'tactic',
  position: 0,
};

export const mockTechnique: MitreTechniqueSummary = {
  framework: 'enterprise',
  framework_version: '16.1',
  id: 'T1190',
  name: 'Exploit Public-Facing Application',
  reference: 'https://attack.mitre.org/techniques/T1190/',
  revoked: false,
  deprecated: false,
  type: 'technique',
  tactic_ids: ['TA0001'],
};

export const mockSubtechnique: MitreSubtechniqueSummary = {
  framework: 'enterprise',
  framework_version: '16.1',
  id: 'T1078.001',
  name: 'Default Accounts',
  reference: 'https://attack.mitre.org/techniques/T1078/001/',
  revoked: false,
  deprecated: false,
  type: 'subtechnique',
  tactic_ids: ['TA0001'],
  technique_id: 'T1078',
};

export const mockMitreEntitySummaryBuckets = (): MitreEntitySummaryBuckets => ({
  tactics: [mockTactic],
  techniques: [mockTechnique],
  subtechniques: [mockSubtechnique],
});

/** Returns an empty (loading-not-started or error) MitreConfiguration. */
export const createEmptyMitreConfiguration = (
  overrides: Partial<MitreConfiguration> = {}
): MitreConfiguration => ({
  tactics: [],
  techniques: [],
  subtechniques: [],
  frameworkVersion: undefined,
  isLoading: false,
  isError: false,
  ...overrides,
});

/** Returns a populated MitreConfiguration with sample data. */
export const createPopulatedMitreConfiguration = (
  overrides: Partial<MitreConfiguration> = {}
): MitreConfiguration => ({
  tactics: [mockTactic],
  techniques: [mockTechnique],
  subtechniques: [mockSubtechnique],
  frameworkVersion: '16.1',
  isLoading: false,
  isError: false,
  ...overrides,
});
