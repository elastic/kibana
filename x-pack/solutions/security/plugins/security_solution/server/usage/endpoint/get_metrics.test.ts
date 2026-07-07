/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { getEndpointMetrics, getUniqueEndpointCount } from './get_metrics';
import { getUniqueEndpointCountMock } from './get_metrics.mocks';
import type { EndpointMetrics } from './types';

describe('Endpoint Metrics', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  describe('getEndpointMetrics()', () => {
    beforeEach(() => {
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      logger = loggingSystemMock.createLogger();
    });

    it('returns accurate active unique endpoint count', async () => {
      esClient.search.mockResponseOnce(getUniqueEndpointCountMock());
      const result = await getEndpointMetrics({
        esClient,
        logger,
      });
      expect(result).toEqual<EndpointMetrics>({
        unique_endpoint_count: 3,
      });
    });
  });
  describe('getUniqueEndpointCount()', () => {
    beforeEach(() => {
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      logger = loggingSystemMock.createLogger();
    });

    it('returns unique endpoint count', async () => {
      esClient.search.mockResponseOnce(getUniqueEndpointCountMock());
      const result = await getUniqueEndpointCount(esClient, logger);
      expect(esClient.search).toHaveBeenCalled();
      expect(result).toEqual(3);
    });

    it('returns 0 on error', async () => {
      esClient.search.mockRejectedValueOnce(new Error('Connection Error'));
      const result = await getUniqueEndpointCount(esClient, logger);
      expect(esClient.search).toHaveBeenCalled();
      expect(result).toEqual(0);
    });
  });
});
