/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createBehavioralAnalysisModule } from './behavioral_analysis_module';
import { DEFAULT_MAX_TERMS_QUERY_COUNT } from '../../utils/elasticsearch_terms_limits';
import type { LeadEntity } from '../types';

const createEntity = (type: string, name: string, email?: string): LeadEntity => ({
  record: {
    entity: { id: `euid-${name}`, name, type },
    ...(email ? { user: { email } } : {}),
  } as never,
  type,
  name,
});

const createAlertAggResponse = (
  byUser: Array<{
    key: string;
    docCount: number;
    severities: Record<string, number>;
    rules: string[];
    maxRiskScore: number;
  }> = [],
  byHost: Array<{
    key: string;
    docCount: number;
    severities: Record<string, number>;
    rules: string[];
    maxRiskScore: number;
  }> = []
) => ({
  hits: { hits: [] },
  aggregations: {
    by_user: {
      buckets: byUser.map((b) => ({
        key: b.key,
        doc_count: b.docCount,
        severity_breakdown: {
          buckets: Object.entries(b.severities).map(([k, v]) => ({ key: k, doc_count: v })),
        },
        distinct_rules: { buckets: b.rules.map((r) => ({ key: r, doc_count: 1 })) },
        max_risk_score: { value: b.maxRiskScore },
        top_alerts: { hits: { hits: [] } },
      })),
    },
    by_host: {
      buckets: byHost.map((b) => ({
        key: b.key,
        doc_count: b.docCount,
        severity_breakdown: {
          buckets: Object.entries(b.severities).map(([k, v]) => ({ key: k, doc_count: v })),
        },
        distinct_rules: { buckets: b.rules.map((r) => ({ key: r, doc_count: 1 })) },
        max_risk_score: { value: b.maxRiskScore },
        top_alerts: { hits: { hits: [] } },
      })),
    },
  },
});

