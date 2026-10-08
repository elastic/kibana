/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreEntity } from '@kbn/security-mitre-attack-common';
import {
  buildMockAtlasTechnique,
  buildMockMitreSubtechnique,
  buildMockMitreTactic,
  buildMockMitreTechnique,
} from '@kbn/security-mitre-attack-common';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import { buildMitreCatalog, getMitreCatalog } from './mitre_catalog';

const fixture: MitreEntity[] = [
  buildMockMitreTactic({ id: 'TA0001', name: 'Initial Access', position: 0 }),
  buildMockMitreTactic({ id: 'TA0005', name: 'Defense Evasion', position: 4 }),
  buildMockMitreTechnique({
    id: 'T1566',
    name: 'Phishing',
    reference: 'https://attack.mitre.org/techniques/T1566/',
    tactic_ids: ['TA0001'],
  }),
  buildMockMitreSubtechnique({
    id: 'T1566.001',
    name: 'Spearphishing Attachment',
    tactic_ids: ['TA0001'],
    technique_id: 'T1566',
  }),
  buildMockMitreTechnique({ id: 'T1685', name: 'Impair Defenses (new)', tactic_ids: ['TA0005'] }),
  buildMockMitreSubtechnique({
    id: 'T1562.001',
    name: 'Disable or Modify Tools',
    tactic_ids: ['TA0005'],
    technique_id: 'T1562',
    revoked: true,
    superseded_by_id: ['T1685'],
  }),
  buildMockMitreTechnique({
    id: 'T1999',
    name: 'Revoked without successor',
    tactic_ids: ['TA0005'],
    revoked: true,
  }),
  buildMockMitreTechnique({
    id: 'T1998',
    name: 'Deprecated',
    tactic_ids: ['TA0005'],
    deprecated: true,
  }),
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
      reference: 'https://attack.mitre.org/techniques/T1566/',
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
  const atlasTechnique = buildMockAtlasTechnique();

  const mixed: MitreEntity[] = [...fixture, atlasTechnique];

  /** A client whose `list` honors the framework param, like the real one. */
  const makeClient = (entities: MitreEntity[] = mixed) => {
    const list = jest.fn(async ({ framework = 'enterprise' }: { framework?: string } = {}) => {
      const scoped = entities.filter((entity) => entity.framework === framework);
      return {
        framework,
        tactics: scoped.filter((e) => e.type === 'tactic'),
        techniques: scoped.filter((e) => e.type === 'technique'),
        subtechniques: scoped.filter((e) => e.type === 'subtechnique'),
      };
    });
    return { list } as unknown as MitreAttackDataClient & { list: typeof list };
  };

  it('lists the enterprise framework with status all', async () => {
    const client = makeClient();
    await getMitreCatalog({ mitreDataClient: client });
    expect(client.list).toHaveBeenCalledWith({ framework: 'enterprise', status: 'all' });
  });

  it('never includes ATLAS techniques', async () => {
    const catalog = await getMitreCatalog({ mitreDataClient: makeClient() });
    expect(catalog.techniqueById.has('AML.T0044')).toBe(false);
    expect(catalog.techniqueById.get('T1566')?.name).toBe('Phishing');
    expect(catalog.subtechniqueById.get('T1566.001')?.parentTechniqueId).toBe('T1566');
  });

  it('resolves a revoked technique to its successor', async () => {
    const catalog = await getMitreCatalog({ mitreDataClient: makeClient() });
    expect(catalog.techniqueById.get('T1562.001')?.id).toBe('T1685');
  });

  it('memoizes a non-empty catalog', async () => {
    const client = makeClient();
    const first = await getMitreCatalog({ mitreDataClient: client });
    const second = await getMitreCatalog({ mitreDataClient: client });
    expect(second).toBe(first);
    expect(client.list).toHaveBeenCalledTimes(1);
  });

  it('returns an empty catalog without caching it when the collection is empty', async () => {
    const empty = makeClient([]);
    const catalog = await getMitreCatalog({ mitreDataClient: empty });
    expect(catalog.techniqueById.size).toBe(0);
    expect(catalog.subtechniqueById.size).toBe(0);

    await getMitreCatalog({ mitreDataClient: empty });
    expect(empty.list).toHaveBeenCalledTimes(2);

    const populated = await getMitreCatalog({ mitreDataClient: makeClient() });
    expect(populated.techniqueById.get('T1566')?.name).toBe('Phishing');
  });

  it('returns an empty catalog without caching when the client read fails', async () => {
    const logger = loggingSystemMock.createLogger();
    const list = jest
      .fn()
      .mockRejectedValueOnce(new Error('search_phase_execution_exception'))
      .mockImplementation(makeClient().list);
    const client = { list } as unknown as MitreAttackDataClient;

    const failed = await getMitreCatalog({ mitreDataClient: client, logger });
    expect(failed.techniqueById.size).toBe(0);
    expect(logger.warn).toHaveBeenCalledTimes(1);

    const recovered = await getMitreCatalog({ mitreDataClient: client, logger });
    expect(recovered.techniqueById.has('T1566')).toBe(true);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('returns an empty catalog and logs at debug when no client is available', async () => {
    const logger = loggingSystemMock.createLogger();
    const first = await getMitreCatalog({ mitreDataClient: undefined, logger });
    expect(first.techniqueById.size).toBe(0);
    expect(first.subtechniqueById.size).toBe(0);
    expect(logger.debug).toHaveBeenCalledTimes(1);
  });
});
