/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE,
  bumpAgentPolicyRevisions,
  deleteDuplicatePackagePolicies,
} from './clean_up_duplicate_policies';
import type { SyntheticsServerSetup } from '../types';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

describe('deleteDuplicatePackagePolicies', () => {
  const makeServerSetup = ({
    deleteMock,
    bumpRevisionMock,
    spaceIdsByPolicy = {},
  }: {
    deleteMock: jest.Mock;
    bumpRevisionMock?: jest.Mock;
    spaceIdsByPolicy?: Record<string, string[]>;
  }) => {
    const logger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const bumpRevision = bumpRevisionMock ?? jest.fn().mockResolvedValue(undefined);
    const esClient = {} as ElasticsearchClient;
    const scopedClients: Record<string, unknown> = {};
    const asScopedToNamespace = jest.fn((spaceId: string) => {
      scopedClients[spaceId] = scopedClients[spaceId] ?? { spaceId };
      return scopedClients[spaceId];
    });
    const agentPolicyService = {
      bumpRevision,
      getByIds: jest.fn(async (_soClient: unknown, ids: Array<{ id: string }>) =>
        ids.map(({ id }) => ({ id, space_ids: spaceIdsByPolicy[id] ?? [] }))
      ),
    };
    const fleet = {
      packagePolicyService: { delete: deleteMock },
      agentPolicyService,
    };
    const serverSetup = {
      coreStart: {
        savedObjects: {
          createInternalRepository: jest.fn().mockReturnValue({ unscoped: true }),
          getUnsafeInternalClient: jest.fn().mockReturnValue({ asScopedToNamespace }),
        },
        elasticsearch: { client: { asInternalUser: esClient } },
      },
      fleet,
      pluginsStart: { fleet },
      logger,
    } as unknown as SyntheticsServerSetup;
    return {
      serverSetup,
      logger,
      bumpRevisionMock: bumpRevision,
      bumpEsClient: esClient,
      asScopedToNamespace,
      scopedClients,
    };
  };

  /** Agent policies with no explicit spaces are bumped through the default space. */
  const defaultSpaceClient = (scopedClients: Record<string, unknown>) => scopedClients.default;

  const deleted = (id: string, policyIds: string[]) => ({
    id,
    success: true as const,
    policy_ids: policyIds,
  });

  test('does nothing and logs when packagePoliciesToDelete is empty', async () => {
    const deleteMock = jest.fn();
    const { serverSetup, logger, bumpRevisionMock } = makeServerSetup({ deleteMock });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    const { deletedCount } = await deleteDuplicatePackagePolicies(
      [],
      soClient,
      esClient,
      serverSetup
    );

    expect(deletedCount).toBe(0);
    expect(deleteMock).not.toHaveBeenCalled();
    expect(bumpRevisionMock).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      `[PrivateLocationCleanUpTask] Found 0 duplicate package policies to delete.`
    );
  });

  test('deletes a small list in a single batch and bumps each agent policy once', async () => {
    const deleteMock = jest
      .fn()
      .mockResolvedValue([
        deleted('p-1', ['agent-a']),
        deleted('p-2', ['agent-a']),
        deleted('p-3', ['agent-a']),
      ]);
    const { serverSetup, logger, bumpRevisionMock, bumpEsClient, scopedClients } = makeServerSetup({
      deleteMock,
    });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    const packages = ['p-1', 'p-2', 'p-3'];
    const { deletedCount, failedAgentPolicyIds, attemptedAgentPolicyIds } =
      await deleteDuplicatePackagePolicies(packages, soClient, esClient, serverSetup);
    expect(deletedCount).toBe(3);
    expect(failedAgentPolicyIds).toEqual([]);
    expect(attemptedAgentPolicyIds).toEqual(['agent-a']);
    expect(logger.info).toHaveBeenNthCalledWith(
      1,
      `[PrivateLocationCleanUpTask] Found ${packages.length} duplicate package policies to delete.`
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Deleting batch 1/1 (size=3), with ids [p-1, p-2, p-3]')
    );
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith(soClient, esClient, packages, {
      force: true,
      ignoreMissing: true,
      spaceIds: ['*'],
      bumpRevision: false,
    });
    expect(bumpRevisionMock).toHaveBeenCalledTimes(1);
    expect(bumpRevisionMock).toHaveBeenCalledWith(
      defaultSpaceClient(scopedClients),
      bumpEsClient,
      'agent-a',
      { asyncDeploy: true }
    );
  });

  test('deletes a large list in 500-id batches and bumps once after all deletes', async () => {
    const deleteMock = jest
      .fn()
      .mockImplementation((_so, _es, batch: string[]) =>
        Promise.resolve(batch.map((id) => deleted(id, ['agent-a'])))
      );
    const { serverSetup, logger, bumpRevisionMock, bumpEsClient, scopedClients } = makeServerSetup({
      deleteMock,
    });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    const total = DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE + 50;
    const packages = Array.from({ length: total }, (_, i) => `p-${i + 1}`);
    await deleteDuplicatePackagePolicies(packages, soClient, esClient, serverSetup);

    const expectedBatches = 2;
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Deleting batch 1/${expectedBatches}`)
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Deleting batch 2/${expectedBatches}`)
    );

    expect(deleteMock).toHaveBeenCalledTimes(expectedBatches);
    expect(deleteMock.mock.calls[0][2]).toEqual(
      packages.slice(0, DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE)
    );
    expect(deleteMock.mock.calls[1][2]).toEqual(
      packages.slice(DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE)
    );
    expect(deleteMock.mock.calls[0][3]).toEqual({
      force: true,
      ignoreMissing: true,
      spaceIds: ['*'],
      bumpRevision: false,
    });
    expect(bumpRevisionMock).toHaveBeenCalledTimes(1);
    expect(bumpRevisionMock).toHaveBeenCalledWith(
      defaultSpaceClient(scopedClients),
      bumpEsClient,
      'agent-a',
      { asyncDeploy: true }
    );
    expect(bumpRevisionMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      deleteMock.mock.invocationCallOrder[1]
    );
  });

  test('bumps each unique agent policy once when leftovers span multiple policies', async () => {
    const deleteMock = jest
      .fn()
      .mockResolvedValue([
        deleted('p-1', ['agent-a']),
        deleted('p-2', ['agent-b']),
        deleted('p-3', ['agent-a']),
      ]);
    const { serverSetup, bumpRevisionMock, bumpEsClient, scopedClients } = makeServerSetup({
      deleteMock,
    });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    await deleteDuplicatePackagePolicies(['p-1', 'p-2', 'p-3'], soClient, esClient, serverSetup);

    expect(bumpRevisionMock).toHaveBeenCalledTimes(2);
    expect(bumpRevisionMock).toHaveBeenCalledWith(
      defaultSpaceClient(scopedClients),
      bumpEsClient,
      'agent-a',
      { asyncDeploy: true }
    );
    expect(bumpRevisionMock).toHaveBeenCalledWith(
      defaultSpaceClient(scopedClients),
      bumpEsClient,
      'agent-b',
      { asyncDeploy: true }
    );
  });

  test('does not bump when every delete fails', async () => {
    const deleteMock = jest
      .fn()
      .mockResolvedValue([{ id: 'p-1', success: false, policy_ids: ['agent-a'] }]);
    const { serverSetup, bumpRevisionMock } = makeServerSetup({ deleteMock });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    const { deletedCount } = await deleteDuplicatePackagePolicies(
      ['p-1'],
      soClient,
      esClient,
      serverSetup
    );

    expect(deletedCount).toBe(0);
    expect(bumpRevisionMock).not.toHaveBeenCalled();
  });

  test('bumps from policy_id when policy_ids is missing', async () => {
    const deleteMock = jest
      .fn()
      .mockResolvedValue([{ id: 'p-1', success: true, policy_id: 'agent-a' }]);
    const { serverSetup, bumpRevisionMock, bumpEsClient, scopedClients } = makeServerSetup({
      deleteMock,
    });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    const { deletedCount } = await deleteDuplicatePackagePolicies(
      ['p-1'],
      soClient,
      esClient,
      serverSetup
    );

    expect(deletedCount).toBe(1);
    expect(bumpRevisionMock).toHaveBeenCalledTimes(1);
    expect(bumpRevisionMock).toHaveBeenCalledWith(
      defaultSpaceClient(scopedClients),
      bumpEsClient,
      'agent-a',
      { asyncDeploy: true }
    );
  });

  test('counts and bumps only successful deletes', async () => {
    const deleteMock = jest
      .fn()
      .mockResolvedValue([
        deleted('p-1', ['agent-a']),
        { id: 'p-2', success: false, policy_ids: ['agent-b'] },
      ]);
    const { serverSetup, bumpRevisionMock, bumpEsClient, scopedClients } = makeServerSetup({
      deleteMock,
    });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    const { deletedCount } = await deleteDuplicatePackagePolicies(
      ['p-1', 'p-2'],
      soClient,
      esClient,
      serverSetup
    );

    expect(deletedCount).toBe(1);
    expect(bumpRevisionMock).toHaveBeenCalledTimes(1);
    expect(bumpRevisionMock).toHaveBeenCalledWith(
      defaultSpaceClient(scopedClients),
      bumpEsClient,
      'agent-a',
      { asyncDeploy: true }
    );
    expect(bumpRevisionMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'agent-b',
      expect.anything()
    );
  });

  test('bumps agent policies from earlier batches when a later batch throws', async () => {
    const deleteMock = jest.fn().mockImplementation((_so, _es, batch: string[]) => {
      if (batch.includes('p-1')) {
        return Promise.resolve(batch.map((id) => deleted(id, ['agent-a'])));
      }
      return Promise.reject(new Error('fleet unavailable'));
    });
    const { serverSetup, bumpRevisionMock, bumpEsClient, scopedClients } = makeServerSetup({
      deleteMock,
    });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    const total = DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE + 50;
    const packages = Array.from({ length: total }, (_, i) => `p-${i + 1}`);

    await expect(
      deleteDuplicatePackagePolicies(packages, soClient, esClient, serverSetup)
    ).rejects.toThrow('fleet unavailable');

    expect(bumpRevisionMock).toHaveBeenCalledWith(
      defaultSpaceClient(scopedClients),
      bumpEsClient,
      'agent-a',
      { asyncDeploy: true }
    );
  });

  test('treats a missing delete result list as zero deletes', async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const { serverSetup, bumpRevisionMock } = makeServerSetup({ deleteMock });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    const { deletedCount } = await deleteDuplicatePackagePolicies(
      ['p-1'],
      soClient,
      esClient,
      serverSetup
    );

    expect(deletedCount).toBe(0);
    expect(bumpRevisionMock).not.toHaveBeenCalled();
  });

  test('records failed bumps and still returns deletedCount so follow-up sync can run', async () => {
    const deleteMock = jest.fn().mockResolvedValue([deleted('p-1', ['agent-a'])]);
    const bumpRevisionMock = jest.fn().mockRejectedValue(new Error('deployment failed'));
    const { serverSetup, logger } = makeServerSetup({
      deleteMock,
      bumpRevisionMock,
    });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    const result = await deleteDuplicatePackagePolicies(['p-1'], soClient, esClient, serverSetup);

    expect(result.deletedCount).toBe(1);
    expect(result.failedAgentPolicyIds).toEqual(['agent-a']);
    expect(result.attemptedAgentPolicyIds).toEqual(['agent-a']);
    expect(bumpRevisionMock).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to bump agent policy [agent-a]'),
      { error: expect.any(Error) }
    );
  });

  test('bumps remaining agent policies when one bump fails', async () => {
    const deleteMock = jest
      .fn()
      .mockResolvedValue([deleted('p-1', ['agent-a']), deleted('p-2', ['agent-b'])]);
    const bumpRevisionMock = jest.fn().mockImplementation(async (_so, _es, policyId: string) => {
      if (policyId === 'agent-a') {
        throw new Error('deployment failed');
      }
    });
    const { serverSetup, bumpEsClient, scopedClients } = makeServerSetup({
      deleteMock,
      bumpRevisionMock,
    });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    const result = await deleteDuplicatePackagePolicies(
      ['p-1', 'p-2'],
      soClient,
      esClient,
      serverSetup
    );

    expect(result.deletedCount).toBe(2);
    expect(result.failedAgentPolicyIds).toEqual(['agent-a']);
    expect(bumpRevisionMock).toHaveBeenCalledWith(
      defaultSpaceClient(scopedClients),
      bumpEsClient,
      'agent-b',
      { asyncDeploy: true }
    );
  });
});

