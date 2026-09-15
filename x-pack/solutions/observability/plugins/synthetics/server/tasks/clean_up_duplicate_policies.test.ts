/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE,
  deleteDuplicatePackagePolicies,
} from './clean_up_duplicate_policies';
import type { SyntheticsServerSetup } from '../types';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

describe('deleteDuplicatePackagePolicies', () => {
  const makeServerSetup = ({
    deleteMock,
    bumpRevisionMock,
  }: {
    deleteMock: jest.Mock;
    bumpRevisionMock?: jest.Mock;
  }) => {
    const logger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };
    const serverSetup = {
      pluginsStart: {
        fleet: {
          packagePolicyService: {
            delete: deleteMock,
          },
          agentPolicyService: {
            bumpRevision: bumpRevisionMock ?? jest.fn().mockResolvedValue(undefined),
          },
        },
      },
      logger,
    } as unknown as SyntheticsServerSetup;
    return {
      serverSetup,
      logger,
      bumpRevisionMock:
        bumpRevisionMock ??
        (serverSetup.pluginsStart.fleet.agentPolicyService.bumpRevision as jest.Mock),
    };
  };

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

    await deleteDuplicatePackagePolicies([], soClient, esClient, serverSetup);

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
    const { serverSetup, logger, bumpRevisionMock } = makeServerSetup({ deleteMock });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    const packages = ['p-1', 'p-2', 'p-3'];
    await deleteDuplicatePackagePolicies(packages, soClient, esClient, serverSetup);

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
    expect(bumpRevisionMock).toHaveBeenCalledWith(soClient, esClient, 'agent-a', {
      asyncDeploy: true,
    });
  });

  test('deletes a large list in 500-id batches and bumps once after all deletes', async () => {
    const deleteMock = jest
      .fn()
      .mockImplementation((_so, _es, batch: string[]) =>
        Promise.resolve(batch.map((id) => deleted(id, ['agent-a'])))
      );
    const { serverSetup, logger, bumpRevisionMock } = makeServerSetup({ deleteMock });
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
    expect(bumpRevisionMock).toHaveBeenCalledWith(soClient, esClient, 'agent-a', {
      asyncDeploy: true,
    });
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
    const { serverSetup, bumpRevisionMock } = makeServerSetup({ deleteMock });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    await deleteDuplicatePackagePolicies(['p-1', 'p-2', 'p-3'], soClient, esClient, serverSetup);

    expect(bumpRevisionMock).toHaveBeenCalledTimes(2);
    expect(bumpRevisionMock).toHaveBeenCalledWith(soClient, esClient, 'agent-a', {
      asyncDeploy: true,
    });
    expect(bumpRevisionMock).toHaveBeenCalledWith(soClient, esClient, 'agent-b', {
      asyncDeploy: true,
    });
  });

  test('does not bump when every delete fails', async () => {
    const deleteMock = jest
      .fn()
      .mockResolvedValue([{ id: 'p-1', success: false, policy_ids: ['agent-a'] }]);
    const { serverSetup, bumpRevisionMock } = makeServerSetup({ deleteMock });
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    await deleteDuplicatePackagePolicies(['p-1'], soClient, esClient, serverSetup);

    expect(bumpRevisionMock).not.toHaveBeenCalled();
  });
});
