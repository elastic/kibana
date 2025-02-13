/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventLogStatusMetric } from '../../detections/rules/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { getInitialEventLogUsage } from '../../detections/rules/get_initial_usage';
import {
  getAllEventLogTransform,
  getElasticLogCustomRules,
  getEmptyElasticLogCustomRules,
  getEmptyEventLogAllRules,
  getEmptyEventLogElasticRules,
  getEventLogAllRules,
  getEventLogElasticRules,
} from '../../detections/rules/get_metrics.mocks';
import { getEventLogByTypeAndStatus } from '../get_event_log_by_type_and_status';

describe('get_event_log_by_type_and_status', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  });

  test('returns initial event log usage results if there are no rule results', async () => {
    const logger = loggingSystemMock.createLogger();
    esClient.search.mockResponseOnce(getEmptyEventLogAllRules());
    esClient.search.mockResponseOnce(getEmptyEventLogElasticRules());
    esClient.search.mockResponseOnce(getEmptyElasticLogCustomRules());

    const result = await getEventLogByTypeAndStatus({
      logger,
      eventLogIndex: 'test',
      esClient,
      ruleResults: [],
    });
    expect(result).toEqual<EventLogStatusMetric>(getInitialEventLogUsage());
  });

  test('returns initial event log usage results if an exception is thrown by Elasticsearch', async () => {
    const logger = loggingSystemMock.createLogger();
    esClient.search.mockRejectedValue(new Error('Some error'));

    const result = await getEventLogByTypeAndStatus({
      logger,
      eventLogIndex: 'test',
      esClient,
      ruleResults: [],
    });
    expect(logger.debug).toHaveBeenCalledWith(
      'Error trying to get event log by type and status. Error message is: "Some error". Error is: "Error: Some error". Returning empty initialized object.'
    );
    expect(result).toEqual<EventLogStatusMetric>(getInitialEventLogUsage());
  });

  test('returns results transformed if given valid input from Elasticsearch', async () => {
    const logger = loggingSystemMock.createLogger();
    esClient.search.mockResponseOnce(getEventLogAllRules());
    esClient.search.mockResponseOnce(getEventLogElasticRules());
    esClient.search.mockResponseOnce(getElasticLogCustomRules());

    const result = await getEventLogByTypeAndStatus({
      logger,
      eventLogIndex: 'test',
      esClient,
      ruleResults: [],
    });
    expect(result).toEqual<EventLogStatusMetric>(getAllEventLogTransform());
  });
});
