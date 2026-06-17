/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import { sampleDocSearchResultsNoSortId } from '../__mocks__/es_results';
import { singleSearchAfter } from './single_search_after';
import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';

describe('singleSearchAfter', () => {
  const mockService: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();
  const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
  const mockSearchRequest = { query: { match_all: {} } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('if singleSearchAfter works without a given sort id', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      sampleDocSearchResultsNoSortId()
    );
    const { searchResult } = await singleSearchAfter({
      searchRequest: mockSearchRequest,
      services: mockService,
      ruleExecutionLogger,
    });
    expect(searchResult).toEqual(sampleDocSearchResultsNoSortId());
  });
  test('if singleSearchAfter returns an empty failure array', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      sampleDocSearchResultsNoSortId()
    );
    const { searchErrors } = await singleSearchAfter({
      searchRequest: mockSearchRequest,
      services: mockService,
      ruleExecutionLogger,
    });
    expect(searchErrors).toEqual([]);
  });
  test('if singleSearchAfter will return an error array', async () => {
    const errors: estypes.ShardFailure[] = [
      {
        shard: 1,
        index: 'index-123',
        node: 'node-123',
        reason: {
          type: 'some type',
          reason: 'some reason',
          index_uuid: 'uuid-123',
          index: 'index-123',
          caused_by: {
            type: 'some type',
            reason: 'some reason',
          },
        },
      },
    ];
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce({
      took: 10,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        failed: 1,
        skipped: 0,
        failures: errors,
      },
      hits: {
        total: 100,
        max_score: 100,
        hits: [],
      },
    });
    const { searchErrors } = await singleSearchAfter({
      searchRequest: mockSearchRequest,
      services: mockService,
      ruleExecutionLogger,
    });
    expect(searchErrors).toEqual([
      'index: "index-123" reason: "some reason" type: "some type" caused by reason: "some reason" caused by type: "some type"',
    ]);
  });
  test('if singleSearchAfter throws error', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createErrorTransportRequestPromise(new Error('Fake Error'))
    );
    await expect(
      singleSearchAfter({
        searchRequest: mockSearchRequest,
        services: mockService,
        ruleExecutionLogger,
      })
    ).rejects.toThrow('Fake Error');
  });
});
