/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { queryAssetCriticality } from './asset_criticality';
import { ToolResultType } from '@kbn/agent-builder-common';

const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
const index = 'asset-criticality-index';

describe('QUERY_FNS', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('queryAssetCriticality', () => {
    it('should query and format response correctly', async () => {
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

      const result = await queryTopRisks({
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

      const result = await queryTopRisks({
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
      await queryTopRisks({
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
  });
});
