/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreSubtechnique, MitreTactic, MitreTechnique } from './schema';
import type {
  MitreEntitySummaryBuckets,
  MitreSubtechniqueSummary,
  MitreTacticSummary,
  MitreTechniqueSummary,
} from './types';

const omitDescription = <T extends { description: string }>(entity: T): Omit<T, 'description'> => {
  const { description, ...summary } = entity;
  return summary;
};

// ---------------------------------------------------------------------------
// Enterprise full entities
// ---------------------------------------------------------------------------

export const buildMockMitreTactic = (overrides?: Partial<MitreTactic>): MitreTactic => ({
  framework: 'enterprise',
  framework_version: '16.1',
  type: 'tactic',
  id: 'TA0001',
  name: 'Initial Access',
  reference: 'https://attack.mitre.org/tactics/TA0001/',
  description: '',
  revoked: false,
  deprecated: false,
  position: 0,
  ...overrides,
});

export const buildMockMitreTechnique = (overrides?: Partial<MitreTechnique>): MitreTechnique => ({
  framework: 'enterprise',
  framework_version: '16.1',
  type: 'technique',
  id: 'T1190',
  name: 'Exploit Public-Facing Application',
  reference: 'https://attack.mitre.org/techniques/T1190/',
  description: '',
  revoked: false,
  deprecated: false,
  tactic_ids: ['TA0001'],
  ...overrides,
});

export const buildMockMitreSubtechnique = (
  overrides?: Partial<MitreSubtechnique>
): MitreSubtechnique => ({
  framework: 'enterprise',
  framework_version: '16.1',
  type: 'subtechnique',
  id: 'T1078.001',
  name: 'Default Accounts',
  reference: 'https://attack.mitre.org/techniques/T1078/001/',
  description: '',
  revoked: false,
  deprecated: false,
  tactic_ids: ['TA0001'],
  technique_id: 'T1078',
  ...overrides,
});

/** Builds `count` distinct enterprise techniques (`T9000 + index`), e.g. for budget-style tests. */
export const buildMockMitreEntities = (
  count: number,
  overrides?: Partial<MitreTechnique>
): MitreTechnique[] =>
  Array.from({ length: count }, (_, index) =>
    buildMockMitreTechnique({
      id: `T${9000 + index}`,
      name: `Mock technique ${index}`,
      reference: `https://attack.mitre.org/techniques/T${9000 + index}/`,
      ...overrides,
    })
  );

// ---------------------------------------------------------------------------
// ATLAS full entities
// ---------------------------------------------------------------------------

export const buildMockAtlasTactic = (overrides?: Partial<MitreTactic>): MitreTactic =>
  buildMockMitreTactic({
    framework: 'atlas',
    framework_version: '2026.8',
    id: 'AML.TA0000',
    name: 'AI Model Access',
    reference: 'https://atlas.mitre.org/tactics/AML.TA0000/',
    position: 0,
    ...overrides,
  });

export const buildMockAtlasTechnique = (overrides?: Partial<MitreTechnique>): MitreTechnique =>
  buildMockMitreTechnique({
    framework: 'atlas',
    framework_version: '2026.8',
    id: 'AML.T0044',
    name: 'Full AI Model Access',
    reference: 'https://atlas.mitre.org/techniques/AML.T0044/',
    tactic_ids: ['AML.TA0000'],
    ...overrides,
  });

export const buildMockAtlasSubtechnique = (
  overrides?: Partial<MitreSubtechnique>
): MitreSubtechnique =>
  buildMockMitreSubtechnique({
    framework: 'atlas',
    framework_version: '2026.8',
    id: 'AML.T0024.002',
    name: 'Extract AI Model',
    reference: 'https://atlas.mitre.org/techniques/AML.T0024.002/',
    tactic_ids: ['AML.TA0010'],
    technique_id: 'AML.T0024',
    ...overrides,
  });

// ---------------------------------------------------------------------------
// Enterprise summaries (full entity without `description`)
// ---------------------------------------------------------------------------

export const buildMockMitreTacticSummary = (
  overrides?: Partial<MitreTacticSummary>
): MitreTacticSummary => ({ ...omitDescription(buildMockMitreTactic()), ...overrides });

export const buildMockMitreTechniqueSummary = (
  overrides?: Partial<MitreTechniqueSummary>
): MitreTechniqueSummary => ({ ...omitDescription(buildMockMitreTechnique()), ...overrides });

export const buildMockMitreSubtechniqueSummary = (
  overrides?: Partial<MitreSubtechniqueSummary>
): MitreSubtechniqueSummary => ({ ...omitDescription(buildMockMitreSubtechnique()), ...overrides });

export const buildMockMitreEntitySummaryBuckets = (
  overrides?: Partial<MitreEntitySummaryBuckets>
): MitreEntitySummaryBuckets => ({
  tactics: [buildMockMitreTacticSummary()],
  techniques: [buildMockMitreTechniqueSummary()],
  subtechniques: [buildMockMitreSubtechniqueSummary()],
  ...overrides,
});
