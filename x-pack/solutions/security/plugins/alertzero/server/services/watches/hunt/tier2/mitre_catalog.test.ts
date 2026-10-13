/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreEntity } from '@kbn/security-mitre-attack-common';
import { buildMitreCatalog, getMitreCatalog } from './mitre_catalog';

const base = {
  framework: 'enterprise' as const,
  framework_version: '19.1',
  description: '',
  reference: 'https://attack.mitre.org/x',
  revoked: false,
  deprecated: false,
};

const fixture: MitreEntity[] = [
  { ...base, type: 'tactic', id: 'TA0001', name: 'Initial Access', position: 0 },
  { ...base, type: 'tactic', id: 'TA0005', name: 'Defense Evasion', position: 4 },
  { ...base, type: 'technique', id: 'T1566', name: 'Phishing', tactic_ids: ['TA0001'] },
  {
    ...base,
    type: 'subtechnique',
    id: 'T1566.001',
    name: 'Spearphishing Attachment',
    tactic_ids: ['TA0001'],
    technique_id: 'T1566',
  },
  {
    ...base,
    type: 'technique',
    id: 'T1685',
    name: 'Impair Defenses (new)',
    tactic_ids: ['TA0005'],
  },
  {
    ...base,
    type: 'subtechnique',
    id: 'T1562.001',
    name: 'Disable or Modify Tools',
    tactic_ids: ['TA0005'],
    technique_id: 'T1562',
    revoked: true,
    superseded_by_id: ['T1685'],
  },
  {
    ...base,
    type: 'technique',
    id: 'T1999',
    name: 'Revoked without successor',
    tactic_ids: ['TA0005'],
    revoked: true,
  },
  {
    ...base,
    type: 'technique',
    id: 'T1998',
    name: 'Deprecated',
    tactic_ids: ['TA0005'],
    deprecated: true,
  },
];

describe('buildMitreCatalog', () => {
  let catalog: ReturnType<typeof buildMitreCatalog>;

  beforeEach(() => {
    catalog = buildMitreCatalog(fixture);
  });

  it('indexes live techniques by id with their tactic ids', () => {
    expect(catalog.techniqueById.get('T1566')).toEqual({
      id: 'T1566',
      name: 'Phishing',
      reference: 'https://attack.mitre.org/x',
      tacticIds: ['TA0001'],
    });
  });

  it('indexes live sub-techniques with their parent technique id', () => {
    expect(catalog.subtechniqueById.get('T1566.001')?.parentTechniqueId).toBe('T1566');
  });

  it('does not list tactics in either map', () => {
    expect(catalog.techniqueById.has('TA0001')).toBe(false);
  });

  it('resolves a revoked id with one live successor to the successor entry', () => {
    expect(catalog.techniqueById.get('T1562.001')?.id).toBe('T1685');
  });

  it('drops a revoked id that has no live successor', () => {
    expect(catalog.techniqueById.has('T1999')).toBe(false);
  });

  it('drops deprecated entries', () => {
    expect(catalog.techniqueById.has('T1998')).toBe(false);
  });
});

describe('getMitreCatalog', () => {
  it('memoizes the catalog built from the shipped artifact', () => {
    expect(getMitreCatalog()).toBe(getMitreCatalog());
  });

  it('resolves T1566 from the shipped artifact as Phishing', () => {
    expect(getMitreCatalog().techniqueById.get('T1566')?.name).toBe('Phishing');
  });

  it('resolves T1059.001 from the shipped artifact as a sub-technique of T1059', () => {
    expect(getMitreCatalog().subtechniqueById.get('T1059.001')?.parentTechniqueId).toBe('T1059');
  });

  it('never returns a revoked id as an entry id', () => {
    const ids = [...getMitreCatalog().techniqueById.values()].map((entry) => entry.id);
    expect(ids).not.toContain('T1562.001');
  });
});
