/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performEsqlRequest } from './esql_request';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

const columns = [
  { name: '_id', type: 'keyword' as const },
  { name: 'agent.name', type: 'keyword' as const },
  { name: 'agent.version', type: 'keyword' as const },
  { name: 'agent.type', type: 'keyword' as const },
];
const values = [['doc-id', 'agent-name', '8.8.1', 'packetbeat']];

const requestBody = {
  query: 'from test* METADATA _id  | limit 101',
  filter: {
    bool: {
      filter: [
        {
          range: {
            '@timestamp': {
              lte: '2025-04-02T10:13:52.235Z',
              gte: '2013-11-04T16:13:52.235Z',
              format: 'strict_date_optional_time',
            },
          },
        },
        {
          bool: {
            must: [],
            filter: [],
            should: [],
            must_not: [],
          },
        },
      ],
    },
  },
  wait_for_completion_timeout: '4m',
};
const requestQueryParams = { drop_null_columns: true };

describe('performEsqlRequest', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const shouldStopExecution: jest.Mock = jest.fn();
  shouldStopExecution.mockReturnValue(false);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it('returns results immediately when the async query completed', async () => {
    const mockResponse = {
      id: 'QUERY-ID',
      is_running: false,
      columns,
      values,
    };

    esClient.transport.request.mockResolvedValueOnce(mockResponse);

    const result = await performEsqlRequest({
      esClient,
      requestBody,
      requestQueryParams,
      shouldStopExecution,
    });

    expect(result).toEqual(mockResponse);
    expect(esClient.transport.request).toHaveBeenCalledTimes(2);
    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_query/async',
      body: requestBody,
      querystring: requestQueryParams,
    });
    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/_query/async/QUERY-ID',
    });
  });

  it('polls until the query is completed', async () => {
    const mockSubmitResponse = {
      id: 'QUERY-ID',
      is_running: true,
      columns: [],
      values: [],
    };

    const mockPollResponse = {
      ...mockSubmitResponse,
      is_running: false,
      columns,
      values,
    };

    esClient.transport.request
      .mockResolvedValueOnce(mockSubmitResponse)
      .mockResolvedValueOnce(mockPollResponse);

    const waitForPerformEsql = performEsqlRequest({
      esClient,
      requestBody,
      requestQueryParams,
      shouldStopExecution,
    });

    await jest.advanceTimersByTimeAsync(15000);

    const result = await waitForPerformEsql;

    expect(result).toEqual(mockPollResponse);
    expect(esClient.transport.request).toHaveBeenCalledTimes(3);
    expect(esClient.transport.request).toHaveBeenNthCalledWith(1, {
      method: 'POST',
      path: '/_query/async',
      body: requestBody,
      querystring: requestQueryParams,
    });
    expect(esClient.transport.request).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      path: '/_query/async/QUERY-ID',
    });
    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/_query/async/QUERY-ID',
    });
  });

  it('throws an error if execution is cancelled', async () => {
    const mockSubmitResponse = {
      id: 'QUERY-ID',
      is_running: true,
      columns: [],
      values: [],
    };

    esClient.transport.request.mockResolvedValue(mockSubmitResponse);
    shouldStopExecution.mockReturnValue(true);

    const waitForPerformEsql = performEsqlRequest({
      esClient,
      requestBody,
      requestQueryParams,
      shouldStopExecution,
    }).catch((error) => {
      expect(error.message).toBe('Rule execution cancelled due to timeout');
    });

    await jest.advanceTimersByTimeAsync(15000);
    await waitForPerformEsql;
    expect.assertions(1);
  });

  it('deletes query if error happens during polling', async () => {
    const mockSubmitResponse = {
      id: 'QUERY-ID',
      is_running: true,
      columns: [],
      values: [],
    };

    esClient.transport.request
      .mockResolvedValueOnce(mockSubmitResponse)
      .mockRejectedValueOnce(new Error('Test error'));

    const waitForPerformEsql = performEsqlRequest({
      esClient,
      requestBody,
      requestQueryParams: {},
      shouldStopExecution,
    }).catch((error) => {
      expect(error.message).toBe('Test error');
    });

    await jest.advanceTimersByTimeAsync(15000);
    await waitForPerformEsql;

    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/_query/async/QUERY-ID',
    });

    expect.assertions(2);
  });
});
