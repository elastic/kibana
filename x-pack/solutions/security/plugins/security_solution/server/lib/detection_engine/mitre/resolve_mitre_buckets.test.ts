/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  resolveMitreBuckets,
  resolveMitreBucketsByFramework,
  resetResolveMitreBucketsCache,
} from './resolve_mitre_buckets';

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

  it('defaults to the enterprise framework', async () => {
    const { client, mockList } = makeClient();

    await resolveMitreBuckets(client);

    expect(mockList).toHaveBeenCalledWith({ framework: 'enterprise' });
  });

  it('forwards the framework to list()', async () => {
    const { client, mockList } = makeClient();

    await resolveMitreBuckets(client, 'atlas');

    expect(mockList).toHaveBeenCalledWith({ framework: 'atlas' });
  });

  it('includes the framework in the "not initialized" error', async () => {
    const { client } = makeClient(true);

    await expect(resolveMitreBuckets(client, 'atlas')).rejects.toThrow(
      'Managed MITRE data is not initialized (framework: atlas)'
    );
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

  it('rejects for frameworks other than enterprise', async () => {
    await expect(resolveMitreBuckets(undefined, 'atlas')).rejects.toThrow(
      'Legacy MITRE data source only provides the enterprise framework (requested: atlas)'
    );
  });
});

describe('resolveMitreBucketsByFramework', () => {
  const makeFrameworkClient = (
    atlasResult: 'ok' | 'reject'
  ): { client: MitreAttackDataClient; mockList: jest.Mock } => {
    const mockList = jest
      .fn()
      .mockImplementation(async ({ framework }: { framework?: string } = {}) => {
        if (framework === 'atlas') {
          if (atlasResult === 'reject') {
            throw new Error('atlas unavailable');
          }
          return {
            framework: 'atlas' as const,
            tactics: [{ id: 'AML.TA0000', name: 'Atlas Tactic' }],
            techniques: [],
            subtechniques: [],
          };
        }
        return {
          framework: 'enterprise' as const,
          tactics: [{ id: 'TA0099', name: 'Managed Tactic' }],
          techniques: [],
          subtechniques: [],
        };
      });
    return { client: { list: mockList, getById: jest.fn() }, mockList };
  };

  it('returns buckets for both frameworks when both resolve', async () => {
    const { client } = makeFrameworkClient('ok');

    const result = await resolveMitreBucketsByFramework(client, ['enterprise', 'atlas']);

    expect(result.enterprise?.tactics[0]).toMatchObject({ id: 'TA0099' });
    expect(result.atlas?.tactics[0]).toMatchObject({ id: 'AML.TA0000' });
  });

  it('omits a rejected framework, keeps the other, and logs at debug', async () => {
    const { client } = makeFrameworkClient('reject');
    const logger = loggingSystemMock.createLogger();

    const result = await resolveMitreBucketsByFramework(client, ['enterprise', 'atlas'], logger);

    expect(Object.keys(result)).toEqual(['enterprise']);
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('atlas'));
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('atlas unavailable'));
  });

  it('returns an empty record when every framework rejects', async () => {
    const mockList = jest.fn().mockRejectedValue(new Error('SO unavailable'));
    const client: MitreAttackDataClient = { list: mockList, getById: jest.fn() };

    const result = await resolveMitreBucketsByFramework(client, ['enterprise', 'atlas']);

    expect(result).toEqual({});
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
