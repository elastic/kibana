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

const makeClient = (empty = false): { client: MitreAttackDataClient; mockList: jest.Mock } => {
  const mockList = jest.fn().mockResolvedValue({
    framework: 'enterprise' as const,
    tactics: empty ? [] : [{ id: 'TA0099', name: 'Managed Tactic' }],
    techniques: empty ? [] : [{ id: 'T9001', name: 'Managed Technique' }],
    subtechniques: [],
  });
  const client: MitreAttackDataClient = { list: mockList, getById: jest.fn() };
  return { client, mockList };
};

beforeEach(() => {
  jest.clearAllMocks();
  resetResolveMitreBucketsCache();
});

describe('resolveMitreBuckets — managed path', () => {
  it('calls list() and returns the managed buckets', async () => {
    const { client, mockList } = makeClient();

    const result = await resolveMitreBuckets(client);

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(result.tactics[0]).toMatchObject({ id: 'TA0099', name: 'Managed Tactic' });
    expect(result.techniques[0]).toMatchObject({ id: 'T9001', name: 'Managed Technique' });
  });

  it('caches a non-empty result so list() is called only once across two calls', async () => {
    const { client, mockList } = makeClient();

    await resolveMitreBuckets(client);
    await resolveMitreBuckets(client);

    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('rejects with "not initialized" and does not cache an empty result, so list() is retried on the next call', async () => {
    const { client, mockList } = makeClient(true /* empty */);

    await expect(resolveMitreBuckets(client)).rejects.toThrow(
      'Managed MITRE data is not initialized'
    );
    await expect(resolveMitreBuckets(client)).rejects.toThrow(
      'Managed MITRE data is not initialized'
    );

    // Cache must have been cleared after each rejection so each call re-queries.
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('does not poison the cache when list() throws, and retries on the next call', async () => {
    const mockList = jest
      .fn()
      .mockRejectedValueOnce(new Error('SO unavailable'))
      .mockResolvedValueOnce({
        framework: 'enterprise' as const,
        tactics: [{ id: 'TA0099', name: 'Managed Tactic' }],
        techniques: [],
        subtechniques: [],
      });
    const client: MitreAttackDataClient = { list: mockList, getById: jest.fn() };

    await expect(resolveMitreBuckets(client)).rejects.toThrow('SO unavailable');
    const result = await resolveMitreBuckets(client);

    expect(mockList).toHaveBeenCalledTimes(2);
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

    expect(mockList).toHaveBeenCalledTimes(1);
    // Managed has TA0099; legacy has TA0001 — they are different datasets.
    expect(managedResult.tactics[0].id).toBe('TA0099');
    expect(legacyResult.tactics[0].id).toBe('TA0001');
  });
});
