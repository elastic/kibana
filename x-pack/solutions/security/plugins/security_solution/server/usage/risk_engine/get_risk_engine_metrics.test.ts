/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { getRiskEngineMetrics } from './get_risk_engine_metrics';
import { getAggregationResultMock, getStatsResultMock } from './get_risk_engine_metrics.mocks';

const riskEngineIndexPatterns = {
  all: 'an-index-pattern',
  latest: 'another-index-pattern',
};

describe('risk engine metrics', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  describe('risk engine not installed', () => {
    beforeEach(() => {
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      logger = loggingSystemMock.createLogger();
    });

    it('should return empty object', async () => {
      esClient.indices.get.mockResponseOnce({});

      const result = await getRiskEngineMetrics({
        esClient,
        logger,
        riskEngineIndexPatterns,
      });
      expect(result).toEqual({});
    });
  });

  describe('risk engine installed', () => {
    beforeEach(() => {
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      logger = loggingSystemMock.createLogger();
    });

    it('should return metrics object', async () => {
      esClient.search.mockResponseOnce(
        getAggregationResultMock({
          user: 100,
          host: 200,
        })
      );
      esClient.search.mockResponseOnce(
        getAggregationResultMock({
          user: 10,
          host: 20,
        })
      );
      esClient.search.mockResponseOnce(
        getAggregationResultMock({
          user: 1000,
          host: 2000,
        })
      );
      esClient.search.mockResponseOnce(
        getAggregationResultMock({
          user: 500,
          host: 600,
        })
      );
      esClient.indices.stats.mockResponseOnce(
        getStatsResultMock({
          size: 10000,
        })
      );
      esClient.indices.stats.mockResponseOnce(
        getStatsResultMock({
          size: 5000,
        })
      );
      const result = await getRiskEngineMetrics({
        esClient,
        logger,
        riskEngineIndexPatterns,
      });
      expect(result).toEqual({
        unique_user_risk_score_total: 100,
        unique_host_risk_score_total: 200,
        unique_user_risk_score_day: 10,
        unique_host_risk_score_day: 20,
        all_user_risk_scores_total: 1000,
        all_host_risk_scores_total: 2000,
        all_user_risk_scores_total_day: 500,
        all_host_risk_scores_total_day: 600,
        all_risk_scores_index_size: 0.01,
        unique_risk_scores_index_size: 0.005,
      });
    });

    it('should still return metrics object if some request return error', async () => {
      esClient.search.mockResponseOnce(
        getAggregationResultMock({
          user: 100,
          host: 200,
        })
      );
      esClient.search.mockResponseOnce(
        getAggregationResultMock({
          user: 10,
          host: 20,
        })
      );
      esClient.search.mockResponseOnce(
        getAggregationResultMock({
          user: 1000,
          host: 2000,
        })
      );
      esClient.search.mockImplementationOnce(() => {
        throw new Error('Connection Error');
      });

      esClient.indices.stats.mockResponseOnce(
        getStatsResultMock({
          size: 10000,
        })
      );
      esClient.indices.stats.mockResponseOnce(
        getStatsResultMock({
          size: 5000,
        })
      );
      const result = await getRiskEngineMetrics({
        esClient,
        logger,
        riskEngineIndexPatterns,
      });
      expect(result).toEqual({
        unique_user_risk_score_total: 100,
        unique_host_risk_score_total: 200,
        unique_user_risk_score_day: 10,
        unique_host_risk_score_day: 20,
        all_user_risk_scores_total: 1000,
        all_host_risk_scores_total: 2000,
        all_risk_scores_index_size: 0.01,
        unique_risk_scores_index_size: 0.005,
      });
    });
  });
});
