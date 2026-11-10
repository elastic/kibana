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

// Synthetic version numbers that sort well above any real MITRE release, so
// test-seeded data never collides with the real artifact version.
export const DEFAULT_MOCK_FRAMEWORK_VERSION = '99.0';
export const OLDER_MOCK_FRAMEWORK_VERSION = '98.0';
// ATLAS fixtures use a version distinct from the enterprise ones so tests can
// observe that the latest version resolves independently per framework.
export const ATLAS_MOCK_FRAMEWORK_VERSION = '97.0';

/** Creates a MitreTactic with sensible defaults. Pass overrides to customize any field. */
export const createMitreTactic = (overrides?: Partial<MitreTactic>): MitreTactic => ({
  framework: 'enterprise',
  framework_version: DEFAULT_MOCK_FRAMEWORK_VERSION,
  id: 'TA0001',
  type: 'tactic',
  name: 'Initial Access',
  reference: 'https://attack.mitre.org/tactics/TA0001/',
  description: 'The adversary is trying to get into your network.',
  revoked: false,
  deprecated: false,
  position: 0,
  ...overrides,
});

/** Creates a MitreTechnique with sensible defaults. Pass overrides to customize any field. */
export const createMitreTechnique = (overrides?: Partial<MitreTechnique>): MitreTechnique => ({
  framework: 'enterprise',
  framework_version: DEFAULT_MOCK_FRAMEWORK_VERSION,
  id: 'T0001',
  type: 'technique',
  name: 'Test Technique',
  reference: 'https://attack.mitre.org/techniques/T0001/',
  description: 'A technique used in tests.',
  revoked: false,
  deprecated: false,
  tactic_ids: ['TA0001'],
  ...overrides,
});

/** Creates a MitreSubtechnique with sensible defaults. Pass overrides to customize any field. */
export const createMitreSubtechnique = (
  overrides?: Partial<MitreSubtechnique>
): MitreSubtechnique => ({
  framework: 'enterprise',
  framework_version: DEFAULT_MOCK_FRAMEWORK_VERSION,
  id: 'T0001.001',
  type: 'subtechnique',
  name: 'Test Subtechnique',
  reference: 'https://attack.mitre.org/techniques/T0001/001/',
  description: 'A subtechnique used in tests.',
  revoked: false,
  deprecated: false,
  tactic_ids: ['TA0001'],
  technique_id: 'T0001',
  ...overrides,
});

// ---------------------------------------------------------------------------
// MITRE ATLAS fixtures. ATLAS ids carry the `AML.` prefix and reference
// atlas.mitre.org; the 9000-range keeps them clearly synthetic.
// ---------------------------------------------------------------------------

/** Creates an ATLAS MitreTactic (`AML.TA9000`). Pass overrides to customize any field. */
export const createAtlasMitreTactic = (overrides?: Partial<MitreTactic>): MitreTactic =>
  createMitreTactic({
    framework: 'atlas',
    framework_version: ATLAS_MOCK_FRAMEWORK_VERSION,
    id: 'AML.TA9000',
    name: 'Test ATLAS Tactic',
    reference: 'https://atlas.mitre.org/tactics/AML.TA9000/',
    description: 'An ATLAS tactic used in tests.',
    position: 0,
    ...overrides,
  });

/** Creates an ATLAS MitreTechnique (`AML.T9000` under `AML.TA9000`). Pass overrides to customize any field. */
export const createAtlasMitreTechnique = (overrides?: Partial<MitreTechnique>): MitreTechnique =>
  createMitreTechnique({
    framework: 'atlas',
    framework_version: ATLAS_MOCK_FRAMEWORK_VERSION,
    id: 'AML.T9000',
    name: 'Test ATLAS Technique',
    reference: 'https://atlas.mitre.org/techniques/AML.T9000/',
    description: 'An ATLAS technique used in tests.',
    tactic_ids: ['AML.TA9000'],
    ...overrides,
  });

/** Creates an ATLAS MitreSubtechnique (`AML.T9000.001` under `AML.T9000`). Pass overrides to customize any field. */
export const createAtlasMitreSubtechnique = (
  overrides?: Partial<MitreSubtechnique>
): MitreSubtechnique =>
  createMitreSubtechnique({
    framework: 'atlas',
    framework_version: ATLAS_MOCK_FRAMEWORK_VERSION,
    id: 'AML.T9000.001',
    name: 'Test ATLAS Subtechnique',
    // ATLAS keeps the dotted subtechnique id in the URL.
    reference: 'https://atlas.mitre.org/techniques/AML.T9000.001/',
    description: 'An ATLAS subtechnique used in tests.',
    tactic_ids: ['AML.TA9000'],
    technique_id: 'AML.T9000',
    ...overrides,
  });
