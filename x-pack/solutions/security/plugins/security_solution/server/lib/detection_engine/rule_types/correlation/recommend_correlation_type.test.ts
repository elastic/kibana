/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlResult } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { recommendCorrelationType } from './recommend_correlation_type';

const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;

const makeEsqlResponse = (
  columns: Array<{ name: string; type: string }>,
  values: unknown[][]
): EsqlEsqlResult =>
  ({
    columns,
    values,
  } as unknown as EsqlEsqlResult);

const defaultConfig = {
  rules: ['rule-1', 'rule-2'],
  groupByFields: ['host.name'],
  timespan: '5m',
  spaceId: 'default',
};

describe('recommendCorrelationType', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('event_count recommendation', () => {
    it('recommends event_count when only 1 rule has alerts', async () => {
      esClient.esql.query
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [
              { name: 'alert_count', type: 'long' },
              { name: 'kibana.alert.rule.uuid', type: 'keyword' },
            ],
            [[25, 'rule-1']]
          )
        )
        .mockResolvedValueOnce(
          makeEsqlResponse([{ name: 'host.name_cardinality', type: 'long' }], [[10]])
        )
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [{ name: '@timestamp', type: 'date' }],
            [
              ['2024-01-01T00:00:00.000Z'],
              ['2024-01-01T00:01:00.000Z'],
              ['2024-01-01T00:02:00.000Z'],
            ]
          )
        );

      const result = await recommendCorrelationType(esClient, defaultConfig);

      expect(result.type).toBe('event_count');
      expect(result.confidence).toBe('medium');
      expect(result.stats.alertCountPerRule).toEqual({ 'rule-1': 25 });
    });

    it('recommends event_count with low confidence when no alerts found', async () => {
      esClient.esql.query
        .mockResolvedValueOnce(makeEsqlResponse([], []))
        .mockResolvedValueOnce(makeEsqlResponse([], []))
        .mockResolvedValueOnce(makeEsqlResponse([], []));

      const result = await recommendCorrelationType(esClient, defaultConfig);

      expect(result.type).toBe('event_count');
      expect(result.confidence).toBe('low');
      expect(result.reason).toContain('No alerts found');
    });
  });

  describe('value_count recommendation', () => {
    it('recommends value_count when group-by field has high cardinality (>100)', async () => {
      esClient.esql.query
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [
              { name: 'alert_count', type: 'long' },
              { name: 'kibana.alert.rule.uuid', type: 'keyword' },
            ],
            [
              [50, 'rule-1'],
              [30, 'rule-2'],
            ]
          )
        )
        .mockResolvedValueOnce(
          makeEsqlResponse([{ name: 'host.name_cardinality', type: 'long' }], [[150]])
        )
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [{ name: '@timestamp', type: 'date' }],
            [['2024-01-01T00:00:00.000Z'], ['2024-01-01T00:00:30.000Z']]
          )
        );

      const result = await recommendCorrelationType(esClient, defaultConfig);

      expect(result.type).toBe('value_count');
      expect(result.confidence).toBe('high');
      expect(result.stats.groupByCardinality).toEqual({ 'host.name': 150 });
    });
  });

  describe('temporal recommendation', () => {
    it('recommends temporal with high confidence when 2 rules have temporally close alerts', async () => {
      esClient.esql.query
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [
              { name: 'alert_count', type: 'long' },
              { name: 'kibana.alert.rule.uuid', type: 'keyword' },
            ],
            [
              [20, 'rule-1'],
              [15, 'rule-2'],
            ]
          )
        )
        .mockResolvedValueOnce(
          makeEsqlResponse([{ name: 'host.name_cardinality', type: 'long' }], [[5]])
        )
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [{ name: '@timestamp', type: 'date' }],
            [
              ['2024-01-01T00:00:00.000Z'],
              ['2024-01-01T00:00:10.000Z'],
              ['2024-01-01T00:00:20.000Z'],
              ['2024-01-01T00:00:30.000Z'],
            ]
          )
        );

      const result = await recommendCorrelationType(esClient, defaultConfig);

      expect(result.type).toBe('temporal');
      expect(result.confidence).toBe('high');
      expect(result.stats.alertCountPerRule).toEqual({ 'rule-1': 20, 'rule-2': 15 });
    });

    it('recommends temporal with low confidence when 2 rules have alerts but not temporally close', async () => {
      esClient.esql.query
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [
              { name: 'alert_count', type: 'long' },
              { name: 'kibana.alert.rule.uuid', type: 'keyword' },
            ],
            [
              [5, 'rule-1'],
              [3, 'rule-2'],
            ]
          )
        )
        .mockResolvedValueOnce(
          makeEsqlResponse([{ name: 'host.name_cardinality', type: 'long' }], [[10]])
        )
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [{ name: '@timestamp', type: 'date' }],
            [['2024-01-01T00:00:00.000Z'], ['2024-01-01T00:04:00.000Z']]
          )
        );

      const result = await recommendCorrelationType(esClient, defaultConfig);

      expect(result.type).toBe('temporal');
      expect(result.confidence).toBe('low');
    });
  });

  describe('temporal_ordered recommendation', () => {
    it('recommends temporal_ordered with high confidence when 3+ rules have temporally close alerts', async () => {
      const config = {
        ...defaultConfig,
        rules: ['rule-1', 'rule-2', 'rule-3'],
      };

      esClient.esql.query
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [
              { name: 'alert_count', type: 'long' },
              { name: 'kibana.alert.rule.uuid', type: 'keyword' },
            ],
            [
              [10, 'rule-1'],
              [8, 'rule-2'],
              [6, 'rule-3'],
            ]
          )
        )
        .mockResolvedValueOnce(
          makeEsqlResponse([{ name: 'host.name_cardinality', type: 'long' }], [[12]])
        )
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [{ name: '@timestamp', type: 'date' }],
            [
              ['2024-01-01T00:00:00.000Z'],
              ['2024-01-01T00:00:15.000Z'],
              ['2024-01-01T00:00:30.000Z'],
              ['2024-01-01T00:00:45.000Z'],
              ['2024-01-01T00:01:00.000Z'],
            ]
          )
        );

      const result = await recommendCorrelationType(esClient, config);

      expect(result.type).toBe('temporal_ordered');
      expect(result.confidence).toBe('high');
      expect(result.reason).toContain('attack chain');
    });

    it('recommends temporal_ordered with medium confidence when 3+ rules but no temporal proximity', async () => {
      const config = {
        ...defaultConfig,
        rules: ['rule-1', 'rule-2', 'rule-3'],
      };

      esClient.esql.query
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [
              { name: 'alert_count', type: 'long' },
              { name: 'kibana.alert.rule.uuid', type: 'keyword' },
            ],
            [
              [10, 'rule-1'],
              [8, 'rule-2'],
              [6, 'rule-3'],
            ]
          )
        )
        .mockResolvedValueOnce(
          makeEsqlResponse([{ name: 'host.name_cardinality', type: 'long' }], [[5]])
        )
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [{ name: '@timestamp', type: 'date' }],
            [['2024-01-01T00:00:00.000Z'], ['2024-01-01T00:04:00.000Z']]
          )
        );

      const result = await recommendCorrelationType(esClient, config);

      expect(result.type).toBe('temporal_ordered');
      expect(result.confidence).toBe('medium');
    });
  });

  describe('stats in response', () => {
    it('includes alertCountPerRule stats', async () => {
      esClient.esql.query
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [
              { name: 'alert_count', type: 'long' },
              { name: 'kibana.alert.rule.uuid', type: 'keyword' },
            ],
            [
              [42, 'rule-1'],
              [17, 'rule-2'],
            ]
          )
        )
        .mockResolvedValueOnce(
          makeEsqlResponse([{ name: 'host.name_cardinality', type: 'long' }], [[20]])
        )
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [{ name: '@timestamp', type: 'date' }],
            [
              ['2024-01-01T00:00:00.000Z'],
              ['2024-01-01T00:00:05.000Z'],
              ['2024-01-01T00:00:10.000Z'],
            ]
          )
        );

      const result = await recommendCorrelationType(esClient, defaultConfig);

      expect(result.stats.alertCountPerRule).toEqual({
        'rule-1': 42,
        'rule-2': 17,
      });
      expect(result.stats.groupByCardinality).toEqual({ 'host.name': 20 });
      expect(result.stats.avgTimeBetweenAlerts).toBe(5000);
    });

    it('returns null avgTimeBetweenAlerts when insufficient timestamps', async () => {
      esClient.esql.query
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [
              { name: 'alert_count', type: 'long' },
              { name: 'kibana.alert.rule.uuid', type: 'keyword' },
            ],
            [[5, 'rule-1']]
          )
        )
        .mockResolvedValueOnce(
          makeEsqlResponse([{ name: 'host.name_cardinality', type: 'long' }], [[3]])
        )
        .mockResolvedValueOnce(
          makeEsqlResponse([{ name: '@timestamp', type: 'date' }], [['2024-01-01T00:00:00.000Z']])
        );

      const result = await recommendCorrelationType(esClient, defaultConfig);

      expect(result.stats.avgTimeBetweenAlerts).toBeNull();
    });
  });

  describe('multiple group-by fields', () => {
    it('queries cardinality for all group-by fields', async () => {
      const config = {
        ...defaultConfig,
        groupByFields: ['host.name', 'user.name', 'source.ip'],
      };

      esClient.esql.query
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [
              { name: 'alert_count', type: 'long' },
              { name: 'kibana.alert.rule.uuid', type: 'keyword' },
            ],
            [[10, 'rule-1']]
          )
        )
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [
              { name: 'host.name_cardinality', type: 'long' },
              { name: 'user.name_cardinality', type: 'long' },
              { name: 'source.ip_cardinality', type: 'long' },
            ],
            [[15, 8, 200]]
          )
        )
        .mockResolvedValueOnce(
          makeEsqlResponse(
            [{ name: '@timestamp', type: 'date' }],
            [['2024-01-01T00:00:00.000Z'], ['2024-01-01T00:01:00.000Z']]
          )
        );

      const result = await recommendCorrelationType(esClient, config);

      expect(result.type).toBe('value_count');
      expect(result.stats.groupByCardinality).toEqual({
        'host.name': 15,
        'user.name': 8,
        'source.ip': 200,
      });
    });
  });

  describe('timespan parsing', () => {
    it('handles various timespan formats', async () => {
      esClient.esql.query.mockResolvedValue(makeEsqlResponse([], []));

      for (const timespan of ['30s', '5m', '1h', '7d']) {
        await recommendCorrelationType(esClient, { ...defaultConfig, timespan });
      }

      expect(esClient.esql.query).toHaveBeenCalledTimes(12); // 3 queries * 4 timespans
    });
  });
});
