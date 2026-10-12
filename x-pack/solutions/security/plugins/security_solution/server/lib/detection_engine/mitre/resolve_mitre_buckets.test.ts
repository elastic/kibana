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

  it('calls list() on every invocation so runtime data changes are always visible', async () => {
    const { client, mockList } = makeClient();

    const first = await resolveMitreBuckets(client);
    const second = await resolveMitreBuckets(client);

    expect(mockList).toHaveBeenCalledTimes(2);
    expect(first.tactics[0]).toMatchObject({ id: 'TA0099' });
    expect(second.tactics[0]).toMatchObject({ id: 'TA0099' });
  });

  it('rejects with "not initialized" when the managed collection is empty', async () => {
    const { client, mockList } = makeClient(true /* empty */);

    await expect(resolveMitreBuckets(client)).rejects.toThrow(
      'Managed MITRE data is not initialized'
    );
    await expect(resolveMitreBuckets(client)).rejects.toThrow(
      'Managed MITRE data is not initialized'
    );

    // Each call goes to list() because managed results are never cached.
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('propagates list() errors and succeeds on a subsequent call', async () => {
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

// Managed results are never cached, so they cannot bleed into legacy reads or vice versa.
it('managed results are never served from the legacy cache', async () => {
  const { client: managedClient, mockList } = makeClient();

  const managedResult = await resolveMitreBuckets(managedClient);
  const legacyResult = await resolveMitreBuckets();

  // list() is called for the managed read; legacy comes from the static blob.
  expect(mockList).toHaveBeenCalledTimes(1);
  // Managed has TA0099; legacy has TA0001 — they are different datasets.
  expect(managedResult.tactics[0].id).toBe('TA0099');
  expect(legacyResult.tactics[0].id).toBe('TA0001');
});
