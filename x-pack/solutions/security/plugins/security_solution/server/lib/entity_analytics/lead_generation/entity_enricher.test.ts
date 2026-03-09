/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createEntityEnricher } from './entity_enricher';
import type { EntityEnricher, EnrichedLeadEntity } from './entity_enricher';
import type { LeadEntity } from './types';

const createMockLeadEntity = (
  type: string,
  name: string,
  overrides: Record<string, unknown> = {}
): LeadEntity => ({
  record: {
    '@timestamp': '2025-01-01T00:00:00Z',
    entity: {
      name,
      type,
      id: `${type}-${name}`,
      risk: { calculated_score_norm: 75, calculated_level: 'High' },
      attributes: { privileged: false },
      ...overrides.entity,
    },
    asset: { criticality: 'high_impact', ...overrides.asset },
    [type]: { name },
    ...overrides,
  } as never,
  type,
  name,
});

const createRiskHistoryResponse = (entityType: string, name: string) => ({
  aggregations: {
    by_entity: {
      buckets: [
        {
          key: name,
          scores_over_time: {
            buckets: [
              { key_as_string: '2025-01-01', avg_score: { value: 50 } },
              { key_as_string: '2025-01-02', avg_score: { value: 65 } },
              { key_as_string: '2025-01-03', avg_score: { value: 75 } },
            ],
          },
        },
      ],
    },
  },
});

const createAlertSummaryResponse = () => ({
  aggregations: {
    by_user: {
      buckets: [
        {
          key: 'alice',
          doc_count: 12,
          severity_breakdown: {
            buckets: [
              { key: 'critical', doc_count: 2 },
              { key: 'high', doc_count: 5 },
              { key: 'medium', doc_count: 5 },
            ],
          },
          distinct_rules: {
            buckets: [
              { key: 'Credential Access Rule', doc_count: 4 },
              { key: 'Lateral Movement Rule', doc_count: 3 },
            ],
          },
          top_alerts: {
            hits: {
              hits: [
                {
                  _id: 'alert-1',
                  fields: {
                    'kibana.alert.severity': ['critical'],
                    'kibana.alert.rule.name': ['Credential Access Rule'],
                    'kibana.alert.risk_score': [95],
                    '@timestamp': ['2025-01-03T12:00:00Z'],
                  },
                },
              ],
            },
          },
        },
      ],
    },
    by_host: { buckets: [] },
  },
});

