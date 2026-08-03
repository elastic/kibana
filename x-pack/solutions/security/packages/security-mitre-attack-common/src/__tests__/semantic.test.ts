/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreEntity } from '../types';
import { MITRE_SEMANTIC_FIELD, buildMitreAttackFieldMap, mitreAttackFieldMap } from '../field_map';
import { buildSemanticText } from '../semantic_text';

describe('buildMitreAttackFieldMap', () => {
  it('is byte-identical to the keyword-only map when no endpoint is given', () => {
    expect(buildMitreAttackFieldMap()).toEqual({ ...mitreAttackFieldMap });
    expect(buildMitreAttackFieldMap({})).toEqual({ ...mitreAttackFieldMap });
  });

  it('adds a semantic_text field bound to the given endpoint', () => {
    const fieldMap = buildMitreAttackFieldMap({ semanticInferenceId: '.elser-2-elasticsearch' });

    expect(fieldMap[MITRE_SEMANTIC_FIELD]).toEqual({
      type: 'semantic_text',
      required: false,
      inference_id: '.elser-2-elasticsearch',
    });
  });

  it('leaves the keyword fields untouched when semantic search is on', () => {
    const fieldMap = buildMitreAttackFieldMap({ semanticInferenceId: '.elser-2-elasticsearch' });
    const { [MITRE_SEMANTIC_FIELD]: _semantic, ...rest } = fieldMap;

    expect(rest).toEqual({ ...mitreAttackFieldMap });
  });
});

describe('buildSemanticText', () => {
  const tactic: MitreEntity = {
    type: 'tactic',
    framework: 'enterprise',
    versions: ['ATT&CK-v19.1'],
    id: 'TA0006',
    name: 'Credential Access',
    reference: 'https://attack.mitre.org/tactics/TA0006/',
    description: 'Adversaries are trying to steal account names and passwords.',
  };

  const subtechnique: MitreEntity = {
    type: 'subtechnique',
    framework: 'enterprise',
    versions: ['ATT&CK-v19.1'],
    id: 'T1003.001',
    name: 'LSASS Memory',
    reference: 'https://attack.mitre.org/techniques/T1003/001/',
    description: 'Adversaries may attempt to access credential material stored in LSASS.',
    tactics: ['credential-access'],
    techniqueId: 'T1003',
  };

  it('leads with the name and id so near-name queries stay retrievable', () => {
    expect(buildSemanticText(tactic)).toMatch(/^Credential Access \(TA0006\)/);
  });

  it('includes the tactic context for entities that carry it', () => {
    expect(buildSemanticText(subtechnique)).toBe(
      'LSASS Memory (T1003.001)\n\nTactics: credential-access\n\nAdversaries may attempt to access credential material stored in LSASS.'
    );
  });

  it('omits the tactics section for entities without tactics', () => {
    expect(buildSemanticText(tactic)).not.toContain('Tactics:');
  });

  it('omits an empty description rather than emitting trailing separators', () => {
    expect(buildSemanticText({ ...tactic, description: '' })).toBe('Credential Access (TA0006)');
  });
});
