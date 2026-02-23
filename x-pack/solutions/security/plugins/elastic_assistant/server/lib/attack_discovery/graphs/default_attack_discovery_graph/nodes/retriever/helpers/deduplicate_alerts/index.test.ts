/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { getOpenAndAcknowledgedAlertsQuery } from '@kbn/elastic-assistant-common';

import { deduplicateAlerts, getDeduplicatedAlertHits, getAlertIdCorrelationMap } from '.';
import type { DeduplicationConfig } from './types';

jest.mock('@kbn/elastic-assistant-common', () => {
  const original = jest.requireActual('@kbn/elastic-assistant-common');
  return {
    ...original,
    getOpenAndAcknowledgedAlertsQuery: jest.fn().mockReturnValue({
      index: ['.alerts-security.alerts-default'],
      query: { bool: { filter: [] } },
      size: 0,
    }),
  };
});

const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();

describe('deduplicateAlerts', () => {
  const alertsIndexPattern = '.alerts-security.alerts-default';
  const defaultConfig: DeduplicationConfig = {
    correlationFields: ['file.hash.sha256', 'kibana.alert.rule.name', 'host.name'],
    maxGroups: 500,
    maxAlertsPerGroup: 100,
  };

  const mockAggregationResponse = {
    took: 10,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 0 }, hits: [] },
    aggregations: {
      total_alerts: { value: 5 },
      alert_groups: {
        buckets: [
          {
            key: 'hash1|rule1|host1',
            doc_count: 3,
            max_risk_score: { value: 99 },
            top_alert: {
              hits: {
                hits: [
                  {
                    _index: '.alerts-security.alerts-default',
                    _id: 'alert-1',
                    fields: {
                      'kibana.alert.risk_score': [99],
                      'file.hash.sha256': ['hash1'],
                      'host.name': ['host1'],
                    },
                  },
                ],
              },
            },
            alert_ids: {
              buckets: [
                { key: 'alert-1', doc_count: 1 },
                { key: 'alert-2', doc_count: 1 },
                { key: 'alert-3', doc_count: 1 },
              ],
            },
            field_file_hash_sha256: {
              buckets: [{ key: 'hash1', doc_count: 3 }],
            },
            field_kibana_alert_rule_name: {
              buckets: [{ key: 'rule1', doc_count: 3 }],
            },
            field_host_name: {
              buckets: [{ key: 'host1', doc_count: 3 }],
            },
          },
          {
            key: 'hash2|rule2|host2',
            doc_count: 2,
            max_risk_score: { value: 75 },
            top_alert: {
              hits: {
                hits: [
                  {
                    _index: '.alerts-security.alerts-default',
                    _id: 'alert-4',
                    fields: {
                      'kibana.alert.risk_score': [75],
                      'file.hash.sha256': ['hash2'],
                      'host.name': ['host2'],
                    },
                  },
                ],
              },
            },
            alert_ids: {
              buckets: [
                { key: 'alert-4', doc_count: 1 },
                { key: 'alert-5', doc_count: 1 },
              ],
            },
            field_file_hash_sha256: {
              buckets: [{ key: 'hash2', doc_count: 2 }],
            },
            field_kibana_alert_rule_name: {
              buckets: [{ key: 'rule2', doc_count: 2 }],
            },
            field_host_name: {
              buckets: [{ key: 'host2', doc_count: 2 }],
            },
          },
        ],
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient.search.mockResolvedValue(mockAggregationResponse as unknown as SearchResponse);
  });

  describe('deduplicateAlerts', () => {
    it('should return alert groups from ES aggregation', async () => {
      const result = await deduplicateAlerts({
        alertsIndexPattern,
        config: defaultConfig,
        esClient: mockEsClient,
        size: 100,
      });

      expect(result.alertGroups).toHaveLength(2);
      expect(result.totalOriginalAlerts).toBe(5);
      expect(result.uniqueGroupCount).toBe(2);
    });

    it('should calculate correct statistics', async () => {
      const result = await deduplicateAlerts({
        alertsIndexPattern,
        config: defaultConfig,
        esClient: mockEsClient,
        size: 100,
      });

      expect(result.stats.duplicatesRemoved).toBe(3); // 5 - 2
      expect(result.stats.reductionPercentage).toBe(60); // 3/5 * 100
      expect(result.stats.avgDuplicatesPerGroup).toBe(2.5); // 5/2
    });

    it('should preserve correlation values in alert groups', async () => {
      const result = await deduplicateAlerts({
        alertsIndexPattern,
        config: defaultConfig,
        esClient: mockEsClient,
        size: 100,
      });

      expect(result.alertGroups[0].correlationValues).toEqual({
        'file.hash.sha256': 'hash1',
        'kibana.alert.rule.name': 'rule1',
        'host.name': 'host1',
      });
    });

    it('should preserve all alert IDs for reference', async () => {
      const result = await deduplicateAlerts({
        alertsIndexPattern,
        config: defaultConfig,
        esClient: mockEsClient,
        size: 100,
      });

      expect(result.alertGroups[0].alertIds).toEqual(['alert-1', 'alert-2', 'alert-3']);
      expect(result.alertGroups[1].alertIds).toEqual(['alert-4', 'alert-5']);
    });

    it('should call getOpenAndAcknowledgedAlertsQuery with correct params', async () => {
      await deduplicateAlerts({
        alertsIndexPattern,
        config: defaultConfig,
        esClient: mockEsClient,
        filter: { term: { 'host.name': 'test' } },
        size: 100,
        start: 'now-24h',
        end: 'now',
      });

      expect(getOpenAndAcknowledgedAlertsQuery).toHaveBeenCalledWith({
        alertsIndexPattern,
        anonymizationFields: [],
        end: 'now',
        filter: { term: { 'host.name': 'test' } },
        size: 0,
        start: 'now-24h',
      });
    });

    it('should handle empty response', async () => {
      mockEsClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0 }, hits: [] },
        aggregations: {
          total_alerts: { value: 0 },
          alert_groups: { buckets: [] },
        },
      } as unknown as SearchResponse);

      const result = await deduplicateAlerts({
        alertsIndexPattern,
        config: defaultConfig,
        esClient: mockEsClient,
        size: 100,
      });

      expect(result.alertGroups).toHaveLength(0);
      expect(result.totalOriginalAlerts).toBe(0);
      expect(result.stats.duplicatesRemoved).toBe(0);
      expect(result.stats.reductionPercentage).toBe(0);
    });

    it('should handle missing aggregations gracefully', async () => {
      mockEsClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0 }, hits: [] },
      } as unknown as SearchResponse);

      const result = await deduplicateAlerts({
        alertsIndexPattern,
        config: defaultConfig,
        esClient: mockEsClient,
        size: 100,
      });

      expect(result.alertGroups).toHaveLength(0);
    });
  });

  describe('getDeduplicatedAlertHits', () => {
    it('should return representative alert hits', async () => {
      const result = await getDeduplicatedAlertHits({
        alertsIndexPattern,
        config: defaultConfig,
        esClient: mockEsClient,
        size: 100,
      });

      expect(result.hits).toHaveLength(2);
      expect(result.hits[0]._id).toBe('alert-1');
      expect(result.hits[1]._id).toBe('alert-4');
    });

    it('should include deduplication stats', async () => {
      const result = await getDeduplicatedAlertHits({
        alertsIndexPattern,
        config: defaultConfig,
        esClient: mockEsClient,
        size: 100,
      });

      expect(result.deduplicationStats.duplicatesRemoved).toBe(3);
      expect(result.totalOriginalAlerts).toBe(5);
    });

    it('should filter out groups without representative alerts', async () => {
      mockEsClient.search.mockResolvedValue({
        ...mockAggregationResponse,
        aggregations: {
          ...mockAggregationResponse.aggregations,
          alert_groups: {
            buckets: [
              {
                ...mockAggregationResponse.aggregations.alert_groups.buckets[0],
                top_alert: { hits: { hits: [] } }, // No representative alert
              },
              mockAggregationResponse.aggregations.alert_groups.buckets[1],
            ],
          },
        },
      } as unknown as SearchResponse);

      const result = await getDeduplicatedAlertHits({
        alertsIndexPattern,
        config: defaultConfig,
        esClient: mockEsClient,
        size: 100,
      });

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0]._id).toBe('alert-4');
    });
  });

  describe('getAlertIdCorrelationMap', () => {
    it('should return map from representative ID to all correlated IDs', async () => {
      const result = await getAlertIdCorrelationMap({
        alertsIndexPattern,
        config: defaultConfig,
        esClient: mockEsClient,
        size: 100,
      });

      expect(result.get('alert-1')).toEqual(['alert-1', 'alert-2', 'alert-3']);
      expect(result.get('alert-4')).toEqual(['alert-4', 'alert-5']);
    });

    it('should not include entries for groups without representative alerts', async () => {
      mockEsClient.search.mockResolvedValue({
        ...mockAggregationResponse,
        aggregations: {
          ...mockAggregationResponse.aggregations,
          alert_groups: {
            buckets: [
              {
                ...mockAggregationResponse.aggregations.alert_groups.buckets[0],
                top_alert: { hits: { hits: [] } },
              },
            ],
          },
        },
      } as unknown as SearchResponse);

      const result = await getAlertIdCorrelationMap({
        alertsIndexPattern,
        config: defaultConfig,
        esClient: mockEsClient,
        size: 100,
      });

      expect(result.size).toBe(0);
    });
  });
});
