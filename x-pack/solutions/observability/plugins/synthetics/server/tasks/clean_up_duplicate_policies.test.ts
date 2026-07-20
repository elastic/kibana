/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  cleanUpDuplicatedPackagePolicies,
  deleteDuplicatePackagePolicies,
} from './clean_up_duplicate_policies';
import type { SyntheticsServerSetup } from '../types';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SyncTaskState } from './sync_private_locations_monitors_task';

jest.mock('../synthetics_service/private_location/synthetics_private_location', () => ({
  // Mirror the 9.4+ scheme: `${configId}-${locationId}` (no spaceId suffix).
  SyntheticsPrivateLocation: jest.fn().mockImplementation(() => ({
    getPolicyId: (config: { id: string }, locId: string) => `${config.id}-${locId}`,
  })),
}));

describe('deleteDuplicatePackagePolicies', () => {
  const makeServerSetup = (deleteMock: jest.Mock) => {
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
        },
      },
      logger,
    } as unknown as SyntheticsServerSetup;
    return { serverSetup, logger };
  };

  test('does nothing and logs when packagePoliciesToDelete is empty', async () => {
    const deleteMock = jest.fn();
    const { serverSetup, logger } = makeServerSetup(deleteMock);
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    await deleteDuplicatePackagePolicies([], soClient, esClient, serverSetup);

    expect(deleteMock).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      `[PrivateLocationCleanUpTask] Found 0 duplicate package policies to delete.`
    );
  });

  test('deletes small list in a single batch', async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const { serverSetup, logger } = makeServerSetup(deleteMock);
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    const packages = ['p-1', 'p-2', 'p-3'];
    await deleteDuplicatePackagePolicies(packages, soClient, esClient, serverSetup);

    // initial log + one batch log
    expect(logger.info).toHaveBeenCalledTimes(2);
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
    });
  });

  test('deletes large list in multiple batches of 100', async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const { serverSetup, logger } = makeServerSetup(deleteMock);
    const soClient = {} as SavedObjectsClientContract;
    const esClient = {} as ElasticsearchClient;

    const total = 250;
    const packages = Array.from({ length: total }, (_, i) => `p-${i + 1}`);
    await deleteDuplicatePackagePolicies(packages, soClient, esClient, serverSetup);

    const expectedBatches = 3; // 100, 100, 50
    // initial log + one log per batch
    expect(logger.info).toHaveBeenCalledTimes(1 + expectedBatches);
    expect(logger.info).toHaveBeenNthCalledWith(
      1,
      `[PrivateLocationCleanUpTask] Found ${total} duplicate package policies to delete.`
    );
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Deleting batch 1/3'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Deleting batch 2/3'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Deleting batch 3/3'));

    expect(deleteMock).toHaveBeenCalledTimes(expectedBatches);
    // verify first batch
    const firstBatch = packages.slice(0, 100);
    const secondBatch = packages.slice(100, 200);
    const thirdBatch = packages.slice(200, 250);

    expect(deleteMock).toHaveBeenNthCalledWith(1, soClient, esClient, firstBatch, {
      force: true,
      ignoreMissing: true,
      spaceIds: ['*'],
    });
    expect(deleteMock).toHaveBeenNthCalledWith(2, soClient, esClient, secondBatch, {
      force: true,
      ignoreMissing: true,
      spaceIds: ['*'],
    });
    expect(deleteMock).toHaveBeenNthCalledWith(3, soClient, esClient, thirdBatch, {
      force: true,
      ignoreMissing: true,
      spaceIds: ['*'],
    });
  });
});

describe('cleanUpDuplicatedPackagePolicies latch behavior', () => {
  const makeContext = ({
    monitorLocationIds,
    existingPolicyIds,
  }: {
    monitorLocationIds: string[];
    existingPolicyIds: string[];
  }) => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const logger = { info: jest.fn(), debug: jest.fn(), error: jest.fn() };

    const monitor = {
      attributes: {
        id: 'mon-1',
        origin: 'ui',
        locations: monitorLocationIds.map((id) => ({ id, isServiceManaged: false })),
      },
    };
    const finder = {
      async *find() {
        yield { saved_objects: [monitor] };
      },
      close: jest.fn().mockResolvedValue(undefined),
    };

    const serverSetup = {
      pluginsStart: {
        fleet: {
          packagePolicyService: {
            async *fetchAllItemIds() {
              yield existingPolicyIds;
            },
            delete: deleteMock,
          },
        },
      },
      coreStart: { elasticsearch: { client: { asInternalUser: {} } } },
      logger,
    } as unknown as SyntheticsServerSetup;

    const soClient = {
      createPointInTimeFinder: () => finder,
    } as unknown as SavedObjectsClientContract;

    const taskState: SyncTaskState = {
      lastStartedAt: new Date().toISOString(),
      hasAlreadyDoneCleanup: false,
      maxCleanUpRetries: 3,
    };

    return { serverSetup, soClient, taskState, deleteMock };
  };

  test('latches hasAlreadyDoneCleanup when already converged (nothing to delete, none missing)', async () => {
    const { serverSetup, soClient, taskState, deleteMock } = makeContext({
      monitorLocationIds: ['loc-1'],
      existingPolicyIds: ['mon-1-loc-1'], // matches expected new-format id
    });

    const { performCleanupSync } = await cleanUpDuplicatedPackagePolicies(
      serverSetup,
      soClient,
      taskState
    );

    expect(performCleanupSync).toBe(false);
    expect(taskState.hasAlreadyDoneCleanup).toBe(true);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  test('does NOT latch when a follow-up recreation is still required (legacy deleted, new missing)', async () => {
    const { serverSetup, soClient, taskState, deleteMock } = makeContext({
      monitorLocationIds: ['loc-1'],
      existingPolicyIds: ['mon-1-loc-1-default'], // legacy (spaceId-suffixed) id only
    });

    const { performCleanupSync } = await cleanUpDuplicatedPackagePolicies(
      serverSetup,
      soClient,
      taskState
    );

    // Legacy policy is deleted, but the expected new-format policy is missing, so the migration is
    // not complete — the flag must stay false so the next run retries recreation.
    expect(performCleanupSync).toBe(true);
    expect(taskState.hasAlreadyDoneCleanup).toBe(false);
    expect(deleteMock).toHaveBeenCalledWith(soClient, expect.anything(), ['mon-1-loc-1-default'], {
      force: true,
      ignoreMissing: true,
      spaceIds: ['*'],
    });
  });
});
