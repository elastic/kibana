/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StixBundle, StixEntity, StixExternalReference } from './types';

/** Derives the canonical attack.mitre.org URL for a given ATT&CK id. */
const deriveAttackUrl = (mitreId: string): string => {
  if (mitreId.startsWith('TA')) {
    return `https://attack.mitre.org/tactics/${mitreId}/`;
  }
  // T1003 -> /techniques/T1003/, T1003.001 -> /techniques/T1003/001/
  const path = mitreId.replace('.', '/');
  return `https://attack.mitre.org/techniques/${path}/`;
};

/** Returns a MITRE ATT&CK external reference array for the given ATT&CK id and optional URL. */
export const getMockMitreExternalReferences = (
  mitreId: string,
  url?: string
): StixExternalReference[] => [
  {
    source_name: 'mitre-attack',
    external_id: mitreId,
    url: url ?? deriveAttackUrl(mitreId),
  },
];

/** Returns a default x-mitre-tactic entity merged with any supplied overrides. */
export const getMockTacticEntity = (overrides: Partial<StixEntity> = {}): StixEntity => ({
  id: 'x-mitre-tactic--ta0006',
  type: 'x-mitre-tactic',
  name: 'Credential Access',
  description: 'Adversaries may attempt to steal credentials to access or control systems.',
  x_mitre_shortname: 'credential-access',
  revoked: false,
  x_mitre_deprecated: false,
  external_references: getMockMitreExternalReferences('TA0006'),
  ...overrides,
});

/** Returns a default technique (non-subtechnique attack-pattern) entity merged with any supplied overrides. */
export const getMockTechniqueEntity = (overrides: Partial<StixEntity> = {}): StixEntity => ({
  id: 'attack-pattern--t1003',
  type: 'attack-pattern',
  name: 'OS Credential Dumping',
  description: 'Adversaries may attempt to dump credentials to obtain account login information.',
  x_mitre_is_subtechnique: false,
  revoked: false,
  x_mitre_deprecated: false,
  kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'credential-access' }],
  external_references: getMockMitreExternalReferences('T1003'),
  ...overrides,
});

/** Returns a default subtechnique (x_mitre_is_subtechnique: true) entity merged with any supplied overrides. */
export const getMockSubtechniqueEntity = (overrides: Partial<StixEntity> = {}): StixEntity => ({
  id: 'attack-pattern--t1003-001',
  type: 'attack-pattern',
  name: 'LSASS Memory',
  x_mitre_is_subtechnique: true,
  revoked: false,
  x_mitre_deprecated: false,
  kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'credential-access' }],
  external_references: getMockMitreExternalReferences('T1003.001'),
  ...overrides,
});

/** Returns a default x-mitre-matrix entity merged with any supplied overrides. */
export const getMockMatrixEntity = (overrides: Partial<StixEntity> = {}): StixEntity => ({
  id: 'x-mitre-matrix--main',
  type: 'x-mitre-matrix',
  name: 'Enterprise ATT&CK',
  tactic_refs: ['x-mitre-tactic--ta0006'],
  ...overrides,
});

/** Returns a default subtechnique-of relationship entity merged with any supplied overrides. */
export const getMockRelationshipEntity = (overrides: Partial<StixEntity> = {}): StixEntity => ({
  id: 'relationship--subtechnique-of--attack-pattern--t1003-001--attack-pattern--t1003',
  type: 'relationship',
  relationship_type: 'subtechnique-of',
  source_ref: 'attack-pattern--t1003-001',
  target_ref: 'attack-pattern--t1003',
  ...overrides,
});

/**
 * Returns a STIX bundle whose objects list contains the default matrix, tactic, technique,
 * subtechnique, and subtechnique-of relationship, merged with any supplied overrides.
 * Pass { objects: [...] } to replace the object list wholesale.
 */
export const getMockStixBundle = (overrides: Partial<StixBundle> = {}): StixBundle => ({
  objects: [
    getMockMatrixEntity(),
    getMockTacticEntity(),
    getMockTechniqueEntity(),
    getMockSubtechniqueEntity(),
    getMockRelationshipEntity(),
  ],
  ...overrides,
});

// ---------------------------------------------------------------------------
// MITRE ATLAS fixtures. ATLAS bundles use 'mitre-atlas' as both the external
// reference source_name and the kill_chain_name, IDs are prefixed with 'AML.',
// and upstream URLs have no trailing slash.
// ---------------------------------------------------------------------------