describe('EntityEnricher', () => {
  let enricher: EntityEnricher;
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  const spaceId = 'default';

  beforeEach(() => {
    jest.clearAllMocks();
    enricher = createEntityEnricher({ esClient, logger, spaceId });
  });

  describe('enrich', () => {
    it('returns empty array for empty input', async () => {
      const result = await enricher.enrich([]);

      expect(result).toEqual([]);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('enriches entities with risk history, alerts, and attributes', async () => {
      const entity = createMockLeadEntity('user', 'alice');

      esClient.search
        .mockResolvedValueOnce(createRiskHistoryResponse('user', 'alice') as never)
        .mockResolvedValueOnce(createAlertSummaryResponse() as never);

      const result = await enricher.enrich([entity]);

      expect(result).toHaveLength(1);
      const enriched = result[0] as EnrichedLeadEntity;

      expect(enriched.enrichment.risk).toEqual({
        currentScore: 75,
        level: 'High',
        history: [
          { date: '2025-01-01', score: 50 },
          { date: '2025-01-02', score: 65 },
          { date: '2025-01-03', score: 75 },
        ],
      });

      expect(enriched.enrichment.alerts).toEqual({
        totalAlerts: 12,
        severityCounts: { critical: 2, high: 5, medium: 5 },
        topRuleNames: ['Credential Access Rule', 'Lateral Movement Rule'],
        topAlerts: [
          {
            id: 'alert-1',
            severity: 'critical',
            ruleName: 'Credential Access Rule',
            riskScore: 95,
            timestamp: '2025-01-03T12:00:00Z',
          },
        ],
      });

      expect(enriched.enrichment.isPrivileged).toBe(false);
      expect(enriched.enrichment.assetCriticality).toBe('high_impact');
    });

    it('detects privileged entities', async () => {
      const entity = createMockLeadEntity('user', 'admin', {
        entity: {
          name: 'admin',
          type: 'user',
          id: 'user-admin',
          risk: { calculated_score_norm: 80, calculated_level: 'High' },
          attributes: { privileged: true },
        },
      });

      esClient.search
        .mockResolvedValueOnce({ aggregations: { by_entity: { buckets: [] } } } as never)
        .mockResolvedValueOnce({
          aggregations: { by_user: { buckets: [] }, by_host: { buckets: [] } },
        } as never);

      const result = await enricher.enrich([entity]);

      expect(result[0].enrichment.isPrivileged).toBe(true);
    });

    it('handles entities without risk data', async () => {
      const entity: LeadEntity = {
        record: {
          '@timestamp': '2025-01-01',
          entity: { name: 'unknown-host', type: 'host', id: 'h1' },
          host: { name: 'unknown-host' },
        } as never,
        type: 'host',
        name: 'unknown-host',
      };

      esClient.search
        .mockResolvedValueOnce({ aggregations: { by_entity: { buckets: [] } } } as never)
        .mockResolvedValueOnce({
          aggregations: { by_user: { buckets: [] }, by_host: { buckets: [] } },
        } as never);

      const result = await enricher.enrich([entity]);

      expect(result[0].enrichment.risk).toBeUndefined();
      expect(result[0].enrichment.alerts).toBeUndefined();
      expect(result[0].enrichment.assetCriticality).toBeUndefined();
    });

    it('handles mixed entity types in a single batch', async () => {
      const user = createMockLeadEntity('user', 'alice');
      const host = createMockLeadEntity('host', 'server-01');

      // Promise.all interleaves calls: risk-user, then alerts + risk-host
      // concurrently. Mock in the order the ES client sees them.
      esClient.search
        .mockResolvedValueOnce({
          aggregations: {
            by_entity: {
              buckets: [
                {
                  key: 'alice',
                  scores_over_time: {
                    buckets: [{ key_as_string: '2025-01-01', avg_score: { value: 70 } }],
                  },
                },
              ],
            },
          },
        } as never)
        .mockResolvedValueOnce({
          aggregations: { by_user: { buckets: [] }, by_host: { buckets: [] } },
        } as never)
        .mockResolvedValueOnce({
          aggregations: {
            by_entity: {
              buckets: [
                {
                  key: 'server-01',
                  scores_over_time: {
                    buckets: [{ key_as_string: '2025-01-01', avg_score: { value: 60 } }],
                  },
                },
              ],
            },
          },
        } as never);

      const result = await enricher.enrich([user, host]);

      expect(result).toHaveLength(2);
      expect(result[0].enrichment.risk?.history).toHaveLength(1);
      expect(result[1].enrichment.risk?.history).toHaveLength(1);
    });

    it('enriches service entities with alerts and risk', async () => {
      const service = createMockLeadEntity('service', 'web-api');

      esClient.search
        .mockResolvedValueOnce({
          aggregations: {
            by_entity: {
              buckets: [
                {
                  key: 'web-api',
                  scores_over_time: {
                    buckets: [{ key_as_string: '2025-01-01', avg_score: { value: 55 } }],
                  },
                },
              ],
            },
          },
        } as never)
        .mockResolvedValueOnce({
          aggregations: {
            by_service: {
              buckets: [
                {
                  key: 'web-api',
                  doc_count: 3,
                  severity_breakdown: { buckets: [{ key: 'medium', doc_count: 3 }] },
                  distinct_rules: { buckets: [{ key: 'Service Anomaly', doc_count: 3 }] },
                  top_alerts: { hits: { hits: [] } },
                },
              ],
            },
          },
        } as never);

      const result = await enricher.enrich([service]);

      expect(result).toHaveLength(1);
      expect(result[0].enrichment.risk?.history).toHaveLength(1);
      expect(result[0].enrichment.alerts?.totalAlerts).toBe(3);
      expect(result[0].enrichment.alerts?.topRuleNames).toEqual(['Service Anomaly']);
    });

    it('continues enrichment when risk history fetch fails', async () => {
      const entity = createMockLeadEntity('user', 'alice');

      esClient.search
        .mockRejectedValueOnce(new Error('risk index not found'))
        .mockResolvedValueOnce(createAlertSummaryResponse() as never);

      const result = await enricher.enrich([entity]);

      expect(result).toHaveLength(1);
      expect(result[0].enrichment.risk?.history).toEqual([]);
      expect(result[0].enrichment.alerts?.totalAlerts).toBe(12);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch risk history')
      );
    });

    it('continues enrichment when alert summary fetch fails', async () => {
      const entity = createMockLeadEntity('user', 'alice');

      esClient.search
        .mockResolvedValueOnce(createRiskHistoryResponse('user', 'alice') as never)
        .mockRejectedValueOnce(new Error('alerts index not found'));

      const result = await enricher.enrich([entity]);

      expect(result).toHaveLength(1);
      expect(result[0].enrichment.risk?.history).toHaveLength(3);
      expect(result[0].enrichment.alerts).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch alert summaries')
      );
    });

    it('preserves original entity fields in enriched output', async () => {
      const entity = createMockLeadEntity('user', 'alice');

      esClient.search
        .mockResolvedValueOnce({ aggregations: { by_entity: { buckets: [] } } } as never)
        .mockResolvedValueOnce({
          aggregations: { by_user: { buckets: [] }, by_host: { buckets: [] } },
        } as never);

      const result = await enricher.enrich([entity]);

      expect(result[0].record).toBe(entity.record);
      expect(result[0].type).toBe('user');
      expect(result[0].name).toBe('alice');
    });
  });
});
