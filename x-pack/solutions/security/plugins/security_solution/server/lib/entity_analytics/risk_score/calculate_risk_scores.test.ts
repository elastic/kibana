/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFiltersForEntityType, calculateRiskScores } from './calculate_risk_scores';
import type { EntityType } from '../../../../common/entity_analytics/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { assetCriticalityServiceMock } from '../asset_criticality/asset_criticality_service.mock';

import { allowedExperimentalValues } from '../../../../common';

describe('buildFiltersForEntityType', () => {
  const mockUserFilter = { term: { 'user.name': 'test-user' } };
  const mockExcludeAlertStatuses = ['closed'];
  const mockExcludeAlertTags = ['test-tag'];

  it('should build basic filters without custom filters', () => {
    const filters = buildFiltersForEntityType(
      'host' as EntityType,
      mockUserFilter,
      [],
      mockExcludeAlertStatuses,
      mockExcludeAlertTags
    );

    expect(filters).toHaveLength(4);
    expect(filters[0]).toEqual({ exists: { field: 'kibana.alert.risk_score' } });
    expect(filters[1]).toEqual(mockUserFilter);
    expect(filters[2]).toEqual({
      bool: { must_not: { terms: { 'kibana.alert.workflow_status': mockExcludeAlertStatuses } } },
    });
    expect(filters[3]).toEqual({
      bool: { must_not: { terms: { 'kibana.alert.workflow_tags': mockExcludeAlertTags } } },
    });
  });

  it('should apply entity-specific custom filters (exclusive)', () => {
    const customFilters = [
      { entity_types: ['host'], filter: 'agent.type: filebeat' },
      { entity_types: ['user'], filter: 'user.name: ubuntu' },
    ];

    const hostFilters = buildFiltersForEntityType(
      'host' as EntityType,
      mockUserFilter,
      customFilters,
      mockExcludeAlertStatuses,
      mockExcludeAlertTags
    );

    const userFilters = buildFiltersForEntityType(
      'user' as EntityType,
      mockUserFilter,
      customFilters,
      mockExcludeAlertStatuses,
      mockExcludeAlertTags
    );

    // Host filters should include the host-specific filter (must)
    expect(hostFilters).toHaveLength(5);
    expect(hostFilters[4]).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          must: expect.objectContaining({
            bool: expect.objectContaining({
              should: expect.arrayContaining([
                expect.objectContaining({
                  match: expect.objectContaining({
                    'agent.type': 'filebeat',
                  }),
                }),
              ]),
            }),
          }),
        }),
      })
    );

    // User filters should include the user-specific filter (must)
    expect(userFilters).toHaveLength(5);
    expect(userFilters[4]).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          must: expect.objectContaining({
            bool: expect.objectContaining({
              should: expect.arrayContaining([
                expect.objectContaining({
                  match: expect.objectContaining({
                    'user.name': 'ubuntu',
                  }),
                }),
              ]),
            }),
          }),
        }),
      })
    );
  });

  it('should apply multiple exclusive filters for the same entity type', () => {
    const customFilters = [
      { entity_types: ['host'], filter: 'agent.type: filebeat' },
      { entity_types: ['host'], filter: 'host.os.name: linux' },
    ];

    const filters = buildFiltersForEntityType(
      'host' as EntityType,
      mockUserFilter,
      customFilters,
      mockExcludeAlertStatuses,
      mockExcludeAlertTags
    );

    expect(filters).toHaveLength(6); // 4 base filters + 2 custom filters
  });

  it('should handle empty custom filters array', () => {
    const filters = buildFiltersForEntityType(
      'host' as EntityType,
      mockUserFilter,
      [],
      mockExcludeAlertStatuses,
      mockExcludeAlertTags
    );

    expect(filters).toHaveLength(4);
  });

  it('should handle invalid KQL filters gracefully', () => {
    const customFilters = [{ entity_types: ['host'], filter: 'invalid kql syntax {' }];

    const filters = buildFiltersForEntityType(
      'host' as EntityType,
      mockUserFilter,
      customFilters,
      mockExcludeAlertStatuses,
      mockExcludeAlertTags
    );

    // Should still return the base filters even if custom filter is invalid
    // Invalid KQL filters are silently ignored to prevent query failures
    expect(filters).toHaveLength(4); // Base filters + exclude filters, invalid custom filter is ignored
  });

  it('should handle empty user filter', () => {
    const filters = buildFiltersForEntityType(
      'host' as EntityType,
      {},
      [],
      mockExcludeAlertStatuses,
      mockExcludeAlertTags
    );

    expect(filters).toHaveLength(3); // No user filter added
    expect(filters[0]).toEqual({ exists: { field: 'kibana.alert.risk_score' } });
  });

  it('should handle empty exclude arrays', () => {
    const filters = buildFiltersForEntityType('host' as EntityType, mockUserFilter, [], [], []);

    expect(filters).toHaveLength(2); // Only base filters + user filter
    expect(filters[0]).toEqual({ exists: { field: 'kibana.alert.risk_score' } });
    expect(filters[1]).toEqual(mockUserFilter);
  });

  it('should handle service entity type', () => {
    const customFilters = [{ entity_types: ['service'], filter: 'service.name: nginx' }];

    const filters = buildFiltersForEntityType(
      'service' as EntityType,
      mockUserFilter,
      customFilters,
      mockExcludeAlertStatuses,
      mockExcludeAlertTags
    );

    expect(filters).toHaveLength(5);
    expect(filters[4]).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          must: expect.objectContaining({
            bool: expect.objectContaining({
              should: expect.arrayContaining([
                expect.objectContaining({
                  match: expect.objectContaining({
                    'service.name': 'nginx',
                  }),
                }),
              ]),
            }),
          }),
        }),
      })
    );
  });
});

describe('calculateRiskScores()', () => {
  let params: Parameters<typeof calculateRiskScores>[0];
  let esClient: ElasticsearchClient;
  let logger: Logger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    logger = loggingSystemMock.createLogger();
    params = {
      afterKeys: {},
      assetCriticalityService: assetCriticalityServiceMock.create(),
      esClient,
      logger,
      index: 'index',
      pageSize: 500,
      range: { start: 'now - 15d', end: 'now' },
      runtimeMappings: {},
      experimentalFeatures: allowedExperimentalValues,
    };
  });

  describe('inputs', () => {
    it('builds a filter on @timestamp based on the provided range', async () => {
      await calculateRiskScores(params);

      expect(
        (esClient.search as jest.Mock).mock.calls[0][0].query.function_score.query.bool.filter
      ).toEqual(
        expect.arrayContaining([
          {
            range: { '@timestamp': { gte: 'now - 15d', lt: 'now' } },
          },
        ])
      );
    });

    it('drops an empty object filter if specified by the caller', async () => {
      params.filter = {};
      await calculateRiskScores(params);

      expect(
        (esClient.search as jest.Mock).mock.calls[0][0].query.function_score.query.bool.filter
      ).toEqual(expect.not.arrayContaining([{}]));
    });
  });
});
