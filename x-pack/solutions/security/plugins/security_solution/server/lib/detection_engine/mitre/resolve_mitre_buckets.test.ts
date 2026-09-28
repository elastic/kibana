/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import { resolveMitreBuckets, resetResolveMitreBucketsCache } from './resolve_mitre_buckets';

// Minimal fixture that satisfies the legacy blob shape so the real
// transformLegacyMitreData adapter can be exercised without loading the full blob.
jest.mock('../../../../common/detection_engine/mitre/mitre_tactics_techniques', () => ({
  tactics: [
    {
      id: 'TA0001',
      name: 'Initial Access',
      reference: 'https://attack.mitre.org/tactics/TA0001/',
      value: 'initialAccess',
      label: 'Initial Access (TA0001)',
    },
  ],
  techniques: [
    {
      id: 'T1078',
      name: 'Valid Accounts',
      reference: 'https://attack.mitre.org/techniques/T1078/',
      value: 'validAccounts',
      label: 'Valid Accounts (T1078)',
      tactics: ['initial-access'],
    },
  ],
  subtechniques: [],
}));

const atlasCollection = {
  framework: 'atlas' as const,
  tactics: [{ id: 'AML.TA0000', name: 'Atlas Tactic' }],
  techniques: [{ id: 'AML.T0000', name: 'Atlas Technique' }],
  subtechniques: [],
};

const enterpriseCollection = (empty: boolean) => ({
  framework: 'enterprise' as const,
  tactics: empty ? [] : [{ id: 'TA0099', name: 'Managed Tactic' }],
  techniques: empty ? [] : [{ id: 'T9001', name: 'Managed Technique' }],
  subtechniques: [],
});

// resolveMitreBuckets fetches both frameworks, so the mock answers per framework.
const makeClient = (empty = false): { client: MitreAttackDataClient; mockList: jest.Mock } => {
  const mockList = jest.fn();
  mockList.mockImplementation(({ framework }: { framework?: string } = {}) =>
    Promise.resolve(framework === 'atlas' ? atlasCollection : enterpriseCollection(empty))
  );
  const client: MitreAttackDataClient = { list: mockList, getById: jest.fn() };
  return { client, mockList };
};

beforeEach(() => {
  jest.clearAllMocks();
  resetResolveMitreBucketsCache();
});

describe('resolveMitreBuckets — managed path', () => {
  it('fetches both frameworks and merges the buckets', async () => {
    const { client, mockList } = makeClient();

    const result = await resolveMitreBuckets(client);

    expect(mockList).toHaveBeenCalledTimes(2);
    expect(mockList).toHaveBeenCalledWith({ framework: 'enterprise' });
    expect(mockList).toHaveBeenCalledWith({ framework: 'atlas' });
    expect(result.tactics).toEqual([
      { id: 'TA0099', name: 'Managed Tactic' },
      { id: 'AML.TA0000', name: 'Atlas Tactic' },
    ]);
    expect(result.techniques).toEqual([
      { id: 'T9001', name: 'Managed Technique' },
      { id: 'AML.T0000', name: 'Atlas Technique' },
    ]);
  });

  it('caches a non-empty result so the frameworks are fetched only once across two calls', async () => {
    const { client, mockList } = makeClient();

    await resolveMitreBuckets(client);
    await resolveMitreBuckets(client);

    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('rejects with "not initialized" and does not cache an empty result, so list() is retried on the next call', async () => {
    const { client, mockList } = makeClient(true /* empty */);

    await expect(resolveMitreBuckets(client)).rejects.toThrow(
      'Managed MITRE data is not initialized'
    );
    await expect(resolveMitreBuckets(client)).rejects.toThrow(
      'Managed MITRE data is not initialized'
    );

    // Cache must have been cleared after each rejection so each call re-queries both frameworks.
    expect(mockList).toHaveBeenCalledTimes(4);
  });

  it('does not poison the cache when list() throws, and retries on the next call', async () => {
    let enterpriseAttempts = 0;
    const mockList = jest.fn();
    mockList.mockImplementation(({ framework }: { framework?: string } = {}) => {
      if (framework === 'atlas') {
        return Promise.resolve(atlasCollection);
      }
      enterpriseAttempts++;
      return enterpriseAttempts === 1
        ? Promise.reject(new Error('SO unavailable'))
        : Promise.resolve(enterpriseCollection(false));
    });
    const client: MitreAttackDataClient = { list: mockList, getById: jest.fn() };

    await expect(resolveMitreBuckets(client)).rejects.toThrow('SO unavailable');
    const result = await resolveMitreBuckets(client);

    expect(mockList).toHaveBeenCalledTimes(4);
    expect(result.tactics[0]).toMatchObject({ id: 'TA0099' });
  });
});

describe('resolveMitreBuckets — legacy fallback path', () => {
  it('adapts the legacy blob when no client is given', async () => {
    const result = await resolveMitreBuckets();

    // The mock provides TA0001 / T1078; transformLegacyMitreData resolves tactics
    // by converting the kebab-case tactic name to an ID.
    expect(result.tactics).toHaveLength(1);
    expect(result.tactics[0]).toMatchObject({ id: 'TA0001', name: 'Initial Access' });
    expect(result.techniques).toHaveLength(1);
    expect(result.techniques[0]).toMatchObject({ id: 'T1078', name: 'Valid Accounts' });
  });
});

describe('resolveMitreBuckets — separate cache keys', () => {
  it('managed and legacy results do not share a cache entry', async () => {
    const { client: managedClient, mockList } = makeClient();

    // Populate managed cache.
    const managedResult = await resolveMitreBuckets(managedClient);
    // Legacy path is independent.
    const legacyResult = await resolveMitreBuckets();

    expect(mockList).toHaveBeenCalledTimes(2);
    // Managed has TA0099; legacy has TA0001 — they are different datasets.
    expect(managedResult.tactics[0].id).toBe('TA0099');
    expect(legacyResult.tactics[0].id).toBe('TA0001');
  });
});
