/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  uninstallElasticsearchAssets,
  reinstallSharedElasticsearchAssetsIfMissing,
  isIndexNotFoundError,
} from './install_assets';
import { getLatestEntitiesIndexName } from '../../../common/domain/entity_index';
import { getUpdatesEntitiesDataStreamName } from './updates_data_stream';
import { getMetadataEntitiesDataStreamName } from './metadata_data_stream';

jest.mock('../../infra/elasticsearch');

const { deleteIndex, deleteDataStream, createIndex, createDataStream } = jest.requireMock(
  '../../infra/elasticsearch'
) as {
  deleteIndex: jest.Mock;
  deleteDataStream: jest.Mock;
  createIndex: jest.Mock;
  createDataStream: jest.Mock;
};

describe('uninstallElasticsearchAssets', () => {
  const namespace = 'default';

  beforeEach(() => {
    jest.clearAllMocks();
    deleteIndex.mockResolvedValue(undefined);
    deleteDataStream.mockResolvedValue(undefined);
  });

  it('deletes the latest entities index', async () => {
    await uninstallElasticsearchAssets({
      esClient: {} as never,
      logger: loggerMock.create(),
      namespace,
    });

    expect(deleteIndex).toHaveBeenCalledWith(
      expect.anything(),
      getLatestEntitiesIndexName(namespace)
    );
  });

  it('deletes the updates data stream', async () => {
    await uninstallElasticsearchAssets({
      esClient: {} as never,
      logger: loggerMock.create(),
      namespace,
    });

    expect(deleteDataStream).toHaveBeenCalledWith(
      expect.anything(),
      getUpdatesEntitiesDataStreamName(namespace)
    );
  });

  it('deletes the metadata data stream so Clear Entity Data removes relationship history', async () => {
    await uninstallElasticsearchAssets({
      esClient: {} as never,
      logger: loggerMock.create(),
      namespace,
    });

    expect(deleteDataStream).toHaveBeenCalledWith(
      expect.anything(),
      getMetadataEntitiesDataStreamName(namespace)
    );
    // Verify the resolved name matches the entity metadata datastream that
    // relationship maintainers write to.
    expect(getMetadataEntitiesDataStreamName(namespace)).toBe(
      '.entities.v2.metadata.security_default'
    );
  });

  it('deletes all three resources in a single uninstall call', async () => {
    await uninstallElasticsearchAssets({
      esClient: {} as never,
      logger: loggerMock.create(),
      namespace,
    });

    expect(deleteIndex).toHaveBeenCalledTimes(1);
    expect(deleteDataStream).toHaveBeenCalledTimes(2);
  });
});

describe('reinstallSharedElasticsearchAssetsIfMissing', () => {
  const namespace = 'default';
  const updatesDataStream = getUpdatesEntitiesDataStreamName(namespace);
  const metadataDataStream = getMetadataEntitiesDataStreamName(namespace);

  const createEsClientMock = ({
    latest,
    updates,
    metadata,
  }: {
    latest: boolean;
    updates: boolean;
    metadata: boolean;
  }) =>
    ({
      indices: {
        exists: jest.fn().mockResolvedValue(latest),
        getDataStream: jest.fn().mockImplementation(async ({ name }: { name: string }) => {
          const present = name === updatesDataStream ? updates : metadata;
          if (!present) {
            throw new Error('resource_not_found_exception');
          }
          return { data_streams: [{ name }] };
        }),
      },
      ingest: { putPipeline: jest.fn().mockResolvedValue(undefined) },
      cluster: { putComponentTemplate: jest.fn().mockResolvedValue(undefined) },
    } as unknown as ElasticsearchClient);

  beforeEach(() => {
    jest.clearAllMocks();
    createIndex.mockResolvedValue(undefined);
    createDataStream.mockResolvedValue(undefined);
  });

  it('returns false and does not reinstall when all assets are present', async () => {
    const reinstalled = await reinstallSharedElasticsearchAssetsIfMissing({
      esClient: createEsClientMock({ latest: true, updates: true, metadata: true }),
      logger: loggerMock.create(),
      namespace,
    });

    expect(reinstalled).toBe(false);
    expect(createIndex).not.toHaveBeenCalled();
    expect(createDataStream).not.toHaveBeenCalled();
  });

  it('reinstalls and returns true when the latest index is missing', async () => {
    const logger = loggerMock.create();
    const reinstalled = await reinstallSharedElasticsearchAssetsIfMissing({
      esClient: createEsClientMock({ latest: false, updates: true, metadata: true }),
      logger,
      namespace,
    });

    expect(reinstalled).toBe(true);
    expect(createIndex).toHaveBeenCalledWith(
      expect.anything(),
      getLatestEntitiesIndexName(namespace),
      expect.anything()
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(getLatestEntitiesIndexName(namespace))
    );
  });

  it('reinstalls and returns true when the updates data stream is missing', async () => {
    const reinstalled = await reinstallSharedElasticsearchAssetsIfMissing({
      esClient: createEsClientMock({ latest: true, updates: false, metadata: true }),
      logger: loggerMock.create(),
      namespace,
    });

    expect(reinstalled).toBe(true);
    expect(createDataStream).toHaveBeenCalledWith(
      expect.anything(),
      updatesDataStream,
      expect.anything()
    );
  });

  it('reinstalls and returns true when the metadata data stream is missing', async () => {
    const reinstalled = await reinstallSharedElasticsearchAssetsIfMissing({
      esClient: createEsClientMock({ latest: true, updates: true, metadata: false }),
      logger: loggerMock.create(),
      namespace,
    });

    expect(reinstalled).toBe(true);
    expect(createDataStream).toHaveBeenCalledWith(
      expect.anything(),
      metadataDataStream,
      expect.anything()
    );
  });
});

describe('isIndexNotFoundError', () => {
  it('matches a top-level index_not_found_exception type', () => {
    expect(
      isIndexNotFoundError({ meta: { body: { error: { type: 'index_not_found_exception' } } } })
    ).toBe(true);
  });

  it('matches an index_not_found_exception in root_cause type', () => {
    expect(
      isIndexNotFoundError({
        meta: {
          body: {
            error: {
              type: 'verification_exception',
              root_cause: [{ type: 'index_not_found_exception' }],
            },
          },
        },
      })
    ).toBe(true);
  });

  it('matches ESQL verification_exception with "Unknown index" in root_cause reason', () => {
    // ESQL reports a missing index as a verification_exception whose reason contains "Unknown index".
    expect(
      isIndexNotFoundError({
        meta: {
          body: {
            error: {
              type: 'verification_exception',
              root_cause: [
                {
                  type: 'verification_exception',
                  reason:
                    'Found 1 problem\nline 153:15: Unknown index [.entities.v2.latest.security_default-00001]',
                },
              ],
            },
          },
        },
      })
    ).toBe(true);
  });

  it('matches an index_not_found_exception in the message', () => {
    expect(
      isIndexNotFoundError(new Error('Root causes: index_not_found_exception: no such index'))
    ).toBe(true);
  });

  it('does not match unrelated errors', () => {
    expect(isIndexNotFoundError(new Error('boom'))).toBe(false);
    expect(
      isIndexNotFoundError({
        meta: {
          body: {
            error: {
              type: 'verification_exception',
              root_cause: [{ type: 'verification_exception', reason: 'unrelated problem' }],
            },
          },
        },
      })
    ).toBe(false);
    expect(isIndexNotFoundError(undefined)).toBe(false);
    expect(isIndexNotFoundError(null)).toBe(false);
  });
});
