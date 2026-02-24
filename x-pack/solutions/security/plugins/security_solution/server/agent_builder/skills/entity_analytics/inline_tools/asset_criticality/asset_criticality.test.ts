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
      const query = `FROM asset-criticality-index
  | WHERE criticality_level IS NOT NULL AND criticality_level != "deleted" AND id_field == "host.name"
  | EVAL numerical_level = CASE(criticality_level == "low_impact", 1, criticality_level == "medium_impact", 2, criticality_level == "high_impact", 3, criticality_level == "extreme_impact", 4)
  | KEEP @timestamp, criticality_level, id_field, id_value, numerical_level
  | SORT numerical_level DESC, id_value ASC
  | LIMIT 10`;
      const response = {
        took: 333,
        is_partial: false,
        completion_time_in_millis: 1771356298186,
        documents_found: 1,
        values_loaded: 4,
        start_time_in_millis: 1771356297853,
        expiration_time_in_millis: 1771788298033,
        columns: [
          {
            name: '@timestamp',
            type: 'date',
          },
          {
            name: 'criticality_level',
            type: 'keyword',
          },
          {
            name: 'id_field',
            type: 'keyword',
          },
          {
            name: 'id_value',
            type: 'keyword',
          },
          {
            name: 'numerical_level',
            type: 'integer',
          },
        ],
        values: [
          ['2026-02-17T19:20:00.792Z', 'high_impact', 'host.name', 'unfortunate-cruelty.name', 3],
        ],
      };

      esClient.esql.query.mockResolvedValue(response);

      const result = await queryAssetCriticality({ entityType: 'host', index, esClient });

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
      await queryAssetCriticality({ entityType: 'generic', index, esClient, limit: 20 });

      expect(esClient.esql.query).toHaveBeenCalledWith({
        query: `FROM asset-criticality-index
  | WHERE criticality_level IS NOT NULL AND criticality_level != "deleted"
  | EVAL numerical_level = CASE(criticality_level == "low_impact", 1, criticality_level == "medium_impact", 2, criticality_level == "high_impact", 3, criticality_level == "extreme_impact", 4)
  | KEEP @timestamp, criticality_level, id_field, id_value, numerical_level
  | SORT numerical_level DESC, id_value ASC
  | LIMIT 20`,
        drop_null_columns: true,
      });
    });

    it('should use entityId if defined', async () => {
      await queryAssetCriticality({ entityType: 'user', index, esClient, entityId: 'user-123' });

      expect(esClient.esql.query).toHaveBeenCalledWith({
        query: `FROM asset-criticality-index
  | WHERE criticality_level IS NOT NULL AND criticality_level != "deleted" AND id_value == "user-123" AND id_field == "user.name"
  | EVAL numerical_level = CASE(criticality_level == "low_impact", 1, criticality_level == "medium_impact", 2, criticality_level == "high_impact", 3, criticality_level == "extreme_impact", 4)
  | KEEP @timestamp, criticality_level, id_field, id_value, numerical_level
  | SORT numerical_level DESC, id_value ASC
  | LIMIT 10`,
        drop_null_columns: true,
      });
    });
  });
});
