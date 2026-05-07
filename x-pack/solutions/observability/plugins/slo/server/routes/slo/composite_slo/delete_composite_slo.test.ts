/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../../common/constants';
import { deleteCompositeSummaryDoc } from './delete_composite_slo';

describe('deleteCompositeSummaryDoc', () => {
  const spaceId = 'my-space';
  const id = 'composite-slo-id';
  const docId = `${spaceId}:${id}`;

  it('deletes the summary document with the correct index and id', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggerMock.create();

    await deleteCompositeSummaryDoc(esClient, spaceId, id, logger);

    expect(esClient.delete).toHaveBeenCalledWith({
      index: COMPOSITE_SUMMARY_INDEX_NAME,
      id: docId,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('silently ignores 404 when the summary doc does not exist', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggerMock.create();
    esClient.delete.mockRejectedValueOnce({ statusCode: 404 });

    await expect(deleteCompositeSummaryDoc(esClient, spaceId, id, logger)).resolves.toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs an error for non-404 failures without rethrowing', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggerMock.create();
    const err = { statusCode: 503, message: 'service unavailable' };
    esClient.delete.mockRejectedValueOnce(err);

    await expect(deleteCompositeSummaryDoc(esClient, spaceId, id, logger)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to delete composite summary doc [${docId}]`)
    );
  });
});