describe('BehavioralAnalysisModule', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  const alertsIndexPattern = '.alerts-security.alerts-default';

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.search.mockResolvedValue(createAlertAggResponse() as never);
  });

  it('is enabled when alertsIndexPattern is provided', () => {
    const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
    expect(module.isEnabled()).toBe(true);
  });

  it('is disabled when alertsIndexPattern is empty', () => {
    const module = createBehavioralAnalysisModule({
      esClient,
      logger,
      alertsIndexPattern: '',
    });
    expect(module.isEnabled()).toBe(false);
  });

  describe('severity tier observations', () => {
    it('produces a critical observation when critical alerts exist', async () => {
      const entity = createEntity('user', 'alice');
      esClient.search.mockResolvedValue(
        createAlertAggResponse([
          {
            key: 'alice',
            docCount: 5,
            severities: { critical: 2, high: 1 },
            rules: ['Rule A'],
            maxRiskScore: 95,
          },
        ]) as never
      );

      const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
      const observations = await module.collect([entity]);

      const severityObs = observations.find((o) => o.type === 'high_severity_alerts');
      expect(severityObs).toBeDefined();
      expect(severityObs!.severity).toBe('critical');
    });

    it('produces a high observation when only high alerts exist', async () => {
      const entity = createEntity('user', 'bob');
      esClient.search.mockResolvedValue(
        createAlertAggResponse([
          {
            key: 'bob',
            docCount: 3,
            severities: { high: 3 },
            rules: ['Rule B'],
            maxRiskScore: 80,
          },
        ]) as never
      );

      const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
      const observations = await module.collect([entity]);

      const severityObs = observations.find((o) => o.type === 'high_severity_alerts');
      expect(severityObs).toBeDefined();
      expect(severityObs!.severity).toBe('high');
    });

    it('produces a medium observation when only medium alerts exist', async () => {
      const entity = createEntity('user', 'charlie');
      esClient.search.mockResolvedValue(
        createAlertAggResponse([
          {
            key: 'charlie',
            docCount: 4,
            severities: { medium: 4 },
            rules: ['Rule C', 'Rule D'],
            maxRiskScore: 50,
          },
        ]) as never
      );

      const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
      const observations = await module.collect([entity]);

      const severityObs = observations.find((o) => o.type === 'medium_severity_alerts');
      expect(severityObs).toBeDefined();
      expect(severityObs!.severity).toBe('medium');
      expect(severityObs!.metadata.rule_names).toEqual(['Rule C', 'Rule D']);
    });
  });

  describe('alert volume spike observations', () => {
    it('produces an alert_volume_spike when total >= 10', async () => {
      const entity = createEntity('user', 'alice');
      esClient.search.mockResolvedValue(
        createAlertAggResponse([
          {
            key: 'alice',
            docCount: 15,
            severities: { low: 15 },
            rules: ['Rule A'],
            maxRiskScore: 30,
          },
        ]) as never
      );

      const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
      const observations = await module.collect([entity]);

      const volumeObs = observations.find((o) => o.type === 'alert_volume_spike');
      expect(volumeObs).toBeDefined();
      expect(volumeObs!.severity).toBe('medium');
    });

    it('produces a high severity volume spike when total >= 30', async () => {
      const entity = createEntity('user', 'alice');
      esClient.search.mockResolvedValue(
        createAlertAggResponse([
          {
            key: 'alice',
            docCount: 35,
            severities: { low: 35 },
            rules: ['Rule A'],
            maxRiskScore: 30,
          },
        ]) as never
      );

      const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
      const observations = await module.collect([entity]);

      const volumeObs = observations.find((o) => o.type === 'alert_volume_spike');
      expect(volumeObs!.severity).toBe('high');
    });

    it('does not produce volume spike when total < 10', async () => {
      const entity = createEntity('user', 'alice');
      esClient.search.mockResolvedValue(
        createAlertAggResponse([
          {
            key: 'alice',
            docCount: 5,
            severities: { low: 5 },
            rules: ['Rule A'],
            maxRiskScore: 20,
          },
        ]) as never
      );

      const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
      const observations = await module.collect([entity]);

      expect(observations.find((o) => o.type === 'alert_volume_spike')).toBeUndefined();
    });
  });

  describe('multi-tactic observations', () => {
    it('produces a multi_tactic_attack when >= 3 distinct rules', async () => {
      const entity = createEntity('host', 'server-01');
      esClient.search.mockResolvedValue(
        createAlertAggResponse(
          [],
          [
            {
              key: 'server-01',
              docCount: 5,
              severities: { medium: 5 },
              rules: ['Rule A', 'Rule B', 'Rule C'],
              maxRiskScore: 60,
            },
          ]
        ) as never
      );

      const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
      const observations = await module.collect([entity]);

      const tacticObs = observations.find((o) => o.type === 'multi_tactic_attack');
      expect(tacticObs).toBeDefined();
      expect(tacticObs!.severity).toBe('high');
      expect(tacticObs!.metadata.distinct_rule_count).toBe(3);
    });

    it('produces a critical multi_tactic_attack when >= 6 distinct rules', async () => {
      const entity = createEntity('host', 'server-01');
      esClient.search.mockResolvedValue(
        createAlertAggResponse(
          [],
          [
            {
              key: 'server-01',
              docCount: 10,
              severities: { high: 10 },
              rules: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'],
              maxRiskScore: 90,
            },
          ]
        ) as never
      );

      const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
      const observations = await module.collect([entity]);

      const tacticObs = observations.find((o) => o.type === 'multi_tactic_attack');
      expect(tacticObs!.severity).toBe('critical');
    });

    it('does not produce multi_tactic_attack when < 3 distinct rules', async () => {
      const entity = createEntity('host', 'server-01');
      esClient.search.mockResolvedValue(
        createAlertAggResponse(
          [],
          [
            {
              key: 'server-01',
              docCount: 3,
              severities: { medium: 3 },
              rules: ['Rule A', 'Rule B'],
              maxRiskScore: 40,
            },
          ]
        ) as never
      );

      const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
      const observations = await module.collect([entity]);

      expect(observations.find((o) => o.type === 'multi_tactic_attack')).toBeUndefined();
    });
  });

  it('queries by entity name field for the given type', async () => {
    const entity = createEntity('user', 'alice');
    esClient.search.mockResolvedValue(createAlertAggResponse() as never);

    const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
    await module.collect([entity]);

    const searchCall = esClient.search.mock.calls[0][0] as Record<string, unknown>;
    const queryStr = JSON.stringify(searchCall.query);
    expect(queryStr).toContain('user.name');
    expect(queryStr).toContain('alice');
  });

  it('returns empty observations when no alerts match', async () => {
    const entity = createEntity('user', 'alice');
    const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });

    const observations = await module.collect([entity]);

    expect(observations).toHaveLength(0);
  });

  it('logs warning and returns empty when ES query fails', async () => {
    const entity = createEntity('user', 'alice');
    esClient.search.mockRejectedValue(new Error('alerts index missing'));

    const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
    const observations = await module.collect([entity]);

    expect(observations).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch alert summaries')
    );
  });

  describe('large entity volumes (P90+ scale)', () => {
    it('batches the terms query so a single type never exceeds the ES max_terms_count limit', async () => {
      const totalEntities = DEFAULT_MAX_TERMS_QUERY_COUNT + 5000;
      const entities: LeadEntity[] = Array.from({ length: totalEntities }, (_, i) =>
        createEntity('user', `user-${i}`)
      );

      esClient.search.mockImplementation((params) => {
        const query = (params as Record<string, unknown>).query as {
          bool: { filter: Array<Record<string, unknown>> };
        };
        const termsFilter = query.bool.filter.find(
          (f) => (f.terms as Record<string, unknown> | undefined)?.['user.name']
        ) as { terms: Record<string, string[]> };
        const chunk = termsFilter.terms['user.name'];

        // Echo back a bucket for the first name in this chunk only, so we can
        // prove that every chunk was actually queried and merged (not just the last one).
        return Promise.resolve(
          createAlertAggResponse([
            {
              key: chunk[0],
              docCount: 12,
              severities: { high: 12 },
              rules: ['Rule A'],
              maxRiskScore: 80,
            },
          ]) as never
        );
      });

      const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
      const observations = await module.collect(entities);

      // ceil(70535 / 65535) = 2 queries for the single 'user' type
      expect(esClient.search).toHaveBeenCalledTimes(2);

      for (const [params] of esClient.search.mock.calls) {
        const query = (params as Record<string, unknown>).query as {
          bool: { filter: Array<Record<string, unknown>> };
        };
        const termsFilter = query.bool.filter.find(
          (f) => (f.terms as Record<string, unknown> | undefined)?.['user.name']
        ) as { terms: Record<string, string[]> };
        expect(termsFilter.terms['user.name'].length).toBeLessThanOrEqual(
          DEFAULT_MAX_TERMS_QUERY_COUNT
        );
      }

      // The entity that triggered the first chunk and the entity that triggered the
      // second chunk both need observations, proving results from every batch made it back.
      expect(observations.some((o) => o.entityId === 'user:user-0')).toBe(true);
      expect(
        observations.some((o) => o.entityId === `user:user-${DEFAULT_MAX_TERMS_QUERY_COUNT}`)
      ).toBe(true);
    });
  });
});
