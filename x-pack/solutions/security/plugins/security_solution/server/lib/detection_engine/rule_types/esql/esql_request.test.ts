/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performEsqlRequest } from './esql_request';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';

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
  const asyncQueryMock = esClient.esql.asyncQuery as unknown as jest.Mock;
  const asyncQueryGetMock = esClient.esql.asyncQueryGet as unknown as jest.Mock;
  const asyncQueryDeleteMock = esClient.esql.asyncQueryDelete as unknown as jest.Mock;
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

    asyncQueryMock.mockResolvedValueOnce(mockResponse);

    const result = await performEsqlRequest({
      esClient,
      requestBody,
      requestQueryParams,
      shouldStopExecution,
    });

    expect(result).toEqual(mockResponse);
    expect(asyncQueryMock).toHaveBeenCalledTimes(1);
    expect(asyncQueryMock).toHaveBeenCalledWith({
      ...requestBody,
      ...requestQueryParams,
    });
    expect(asyncQueryDeleteMock).toHaveBeenCalledTimes(1);
    expect(asyncQueryDeleteMock).toHaveBeenCalledWith({ id: 'QUERY-ID' });
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

    asyncQueryMock.mockResolvedValueOnce(mockSubmitResponse);
    asyncQueryGetMock.mockResolvedValueOnce(mockPollResponse);

    const waitForPerformEsql = performEsqlRequest({
      esClient,
      requestBody,
      requestQueryParams,
      shouldStopExecution,
    });

    await jest.advanceTimersByTimeAsync(15000);

    const result = await waitForPerformEsql;

    expect(result).toEqual(mockPollResponse);
    expect(asyncQueryMock).toHaveBeenCalledTimes(1);
    expect(asyncQueryMock).toHaveBeenCalledWith({
      ...requestBody,
      ...requestQueryParams,
    });
    expect(asyncQueryGetMock).toHaveBeenCalledTimes(1);
    expect(asyncQueryGetMock).toHaveBeenCalledWith({ id: 'QUERY-ID' });
    expect(asyncQueryDeleteMock).toHaveBeenCalledTimes(1);
    expect(asyncQueryDeleteMock).toHaveBeenCalledWith({ id: 'QUERY-ID' });
  });

  it('throws an error if execution is cancelled', async () => {
    const mockSubmitResponse = {
      id: 'QUERY-ID',
      is_running: true,
      columns: [],
      values: [],
    };

    asyncQueryMock.mockResolvedValue(mockSubmitResponse);
    asyncQueryGetMock.mockResolvedValue(mockSubmitResponse);
    shouldStopExecution.mockReturnValue(true);
    const ruleExecutionLogger = { error: jest.fn(), debug: jest.fn() };

    const waitForPerformEsql = performEsqlRequest({
      esClient,
      requestBody,
      requestQueryParams,
      shouldStopExecution,
      ruleExecutionLogger: ruleExecutionLogger as unknown as IRuleExecutionLogForExecutors,
    }).catch((error) => {
      expect(error.message).toBe('Rule execution cancelled due to timeout');
    });

    await jest.advanceTimersByTimeAsync(15000);
    await waitForPerformEsql;
    expect(ruleExecutionLogger.error).toHaveBeenCalledWith(
      'Error while performing ES|QL search: Rule execution cancelled due to timeout'
    );
    expect.assertions(2);
  });

  it('logs the abort error with its prefix and rethrows it when the framework cancels the request', async () => {
    // Thrown by the Alerting Framework's scoped cluster client when Task Manager cancels the run
    asyncQueryMock.mockRejectedValueOnce(
      new Error('ES|QL search has been aborted due to cancelled execution')
    );
    const ruleExecutionLogger = { error: jest.fn(), debug: jest.fn() };

    await expect(
      performEsqlRequest({
        esClient,
        requestBody,
        requestQueryParams,
        shouldStopExecution,
        ruleExecutionLogger: ruleExecutionLogger as unknown as IRuleExecutionLogForExecutors,
      })
    ).rejects.toThrow('ES|QL search has been aborted due to cancelled execution');

    expect(ruleExecutionLogger.error).toHaveBeenCalledWith(
      'Error while performing ES|QL search: ES|QL search has been aborted due to cancelled execution'
    );
    expect(asyncQueryDeleteMock).not.toHaveBeenCalled();
  });

  it('deletes query if error happens during polling', async () => {
    const mockSubmitResponse = {
      id: 'QUERY-ID',
      is_running: true,
      columns: [],
      values: [],
    };

    asyncQueryMock.mockResolvedValueOnce(mockSubmitResponse);
    asyncQueryGetMock.mockRejectedValueOnce(new Error('Test error'));

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

    expect(asyncQueryDeleteMock).toHaveBeenCalledWith({ id: 'QUERY-ID' });

    expect.assertions(2);
  });
});
