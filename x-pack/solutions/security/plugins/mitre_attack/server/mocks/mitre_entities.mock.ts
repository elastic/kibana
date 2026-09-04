/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MitreTactic,
  MitreTechnique,
  MitreSubtechnique,
} from '@kbn/security-mitre-attack-common';

/** Returns a complete realistic MitreTactic for use in tests. */
export const getMockMitreTactic = (overrides?: Partial<MitreTactic>): MitreTactic => ({
  framework: 'enterprise',
  framework_version: '15.1',
  id: 'TA0001',
  name: 'Initial Access',
  reference: 'https://attack.mitre.org/tactics/TA0001/',
  description: 'The adversary is trying to get into your network.',
  revoked: false,
  deprecated: false,
  type: 'tactic',
  position: 1,
  ...overrides,
});

/** Returns a complete realistic MitreTechnique for use in tests. */
export const getMockMitreTechnique = (overrides?: Partial<MitreTechnique>): MitreTechnique => ({
  framework: 'enterprise',
  framework_version: '15.1',
  id: 'T1003',
  name: 'OS Credential Dumping',
  reference: 'https://attack.mitre.org/techniques/T1003/',
  description: 'Adversaries may attempt to dump credentials.',
  revoked: false,
  deprecated: false,
  type: 'technique',
  tactic_ids: ['TA0006'],
  ...overrides,
});

/** Returns a complete realistic MitreSubtechnique for use in tests. */
export const getMockMitreSubtechnique = (
  overrides?: Partial<MitreSubtechnique>
): MitreSubtechnique => ({
  framework: 'enterprise',
  framework_version: '15.1',
  id: 'T1003.001',
  name: 'LSASS Memory',
  reference: 'https://attack.mitre.org/techniques/T1003/001/',
  description: 'Adversaries may attempt to access credential material stored in LSASS.',
  revoked: false,
  deprecated: false,
  type: 'subtechnique',
  tactic_ids: ['TA0006'],
  technique_id: 'T1003',
  ...overrides,
});
