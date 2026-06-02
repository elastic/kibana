/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createBehavioralAnalysisModule } from './behavioral_analysis_module';
import type { LeadEntity } from '../types';

const createEntity = (
  type: string,
  name: string,
  options: { email?: string; id?: string } = {}
): LeadEntity => {
  const id = options.id ?? `${type}:${name}`;
  return {
    record: {
      entity: { id, name, type },
      ...(options.email ? { user: { email: options.email } } : {}),
    } as never,
    id,
    type,
    name,
  };
};

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
            key: 'user:alice',
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
            key: 'user:bob',
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
            key: 'user:charlie',
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
            key: 'user:alice',
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
            key: 'user:alice',
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
            key: 'user:alice',
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
              key: 'host:server-01',
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
              key: 'host:server-01',
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
              key: 'host:server-01',
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

  it('filters and aggregates by a computed EUID runtime field, not by `${type}.name`', async () => {
    const entity = createEntity('user', 'alice');
    esClient.search.mockResolvedValue(createAlertAggResponse() as never);

    const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
    await module.collect([entity]);

    const searchCall = esClient.search.mock.calls[0][0] as Record<string, unknown>;
    const runtimeMappings = searchCall.runtime_mappings as Record<string, { type: string }>;
    expect(runtimeMappings).toBeDefined();
    expect(runtimeMappings.entity_id_user).toEqual(expect.objectContaining({ type: 'keyword' }));

    const queryStr = JSON.stringify(searchCall.query);
    expect(queryStr).toContain('entity_id_user');
    expect(queryStr).toContain('user:alice');
    expect(queryStr).not.toContain('"user.name"');

    const aggsStr = JSON.stringify(searchCall.aggs);
    expect(aggsStr).toContain('"entity_id_user"');
    expect(aggsStr).not.toContain('"user.name"');
  });

  it('keeps observations separate for two entities sharing a name but with distinct EUIDs', async () => {
    const aliceA = createEntity('user', 'alice', { id: 'user:alice@hosta' });
    const aliceB = createEntity('user', 'alice', { id: 'user:alice@hostb' });
    esClient.search.mockResolvedValue(
      createAlertAggResponse([
        {
          key: 'user:alice@hosta',
          docCount: 4,
          severities: { critical: 4 },
          rules: ['Rule A'],
          maxRiskScore: 90,
        },
        {
          key: 'user:alice@hostb',
          docCount: 1,
          severities: { low: 1 },
          rules: ['Rule B'],
          maxRiskScore: 20,
        },
      ]) as never
    );

    const module = createBehavioralAnalysisModule({ esClient, logger, alertsIndexPattern });
    const observations = await module.collect([aliceA, aliceB]);

    const obsA = observations.filter((o) => o.entityId === 'user:alice@hosta');
    const obsB = observations.filter((o) => o.entityId === 'user:alice@hostb');
    expect(obsA.length).toBeGreaterThan(0);
    expect(obsB.length).toBeGreaterThan(0);
    const severityA = obsA.find((o) => o.type === 'high_severity_alerts');
    const severityB = obsB.find((o) => o.type === 'high_severity_alerts');
    expect(severityA?.severity).toBe('critical');
    expect(severityB).toBeUndefined();
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
});