/** Derives the canonical atlas.mitre.org URL (no trailing slash, as upstream) for an ATLAS id. */
const deriveAtlasUrl = (atlasId: string): string => {
  if (atlasId.startsWith('AML.TA')) {
    return `https://atlas.mitre.org/tactics/${atlasId}`;
  }
  return `https://atlas.mitre.org/techniques/${atlasId}`;
};

/** Returns a MITRE ATLAS external reference array for the given ATLAS id and optional URL. */
export const getMockAtlasExternalReferences = (
  atlasId: string,
  url?: string
): StixExternalReference[] => [
  {
    source_name: 'mitre-atlas',
    external_id: atlasId,
    url: url ?? deriveAtlasUrl(atlasId),
  },
];

/** Returns a default ATLAS x-mitre-tactic entity merged with any supplied overrides. */
export const getMockAtlasTacticEntity = (overrides: Partial<StixEntity> = {}): StixEntity => ({
  id: 'x-mitre-tactic--aml-ta0010',
  type: 'x-mitre-tactic',
  name: 'Exfiltration',
  description: 'The adversary is trying to steal AI artifacts or other information.',
  x_mitre_shortname: 'exfiltration',
  external_references: getMockAtlasExternalReferences('AML.TA0010'),
  ...overrides,
});

/**
 * Returns a default ATLAS technique entity merged with any supplied overrides. Like many
 * upstream ATLAS techniques it also carries a secondary 'mitre-attack' reference to the
 * ATT&CK technique it maps to, which the build must ignore. ATLAS techniques omit
 * x_mitre_is_subtechnique rather than setting it to false.
 */
export const getMockAtlasTechniqueEntity = (overrides: Partial<StixEntity> = {}): StixEntity => ({
  id: 'attack-pattern--aml-t0024',
  type: 'attack-pattern',
  name: 'Exfiltration via AI Inference API',
  description: 'Adversaries may exfiltrate private information via the AI model inference API.',
  kill_chain_phases: [{ kill_chain_name: 'mitre-atlas', phase_name: 'exfiltration' }],
  external_references: [
    ...getMockAtlasExternalReferences('AML.T0024'),
    {
      source_name: 'mitre-attack',
      external_id: 'T1567',
      url: 'https://attack.mitre.org/techniques/T1567/',
    },
  ],
  ...overrides,
});

/** Returns a default ATLAS subtechnique entity merged with any supplied overrides. */
export const getMockAtlasSubtechniqueEntity = (
  overrides: Partial<StixEntity> = {}
): StixEntity => ({
  id: 'attack-pattern--aml-t0024-002',
  type: 'attack-pattern',
  name: 'Extract AI Model',
  x_mitre_is_subtechnique: true,
  kill_chain_phases: [{ kill_chain_name: 'mitre-atlas', phase_name: 'exfiltration' }],
  external_references: getMockAtlasExternalReferences('AML.T0024.002'),
  ...overrides,
});

/** Returns a default ATLAS x-mitre-matrix entity merged with any supplied overrides. */
export const getMockAtlasMatrixEntity = (overrides: Partial<StixEntity> = {}): StixEntity => ({
  id: 'x-mitre-matrix--atlas',
  type: 'x-mitre-matrix',
  name: 'ATLAS',
  tactic_refs: ['x-mitre-tactic--aml-ta0010'],
  ...overrides,
});

/** Returns a default ATLAS subtechnique-of relationship entity merged with any supplied overrides. */
export const getMockAtlasRelationshipEntity = (
  overrides: Partial<StixEntity> = {}
): StixEntity => ({
  id: 'relationship--subtechnique-of--aml-t0024-002--aml-t0024',
  type: 'relationship',
  relationship_type: 'subtechnique-of',
  source_ref: 'attack-pattern--aml-t0024-002',
  target_ref: 'attack-pattern--aml-t0024',
  ...overrides,
});

/**
 * Returns an ATLAS STIX bundle whose objects list contains the default ATLAS matrix, tactic,
 * technique, subtechnique, and subtechnique-of relationship, merged with any supplied overrides.
 */
export const getMockAtlasStixBundle = (overrides: Partial<StixBundle> = {}): StixBundle => ({
  objects: [
    getMockAtlasMatrixEntity(),
    getMockAtlasTacticEntity(),
    getMockAtlasTechniqueEntity(),
    getMockAtlasSubtechniqueEntity(),
    getMockAtlasRelationshipEntity(),
  ],
  ...overrides,
});
