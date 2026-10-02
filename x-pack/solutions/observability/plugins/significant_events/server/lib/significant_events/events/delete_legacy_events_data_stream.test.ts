/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import {
  deleteLegacyEventsDataStream,
  LEGACY_EVENTS_DATA_STREAM,
} from './delete_legacy_events_data_stream';

describe('deleteLegacyEventsDataStream', () => {
  const setup = () => ({
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
    logger: loggingSystemMock.createLogger(),
  });

  it('deletes the data stream and its index template', async () => {
    const { esClient, logger } = setup();

    await deleteLegacyEventsDataStream({ esClient, logger });

    expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith({
      name: LEGACY_EVENTS_DATA_STREAM,
    });
    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledWith({
      name: LEGACY_EVENTS_DATA_STREAM,
    });
  });

  it('ignores a missing stream and template', async () => {
    const { esClient, logger } = setup();
    const notFound = Object.assign(new Error('not found'), { meta: { statusCode: 404 } });
    esClient.indices.deleteDataStream.mockRejectedValue(notFound);
    esClient.indices.deleteIndexTemplate.mockRejectedValue(notFound);

    await expect(deleteLegacyEventsDataStream({ esClient, logger })).resolves.toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs and continues when deletion fails for another reason', async () => {
    const { esClient, logger } = setup();
    esClient.indices.deleteDataStream.mockRejectedValue(new Error('cluster blocked'));

    await expect(deleteLegacyEventsDataStream({ esClient, logger })).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster blocked'));
    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalled();
  });
});