describe('bumpAgentPolicyRevisions', () => {
  const makeServerSetup = (
    bumpRevisionMock: jest.Mock,
    spaceIdsByPolicy: Record<string, string[]> = {}
  ) => {
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    const esClient = {} as ElasticsearchClient;
    const scopedClients: Record<string, unknown> = {};
    const asScopedToNamespace = jest.fn((spaceId: string) => {
      scopedClients[spaceId] = scopedClients[spaceId] ?? { spaceId };
      return scopedClients[spaceId];
    });
    const getByIds = jest.fn(async (_soClient: unknown, ids: Array<{ id: string }>) =>
      ids.map(({ id }) => ({ id, space_ids: spaceIdsByPolicy[id] ?? [] }))
    );
    const agentPolicyService = {
      bumpRevision: bumpRevisionMock,
      getByIds,
    };
    const serverSetup = {
      coreStart: {
        savedObjects: {
          createInternalRepository: jest.fn().mockReturnValue({ unscoped: true }),
          getUnsafeInternalClient: jest.fn().mockReturnValue({ asScopedToNamespace }),
        },
        elasticsearch: { client: { asInternalUser: esClient } },
      },
      fleet: { agentPolicyService },
      pluginsStart: { fleet: { agentPolicyService } },
      logger,
    } as unknown as SyntheticsServerSetup;
    return { serverSetup, logger, esClient, asScopedToNamespace, getByIds, scopedClients };
  };

  test('returns an empty list when there is nothing to bump', async () => {
    const bumpRevisionMock = jest.fn();
    const { serverSetup } = makeServerSetup(bumpRevisionMock);

    await expect(bumpAgentPolicyRevisions([], serverSetup)).resolves.toEqual([]);
    expect(bumpRevisionMock).not.toHaveBeenCalled();
  });

  test('bumps duplicate ids once', async () => {
    const bumpRevisionMock = jest.fn().mockResolvedValue(undefined);
    const { serverSetup } = makeServerSetup(bumpRevisionMock);

    await expect(bumpAgentPolicyRevisions(['agent-a', 'agent-a'], serverSetup)).resolves.toEqual(
      []
    );
    expect(bumpRevisionMock).toHaveBeenCalledTimes(1);
  });

  test('returns every id that still failed', async () => {
    const bumpRevisionMock = jest.fn().mockRejectedValue(new Error('conflict'));
    const { serverSetup } = makeServerSetup(bumpRevisionMock);

    await expect(bumpAgentPolicyRevisions(['agent-a', 'agent-b'], serverSetup)).resolves.toEqual([
      'agent-a',
      'agent-b',
    ]);
    expect(bumpRevisionMock).toHaveBeenCalledTimes(2);
  });

  test('bumps in a space the agent policy actually lives in', async () => {
    const bumpRevisionMock = jest.fn().mockResolvedValue(undefined);
    const { serverSetup, esClient, asScopedToNamespace, scopedClients } = makeServerSetup(
      bumpRevisionMock,
      { 'agent-a': ['team-space'] }
    );

    await expect(bumpAgentPolicyRevisions(['agent-a'], serverSetup)).resolves.toEqual([]);

    expect(asScopedToNamespace).toHaveBeenCalledWith('team-space');
    expect(bumpRevisionMock).toHaveBeenCalledWith(
      scopedClients['team-space'],
      esClient,
      'agent-a',
      { asyncDeploy: true }
    );
  });
});
