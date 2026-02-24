/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteDuplicatePackagePolicies } from './clean_up_duplicate_policies';
import type { SyntheticsServerSetup } from '../types';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

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
      spaceIds: ['*'],
    });
    expect(deleteMock).toHaveBeenNthCalledWith(2, soClient, esClient, secondBatch, {
      force: true,
      spaceIds: ['*'],
    });
    expect(deleteMock).toHaveBeenNthCalledWith(3, soClient, esClient, thirdBatch, {
      force: true,
      spaceIds: ['*'],
    });
  });
});
