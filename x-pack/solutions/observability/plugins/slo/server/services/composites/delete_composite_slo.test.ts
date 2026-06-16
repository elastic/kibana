/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../common/constants';
import { createCompositeSLORepositoryMock } from '../mocks';
import { deleteCompositeSlo } from './delete_composite_slo';

describe('deleteCompositeSlo', () => {
  const spaceId = 'my-space';
  const id = 'composite-slo-id';
  const docId = `${spaceId}:${id}`;

  it('deletes the composite definition and the summary document with the correct index and id', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const compositeRepository = createCompositeSLORepositoryMock();
    const logger = loggerMock.create();

    await deleteCompositeSlo({ id, spaceId }, { esClient, compositeRepository, logger });

    expect(compositeRepository.deleteById).toHaveBeenCalledWith(id);
    expect(esClient.delete).toHaveBeenCalledWith({
      index: COMPOSITE_SUMMARY_INDEX_NAME,
      id: docId,
      refresh: true,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('silently ignores 404 when the summary doc does not exist', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const compositeRepository = createCompositeSLORepositoryMock();
    const logger = loggerMock.create();
    esClient.delete.mockRejectedValueOnce({ statusCode: 404 });

    await expect(
      deleteCompositeSlo({ id, spaceId }, { esClient, compositeRepository, logger })
    ).resolves.toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs a debug message for non-404 summary delete failures without rethrowing', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const compositeRepository = createCompositeSLORepositoryMock();
    const logger = loggerMock.create();
    esClient.delete.mockRejectedValueOnce({ statusCode: 503, message: 'service unavailable' });

    await expect(
      deleteCompositeSlo({ id, spaceId }, { esClient, compositeRepository, logger })
    ).resolves.toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to delete composite summary doc [${docId}]`)
    );
  });
});
