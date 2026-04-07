/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import { resolveCappedTimeWindow } from './logs_cap_probe';

jest.mock('../../infra/elasticsearch/esql', () => ({
  executeEsqlQuery: jest.fn(),
}));

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;

describe('resolveCappedTimeWindow', () => {
  const esClient = {} as ElasticsearchClient;
  const baseParams = {
    esClient,
    indexPatterns: ['logs-*'],
    type: 'host' as const,
    fromDateISO: '2024-01-01T00:00:00.000Z',
    toDateISO: '2024-01-02T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip the probe when maxLogsPerCycle is below 1', async () => {
    const result = await resolveCappedTimeWindow({ ...baseParams, maxLogsPerCycle: 0 });
    expect(result).toBe(baseParams.toDateISO);
    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
  });

  it('should skip the probe when indexPatterns is empty', async () => {
    const result = await resolveCappedTimeWindow({
      ...baseParams,
      indexPatterns: [],
      maxLogsPerCycle: 100,
    });
    expect(result).toBe(baseParams.toDateISO);
    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
  });

  it('should return capped toDateISO when row_count equals max and cap_ts is set', async () => {
    const capTs = '2024-01-01T12:00:00.000Z';
    const response: ESQLSearchResponse = {
      columns: [
        { name: 'row_count', type: 'long' },
        { name: 'cap_ts', type: 'date' },
      ],
      values: [[10, capTs]],
    };
    mockExecuteEsqlQuery.mockResolvedValue(response);

    const maxLogsPerCycle = 10;
    const result = await resolveCappedTimeWindow({ ...baseParams, maxLogsPerCycle });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(result).toBe('2024-01-01T12:00:00.000Z');
  });

  it('should not cap when row_count is less than max', async () => {
    const response: ESQLSearchResponse = {
      columns: [
        { name: 'row_count', type: 'long' },
        { name: 'cap_ts', type: 'date' },
      ],
      values: [[9, '2024-01-01T12:00:00.000Z']],
    };
    mockExecuteEsqlQuery.mockResolvedValue(response);

    const result = await resolveCappedTimeWindow({ ...baseParams, maxLogsPerCycle: 10 });

    expect(result).toBe(baseParams.toDateISO);
  });
});
