/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adaptMitreEntities } from './use_mitre_configuration';

describe('adaptMitreEntities', () => {
  const rawTactic1 = {
    type: 'tactic' as const,
    id: 'TA0001',
    name: 'Initial Access',
    reference: 'https://attack.mitre.org/tactics/TA0001/',
    position: 2,
    framework: 'enterprise' as const,
    framework_version: '16.1',
    description: '',
    revoked: false,
    deprecated: false,
  };

  const rawTactic2 = {
    type: 'tactic' as const,
    id: 'TA0043',
    name: 'Reconnaissance',
    reference: 'https://attack.mitre.org/tactics/TA0043/',
    position: 1,
    framework: 'enterprise' as const,
    framework_version: '16.1',
    description: '',
    revoked: false,
    deprecated: false,
  };

  const rawTechnique = {
    type: 'technique' as const,
    id: 'T1566',
    name: 'Phishing',
    reference: 'https://attack.mitre.org/techniques/T1566/',
    tactic_ids: ['TA0001'],
    framework: 'enterprise' as const,
    framework_version: '16.1',
    description: '',
    revoked: false,
    deprecated: false,
  };

  const rawMultiTacticTechnique = {
    type: 'technique' as const,
    id: 'T1595',
    name: 'Active Scanning',
    reference: 'https://attack.mitre.org/techniques/T1595/',
    tactic_ids: ['TA0043'],
    framework: 'enterprise' as const,
    framework_version: '16.1',
    description: '',
    revoked: false,
    deprecated: false,
  };

  const rawSubtechnique = {
    type: 'subtechnique' as const,
    id: 'T1566.001',
    name: 'Spearphishing Attachment',
    reference: 'https://attack.mitre.org/techniques/T1566/001/',
    tactic_ids: ['TA0001'],
    technique_id: 'T1566',
    framework: 'enterprise' as const,
    framework_version: '16.1',
    description: '',
    revoked: false,
    deprecated: false,
  };

  it('sorts tactics by position ascending', () => {
    const { tactics } = adaptMitreEntities([rawTactic1, rawTactic2]);
    // rawTactic2 (position 1) should come before rawTactic1 (position 2)
    expect(tactics[0].id).toBe('TA0043');
    expect(tactics[1].id).toBe('TA0001');
  });

  it('maps tactic value to camelCase of name', () => {
    const { tactics } = adaptMitreEntities([rawTactic1]);
    expect(tactics[0].value).toBe('initialAccess');
  });

  it('maps tactic label to "Name (ID)" format (POC: not i18n-translated)', () => {
    const { tactics } = adaptMitreEntities([rawTactic1]);
    expect(tactics[0].label).toBe('Initial Access (TA0001)');
  });

  it('maps technique tactics to kebab-case tactic names resolved from tactic_ids', () => {
    const { techniques } = adaptMitreEntities([rawTactic1, rawTechnique]);
    expect(techniques[0].tactics).toEqual(['initial-access']);
  });

  it('maps multi-tactic technique correctly', () => {
    const multiTacticTechnique = {
      ...rawTechnique,
      id: 'T1078',
      name: 'Valid Accounts',
      tactic_ids: ['TA0001', 'TA0043'],
    };
    const { techniques } = adaptMitreEntities([rawTactic1, rawTactic2, multiTacticTechnique]);
    expect(techniques[0].tactics).toEqual(['initial-access', 'reconnaissance']);
  });

  it('maps technique value and label', () => {
    const { techniques } = adaptMitreEntities([rawTactic1, rawTechnique]);
    expect(techniques[0].value).toBe('phishing');
    expect(techniques[0].label).toBe('Phishing (T1566)');
  });

  it('maps subtechnique techniqueId from technique_id', () => {
    const { subtechniques } = adaptMitreEntities([rawTactic1, rawTechnique, rawSubtechnique]);
    expect(subtechniques[0].techniqueId).toBe('T1566');
  });

  it('maps subtechnique tactics to kebab-case names', () => {
    const { subtechniques } = adaptMitreEntities([rawTactic1, rawTechnique, rawSubtechnique]);
    expect(subtechniques[0].tactics).toEqual(['initial-access']);
  });

  it('maps subtechnique value and label', () => {
    const { subtechniques } = adaptMitreEntities([rawTactic1, rawTechnique, rawSubtechnique]);
    expect(subtechniques[0].value).toBe('spearphishingAttachment');
    expect(subtechniques[0].label).toBe('Spearphishing Attachment (T1566.001)');
  });

  it('produces empty arrays when no entities of a type are provided', () => {
    const result = adaptMitreEntities([rawTactic1]);
    expect(result.techniques).toEqual([]);
    expect(result.subtechniques).toEqual([]);
  });

  it('falls back to kebabCase of the id when a tactic id is not found in the map', () => {
    // Technique references a tactic that is not in the entity list
    const orphanTechnique = {
      ...rawTechnique,
      tactic_ids: ['TA9999'],
    };
    const { techniques } = adaptMitreEntities([rawTactic1, orphanTechnique]);
    // kebabCase('TA9999') = 'ta-9999'
    expect(techniques[0].tactics).toEqual(['ta-9999']);
  });

  it('handles tactic names with multiple words and correct kebab case', () => {
    const { techniques } = adaptMitreEntities([rawTactic1, rawTactic2, rawMultiTacticTechnique]);
    // rawTactic2 is "Reconnaissance" → kebabCase = "reconnaissance"
    expect(techniques[0].tactics).toEqual(['reconnaissance']);
  });
});
