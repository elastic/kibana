/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { queryRisks, queryRisksOverInterval } from './risk_score';
import { ToolResultType } from '@kbn/agent-builder-common';

const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
const latestIndex = 'risk-score-latest';
const timeseriesIndex = 'risk-score-timeseries';

describe('QUERY_FNS', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('queryRisks', () => {
    it('should return null if interval is provided', async () => {
      const result = await queryRisks({
        entityType: 'host',
        latestIndex,
        timeseriesIndex,
        esClient,
        interval: '1d',
      });
      expect(result).toBeNull();
    });

    it('should query and format response correctly for hosts', async () => {
      const query = `FROM risk-score-latest
  | WHERE host.risk.calculated_score_norm IS NOT NULL
  | KEEP @timestamp, host.risk.calculated_score_norm, host.risk.calculated_level, host.risk.id_value, host.risk.id_field
  | SORT host.risk.calculated_score_norm DESC
  | LIMIT 10`;
      const response = {
        took: 8,
        is_partial: false,
        completion_time_in_millis: 1770937345947,
        documents_found: 10,
        values_loaded: 50,
        start_time_in_millis: 1770937345939,
        expiration_time_in_millis: 1771369345917,
        columns: [
          {
            name: '@timestamp',
            type: 'date',
          },
          {
            name: 'host.risk.calculated_score_norm',
            type: 'double',
          },
          {
            name: 'host.risk.calculated_level',
            type: 'keyword',
          },
          {
            name: 'host.risk.id_field',
            type: 'keyword',
          },
          {
            name: 'host.risk.id_value',
            type: 'keyword',
          },
        ],
        values: [
          ['2026-02-12T22:22:18.629Z', 91.25021362304688, 'Critical', 'host.name', 'host-1'],
          [
            '2026-02-12T22:22:18.629Z',
            73.57698822021484,
            'High',
            'host.name',
            'quarterly-caption.net',
          ],
          [
            '2026-02-12T22:22:18.629Z',
            73.57698822021484,
            'High',
            'host.name',
            'second-hand-decryption.name',
          ],
          [
            '2026-02-12T22:22:18.629Z',
            73.57698822021484,
            'High',
            'host.name',
            'ignorant-cleaner.org',
          ],
          ['2026-02-12T22:22:18.629Z', 73.57698822021484, 'High', 'host.name', 'junior-hovel.net'],
        ],
      };

      esClient.esql.query.mockResolvedValue(response);

      const result = await queryRisks({
        entityType: 'host',
        latestIndex,
        timeseriesIndex,
        esClient,
      });

      expect(esClient.esql.query).toHaveBeenCalledWith({ query, drop_null_columns: true });

      expect(result).toEqual([
        {
          tool_result_id: expect.any(String),
          type: ToolResultType.esqlResults,
          data: { query, columns: response.columns, values: response.values },
        },
      ]);
    });

    it('should query and format response correctly for users', async () => {
      const query = `FROM risk-score-latest
  | WHERE user.risk.calculated_score_norm IS NOT NULL
  | KEEP @timestamp, user.risk.calculated_score_norm, user.risk.calculated_level, user.risk.id_value, user.risk.id_field
  | SORT user.risk.calculated_score_norm DESC
  | LIMIT 10`;
      const response = {
        took: 8,
        is_partial: false,
        completion_time_in_millis: 1770937345947,
        documents_found: 10,
        values_loaded: 50,
        start_time_in_millis: 1770937345939,
        expiration_time_in_millis: 1771369345917,
        columns: [
          {
            name: '@timestamp',
            type: 'date',
          },
          {
            name: 'user.risk.calculated_score_norm',
            type: 'double',
          },
          {
            name: 'user.risk.calculated_level',
            type: 'keyword',
          },
          {
            name: 'user.risk.id_field',
            type: 'keyword',
          },
          {
            name: 'user.risk.id_value',
            type: 'keyword',
          },
        ],
        values: [
          ['2026-02-12T22:22:18.629Z', 91.25021362304688, 'Critical', 'host.name', 'user-1'],
          ['2026-02-12T22:22:18.629Z', 73.57698822021484, 'High', 'host.name', 'user-2'],
          ['2026-02-12T22:22:18.629Z', 73.57698822021484, 'High', 'host.name', 'user-3'],
        ],
      };

      esClient.esql.query.mockResolvedValue(response);

      const result = await queryRisks({
        entityType: 'user',
        latestIndex,
        timeseriesIndex,
        esClient,
      });

      expect(esClient.esql.query).toHaveBeenCalledWith({ query, drop_null_columns: true });

      expect(result).toEqual([
        {
          tool_result_id: expect.any(String),
          type: ToolResultType.esqlResults,
          data: { query, columns: response.columns, values: response.values },
        },
      ]);
    });

    it('should use limit if defined', async () => {
      await queryRisks({
        entityType: 'user',
        latestIndex,
        timeseriesIndex,
        esClient,
        limit: 20,
      });

      expect(esClient.esql.query).toHaveBeenCalledWith({
        query: `FROM risk-score-latest
  | WHERE user.risk.calculated_score_norm IS NOT NULL
  | KEEP @timestamp, user.risk.calculated_score_norm, user.risk.calculated_level, user.risk.id_value, user.risk.id_field
  | SORT user.risk.calculated_score_norm DESC
  | LIMIT 20`,
        drop_null_columns: true,
      });
    });

    it('should use entityId if defined', async () => {
      await queryRisks({
        entityType: 'user',
        latestIndex,
        timeseriesIndex,
        esClient,
        entityId: 'user-123',
      });

      expect(esClient.esql.query).toHaveBeenCalledWith({
        query: `FROM risk-score-latest
  | WHERE user.risk.calculated_score_norm IS NOT NULL AND user.risk.id_value == \"user-123\"
  | KEEP @timestamp, user.risk.calculated_score_norm, user.risk.calculated_level, user.risk.id_value, user.risk.id_field
  | SORT user.risk.calculated_score_norm DESC
  | LIMIT 10`,
        drop_null_columns: true,
      });
    });
  });

  describe('queryRisksOverInterval', () => {
    it('should return null if interval is not provided', async () => {
      const result = await queryRisksOverInterval({
        entityType: 'host',
        latestIndex,
        timeseriesIndex,
        esClient,
      });
      expect(result).toBeNull();
    });

    it('should query and format response correctly for hosts', async () => {
      const query = `FROM risk-score-timeseries
      | WHERE host.risk.calculated_score_norm IS NOT NULL AND @timestamp >= NOW() - 1 day
      | STATS latest_score = LAST(host.risk.calculated_score_norm, @timestamp), earliest_score = FIRST(host.risk.calculated_score_norm, @timestamp), calculated_level = LAST(host.risk.calculated_level, @timestamp) BY host.risk.id_value
      | EVAL risk_score_change = latest_score - earliest_score
      | EVAL significant_increase = CASE(risk_score_change > 20, true,risk_score_change <= 20, false)
      | SORT risk_score_change DESC
      | LIMIT 10`;
      const response = {
        took: 8,
        is_partial: false,
        completion_time_in_millis: 1770937689941,
        documents_found: 22,
        values_loaded: 88,
        start_time_in_millis: 1770937689933,
        expiration_time_in_millis: 1771369689750,
        columns: [
          {
            name: 'latest_score',
            type: 'double',
          },
          {
            name: 'earliest_score',
            type: 'double',
          },
          {
            name: 'calculated_level',
            type: 'keyword',
          },
          {
            name: 'host.risk.id_value',
            type: 'keyword',
          },
          {
            name: 'risk_score_change',
            type: 'double',
          },
          {
            name: 'significant_increase',
            type: 'boolean',
          },
        ],
        values: [
          [
            73.57698822021484,
            63.813201904296875,
            'High',
            'excellent-alliance.org',
            9.763786315917969,
            false,
          ],
          [
            73.57698822021484,
            63.813201904296875,
            'High',
            'quarterly-caption.net',
            9.763786315917969,
            false,
          ],
          [
            73.57698822021484,
            63.813201904296875,
            'High',
            'stylish-space.info',
            9.763786315917969,
            false,
          ],
          [
            73.57698822021484,
            63.813201904296875,
            'High',
            'ignorant-cleaner.org',
            9.763786315917969,
            false,
          ],
          [
            73.57698822021484,
            63.813201904296875,
            'High',
            'junior-hovel.net',
            9.763786315917969,
            false,
          ],
        ],
      };

      esClient.esql.query.mockResolvedValue(response);

      const result = await queryRisksOverInterval({
        entityType: 'host',
        latestIndex,
        timeseriesIndex,
        esClient,
        interval: '1d',
      });

      expect(esClient.esql.query).toHaveBeenCalledWith({ query, drop_null_columns: true });

      expect(result).toEqual([
        {
          tool_result_id: expect.any(String),
          type: ToolResultType.esqlResults,
          data: { query, columns: response.columns, values: response.values },
        },
      ]);
    });

    it('should query and format response correctly for users', async () => {
      const query = `FROM risk-score-timeseries
      | WHERE user.risk.calculated_score_norm IS NOT NULL AND @timestamp >= NOW() - 30 days
      | STATS latest_score = LAST(user.risk.calculated_score_norm, @timestamp), earliest_score = FIRST(user.risk.calculated_score_norm, @timestamp), calculated_level = LAST(user.risk.calculated_level, @timestamp) BY user.risk.id_value
      | EVAL risk_score_change = latest_score - earliest_score
      | EVAL significant_increase = CASE(risk_score_change > 20, true,risk_score_change <= 20, false)
      | SORT risk_score_change DESC
      | LIMIT 10`;
      const response = {
        took: 8,
        is_partial: false,
        completion_time_in_millis: 1770937689941,
        documents_found: 22,
        values_loaded: 88,
        start_time_in_millis: 1770937689933,
        expiration_time_in_millis: 1771369689750,
        columns: [
          {
            name: 'latest_score',
            type: 'double',
          },
          {
            name: 'earliest_score',
            type: 'double',
          },
          {
            name: 'calculated_level',
            type: 'keyword',
          },
          {
            name: 'user.risk.id_value',
            type: 'keyword',
          },
          {
            name: 'risk_score_change',
            type: 'double',
          },
          {
            name: 'significant_increase',
            type: 'boolean',
          },
        ],
        values: [
          [73.57698822021484, 63.813201904296875, 'High', 'user-A', 9.763786315917969, false],
          [73.57698822021484, 63.813201904296875, 'High', 'user-B', 9.763786315917969, false],
        ],
      };

      esClient.esql.query.mockResolvedValue(response);

      const result = await queryRisksOverInterval({
        entityType: 'user',
        latestIndex,
        timeseriesIndex,
        esClient,
        interval: '30d',
      });

      expect(esClient.esql.query).toHaveBeenCalledWith({ query, drop_null_columns: true });

      expect(result).toEqual([
        {
          tool_result_id: expect.any(String),
          type: ToolResultType.esqlResults,
          data: { query, columns: response.columns, values: response.values },
        },
      ]);
    });

    it('should use limit if defined', async () => {
      await queryRisksOverInterval({
        entityType: 'user',
        latestIndex,
        timeseriesIndex,
        esClient,
        limit: 13,
        interval: '12h',
      });

      expect(esClient.esql.query).toHaveBeenCalledWith({
        query: `FROM risk-score-timeseries
      | WHERE user.risk.calculated_score_norm IS NOT NULL AND @timestamp >= NOW() - 12 hours
      | STATS latest_score = LAST(user.risk.calculated_score_norm, @timestamp), earliest_score = FIRST(user.risk.calculated_score_norm, @timestamp), calculated_level = LAST(user.risk.calculated_level, @timestamp) BY user.risk.id_value
      | EVAL risk_score_change = latest_score - earliest_score
      | EVAL significant_increase = CASE(risk_score_change > 20, true,risk_score_change <= 20, false)
      | SORT risk_score_change DESC
      | LIMIT 13`,
        drop_null_columns: true,
      });
    });

    it('should use entityId if defined', async () => {
      await queryRisksOverInterval({
        entityType: 'user',
        latestIndex,
        timeseriesIndex,
        esClient,
        interval: '12h',
        entityId: 'user-123',
      });

      expect(esClient.esql.query).toHaveBeenCalledWith({
        query: `FROM risk-score-timeseries
      | WHERE user.risk.calculated_score_norm IS NOT NULL AND @timestamp >= NOW() - 12 hours AND user.risk.id_value == \"user-123\"
      | STATS latest_score = LAST(user.risk.calculated_score_norm, @timestamp), earliest_score = FIRST(user.risk.calculated_score_norm, @timestamp), calculated_level = LAST(user.risk.calculated_level, @timestamp) BY user.risk.id_value
      | EVAL risk_score_change = latest_score - earliest_score
      | EVAL significant_increase = CASE(risk_score_change > 20, true,risk_score_change <= 20, false)
      | SORT risk_score_change DESC
      | LIMIT 10`,
        drop_null_columns: true,
      });
    });
  });
});
