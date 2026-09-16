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
} from './types';

export const buildMockMitreTacticSummary = (
  overrides?: Partial<MitreTacticSummary>
): MitreTacticSummary => ({
  framework: 'enterprise',
  framework_version: '16.1',
  type: 'tactic',
  id: 'TA0001',
  name: 'Initial Access',
  reference: 'https://attack.mitre.org/tactics/TA0001/',
  revoked: false,
  deprecated: false,
  position: 0,
  ...overrides,
});

export const buildMockMitreTechniqueSummary = (
  overrides?: Partial<MitreTechniqueSummary>
): MitreTechniqueSummary => ({
  framework: 'enterprise',
  framework_version: '16.1',
  type: 'technique',
  id: 'T1190',
  name: 'Exploit Public-Facing Application',
  reference: 'https://attack.mitre.org/techniques/T1190/',
  revoked: false,
  deprecated: false,
  tactic_ids: ['TA0001'],
  ...overrides,
});

export const buildMockMitreSubtechniqueSummary = (
  overrides?: Partial<MitreSubtechniqueSummary>
): MitreSubtechniqueSummary => ({
  framework: 'enterprise',
  framework_version: '16.1',
  type: 'subtechnique',
  id: 'T1078.001',
  name: 'Default Accounts',
  reference: 'https://attack.mitre.org/techniques/T1078/001/',
  revoked: false,
  deprecated: false,
  tactic_ids: ['TA0001'],
  technique_id: 'T1078',
  ...overrides,
});

export const buildMockMitreEntitySummaryBuckets = (
  overrides?: Partial<MitreEntitySummaryBuckets>
): MitreEntitySummaryBuckets => ({
  tactics: [buildMockMitreTacticSummary()],
  techniques: [buildMockMitreTechniqueSummary()],
  subtechniques: [buildMockMitreSubtechniqueSummary()],
  ...overrides,
});
