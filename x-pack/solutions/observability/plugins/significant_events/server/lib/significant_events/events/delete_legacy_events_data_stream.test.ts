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
  it('deletes the retired data stream and template', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggingSystemMock.createLogger();

    await deleteLegacyEventsDataStream({ esClient, logger });

    expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith({
      name: LEGACY_EVENTS_DATA_STREAM,
    });
    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledWith({
      name: LEGACY_EVENTS_DATA_STREAM,
    });
  });

  it('ignores missing resources and continues startup cleanup', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggingSystemMock.createLogger();
    const notFound = Object.assign(new Error('not found'), { meta: { statusCode: 404 } });
    esClient.indices.deleteDataStream.mockRejectedValue(notFound);
    esClient.indices.deleteIndexTemplate.mockRejectedValue(notFound);

    await expect(deleteLegacyEventsDataStream({ esClient, logger })).resolves.toBeUndefined();

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
