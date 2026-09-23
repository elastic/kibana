/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MITRE_ATTACK_ENTITY_SO_TYPE, buildSoId } from '@kbn/security-mitre-attack-common';
import type {
  MitreEntity,
  MitreSubtechnique,
  MitreTactic,
  MitreTechnique,
} from '@kbn/security-mitre-attack-common';

/** The index where MITRE entity saved objects live. */
export const SEEDED_MITRE_INDEX = '.kibana_security_solution';

/**
 * Synthetic version number that sorts above any real MITRE release.
 * Seeding entities at this version makes the managed API serve only the seeded
 * set — the entities route resolves the highest framework_version present
 * (`mitre_attack/server/services/mitre_attack_data_client/resolve_latest_version.ts`),
 * so 99.0 ensures only the fixture data is returned regardless of which real
 * MITRE artifact version is bundled.
 */
export const SEEDED_MITRE_FRAMEWORK_VERSION = '99.0';

const SEEDED_MITRE_FRAMEWORK = 'enterprise' as const;

const SO_BASE_FIELDS = {
  references: [],
  coreMigrationVersion: '8.6.0',
  // Matches model version 1 of the mitre-attack-entity type. Without this the
  // docs look unmigrated, causing the first model-version transform to rewrite
  // them on read.
  typeMigrationVersion: '10.1.0',
  updated_at: '2024-01-01T00:00:00.000Z',
  created_at: '2024-01-01T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Fixture entities — names are clearly synthetic; positions are distinct so
// ordering assertions can be made; SEEDED_TECHNIQUE_TWO belongs to both tactics.
// ---------------------------------------------------------------------------

export const SEEDED_TACTIC_ALPHA: MitreTactic = {
  framework: SEEDED_MITRE_FRAMEWORK,
  framework_version: SEEDED_MITRE_FRAMEWORK_VERSION,
  type: 'tactic',
  id: 'TA9001',
  name: 'Test Tactic Alpha',
  reference: 'https://attack.mitre.org/tactics/TA9001/',
  description: 'Synthetic tactic used only in tests.',
  revoked: false,
  deprecated: false,
  position: 0,
};

export const SEEDED_TACTIC_BETA: MitreTactic = {
  framework: SEEDED_MITRE_FRAMEWORK,
  framework_version: SEEDED_MITRE_FRAMEWORK_VERSION,
  type: 'tactic',
  id: 'TA9002',
  name: 'Test Tactic Beta',
  reference: 'https://attack.mitre.org/tactics/TA9002/',
  description: 'Synthetic tactic used only in tests.',
  revoked: false,
  deprecated: false,
  position: 1,
};

export const SEEDED_TECHNIQUE_ONE: MitreTechnique = {
  framework: SEEDED_MITRE_FRAMEWORK,
  framework_version: SEEDED_MITRE_FRAMEWORK_VERSION,
  type: 'technique',
  id: 'T9001',
  name: 'Test Technique One',
  reference: 'https://attack.mitre.org/techniques/T9001/',
  description: 'Synthetic technique used only in tests.',
  revoked: false,
  deprecated: false,
  tactic_ids: ['TA9001'],
};

export const SEEDED_TECHNIQUE_TWO: MitreTechnique = {
  framework: SEEDED_MITRE_FRAMEWORK,
  framework_version: SEEDED_MITRE_FRAMEWORK_VERSION,
  type: 'technique',
  id: 'T9002',
  name: 'Test Technique Two',
  reference: 'https://attack.mitre.org/techniques/T9002/',
  description: 'Synthetic technique, belongs to both test tactics.',
  revoked: false,
  deprecated: false,
  tactic_ids: ['TA9001', 'TA9002'],
};

export const SEEDED_SUBTECHNIQUE_ONE: MitreSubtechnique = {
  framework: SEEDED_MITRE_FRAMEWORK,
  framework_version: SEEDED_MITRE_FRAMEWORK_VERSION,
  type: 'subtechnique',
  id: 'T9001.001',
  name: 'Test Subtechnique One',
  reference: 'https://attack.mitre.org/techniques/T9001/001/',
  description: 'Synthetic subtechnique used only in tests.',
  revoked: false,
  deprecated: false,
  tactic_ids: ['TA9001'],
  technique_id: 'T9001',
};

export const SEEDED_ENTITIES: MitreEntity[] = [
  SEEDED_TACTIC_ALPHA,
  SEEDED_TACTIC_BETA,
  SEEDED_TECHNIQUE_ONE,
  SEEDED_TECHNIQUE_TWO,
  SEEDED_SUBTECHNIQUE_ONE,
];

/**
 * Builds the Elasticsearch bulk operations array for indexing the synthetic
 * MITRE entities. Each entity becomes two entries in the array: an index
 * action header and the document body.
 */
export const buildSeedBulkOperations = (): Array<Record<string, unknown>> =>
  SEEDED_ENTITIES.flatMap((entity) => {
    const soId = buildSoId({
      framework: entity.framework,
      frameworkVersion: entity.framework_version,
      id: entity.id,
    });
    const docId = `${MITRE_ATTACK_ENTITY_SO_TYPE}:${soId}`;
    return [
      { index: { _index: SEEDED_MITRE_INDEX, _id: docId } },
      {
        type: MITRE_ATTACK_ENTITY_SO_TYPE,
        [MITRE_ATTACK_ENTITY_SO_TYPE]: entity,
        ...SO_BASE_FIELDS,
      },
    ];
  });
