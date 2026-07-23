/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { prioritizeAlerts } from './alert_triage_service';

/** Builds an ES `fields`-shaped alert hit (every field is an array). */
const alertHit = (
  id: string,
  fields: Record<string, unknown[]>
): { _id: string; fields: Record<string, unknown[]> } => ({ _id: id, fields });

interface MockData {
  alerts: Array<{ _id: string; fields: Record<string, unknown[]> }>;
  risk?: Array<{ fields: Record<string, unknown[]> }>;
  criticality?: Array<{ fields: Record<string, unknown[]> }>;
  riskThrows?: boolean;
  criticalityThrows?: boolean;
}

interface AlertSearchParams {
  index: string;
  query: { bool: { filter: Array<Record<string, unknown>> } };
}

/**
 * ES client mock that routes `search` by target index: the alerts index returns scored
 * alert hits, the risk-score-latest index returns entity risk docs, and the
 * asset-criticality index returns criticality docs. The returned `search` jest mock is
 * exposed so tests can assert on the query sent to the alerts index.
 */
const createEsClient = (data: MockData): { esClient: ElasticsearchClient; search: jest.Mock } => {
  const search = jest.fn(async (params: { index: string }) => {
    if (params.index.startsWith('risk-score.')) {
      if (data.riskThrows) throw new Error('risk index missing');
      return { hits: { hits: data.risk ?? [] } };
    }
    if (params.index.startsWith('.asset-criticality.')) {
      if (data.criticalityThrows) throw new Error('criticality index missing');
      return { hits: { hits: data.criticality ?? [] } };
    }
    return { hits: { hits: data.alerts } };
  });
  return { esClient: { search } as unknown as ElasticsearchClient, search };
};

/** Returns the query bool.filter clauses sent to the alerts index (first search call). */
const getAlertQueryFilter = (search: jest.Mock): Array<Record<string, unknown>> => {
  const call = search.mock.calls.find(([params]) =>
    (params as AlertSearchParams).index.startsWith('.alerts-security.')
  );
  return (call![0] as AlertSearchParams).query.bool.filter;
};

const defaultArgs = {
  spaceId: 'default',
  logger: loggingSystemMock.createLogger(),
  timeWindowHours: 24,
  maxAlerts: 100,
  workflowStatus: 'open' as const,
};

const criticalLateralMovementHit = alertHit('alert-1', {
  '@timestamp': ['2026-06-30T00:00:00.000Z'],
  'kibana.alert.risk_score': [99],
  'kibana.alert.severity': ['critical'],
  'kibana.alert.workflow_status': ['open'],
  'kibana.alert.rule.name': ['Remote Service Creation via Named Pipe'],
  'kibana.alert.rule.threat.tactic.name': ['Lateral Movement'],
  'host.name': ['EVAL-DC01'],
  'user.name': ['Administrator'],
});

describe('prioritizeAlerts', () => {
  describe('field reads via the fields API', () => {
    it('returns the base risk score read from hit.fields', async () => {
      const { esClient } = createEsClient({ alerts: [criticalLateralMovementHit] });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups[0].scoreBreakdown.baseRiskScore).toBe(99);
    });

    it('returns the severity read from hit.fields', async () => {
      const { esClient } = createEsClient({ alerts: [criticalLateralMovementHit] });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups[0].severity).toBe('critical');
    });

    it('returns the rule name read from hit.fields', async () => {
      const { esClient } = createEsClient({ alerts: [criticalLateralMovementHit] });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups[0].topRuleName).toBe('Remote Service Creation via Named Pipe');
    });

    it('returns the top alert id read from hit._id', async () => {
      const { esClient } = createEsClient({ alerts: [criticalLateralMovementHit] });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups[0].topAlertId).toBe('alert-1');
    });

    it('returns the count of fetched alerts', async () => {
      const { esClient } = createEsClient({ alerts: [criticalLateralMovementHit] });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.totalAlertsFetched).toBe(1);
    });
  });

  describe('MITRE tactic boost', () => {
    const cases: Array<[string, string, number]> = [
      ['Lateral Movement', 'Lateral Movement', 30],
      ['Credential Access', 'Credential Access', 20],
      ['Persistence', 'Persistence', 10],
      ['Discovery (unmapped)', 'Discovery', 0],
    ];

    it.each(cases)('returns +%s boost for %s tactic', async (_label, tactic, expected) => {
      const { esClient } = createEsClient({
        alerts: [
          alertHit('alert-1', {
            'kibana.alert.risk_score': [50],
            'kibana.alert.rule.threat.tactic.name': [tactic],
            'host.name': ['HOST-1'],
          }),
        ],
      });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups[0].scoreBreakdown.mitreBoost).toBe(expected);
    });
  });

  describe('status modifier', () => {
    it('returns a -5 modifier for acknowledged alerts', async () => {
      const { esClient } = createEsClient({
        alerts: [
          alertHit('alert-1', {
            'kibana.alert.risk_score': [50],
            'kibana.alert.workflow_status': ['acknowledged'],
            'host.name': ['HOST-1'],
          }),
        ],
      });
      const result = await prioritizeAlerts({
        ...defaultArgs,
        workflowStatus: 'open+acknowledged',
        esClient,
      });
      expect(result.groups[0].scoreBreakdown.statusModifier).toBe(-5);
    });

    it('returns a -5 modifier for alerts already in a case', async () => {
      const { esClient } = createEsClient({
        alerts: [
          alertHit('alert-1', {
            'kibana.alert.risk_score': [50],
            'kibana.alert.case_ids': ['case-123'],
            'host.name': ['HOST-1'],
          }),
        ],
      });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups[0].scoreBreakdown.statusModifier).toBe(-5);
    });
  });

  describe('entity clustering', () => {
    it('collapses alerts sharing a host into one group with the expected alertCount and entityName', async () => {
      const { esClient } = createEsClient({
        alerts: [
          alertHit('alert-a', {
            'kibana.alert.risk_score': [80],
            'host.name': ['SHARED-HOST'],
          }),
          alertHit('alert-b', {
            'kibana.alert.risk_score': [60],
            'host.name': ['SHARED-HOST'],
          }),
        ],
      });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].alertCount).toBe(2);
      expect(result.groups[0].entityName).toBe('SHARED-HOST');
      expect(result.groups[0].sharedEntities).toEqual(['SHARED-HOST']);
      expect(result.groups[0].topAlertId).toBe('alert-a');
    });

    it('merges transitive host/user links into a single group', async () => {
      const { esClient } = createEsClient({
        alerts: [
          alertHit('alert-a', {
            'kibana.alert.risk_score': [70],
            'host.name': ['SHARED-HOST'],
          }),
          alertHit('alert-b', {
            'kibana.alert.risk_score': [65],
            'host.name': ['SHARED-HOST'],
            'user.name': ['USER-LINK'],
          }),
          alertHit('alert-c', {
            'kibana.alert.risk_score': [60],
            'user.name': ['USER-LINK'],
          }),
        ],
      });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].alertCount).toBe(3);
      expect(result.groups[0].entityName).toBe('SHARED-HOST');
      expect(result.groups[0].topAlertId).toBe('alert-a');
    });
  });

  describe('entity analytics enrichment', () => {
    it('returns the entity risk boost from the Risk Engine level', async () => {
      const { esClient } = createEsClient({
        alerts: [criticalLateralMovementHit],
        risk: [
          {
            fields: {
              'host.name': ['EVAL-DC01'],
              'host.risk.calculated_level': ['Critical'],
              'host.risk.calculated_score_norm': [95],
            },
          },
        ],
      });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups[0].scoreBreakdown.entityRiskBoost).toBe(25);
    });

    it('returns the surfaced entity risk level for the primary entity', async () => {
      const { esClient } = createEsClient({
        alerts: [criticalLateralMovementHit],
        risk: [
          {
            fields: {
              'host.name': ['EVAL-DC01'],
              'host.risk.calculated_level': ['Critical'],
              'host.risk.calculated_score_norm': [95],
            },
          },
        ],
      });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups[0].entityRiskLevel).toBe('Critical');
    });

    it('returns the asset criticality boost from the criticality level', async () => {
      const { esClient } = createEsClient({
        alerts: [criticalLateralMovementHit],
        criticality: [
          {
            fields: {
              id_field: ['host.name'],
              id_value: ['EVAL-DC01'],
              criticality_level: ['extreme_impact'],
            },
          },
        ],
      });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups[0].scoreBreakdown.assetCriticalityBoost).toBe(20);
    });

    it('re-sorts groups so a lower-base entity outranks when its risk is higher', async () => {
      const { esClient } = createEsClient({
        alerts: [
          alertHit('alert-low-risk-host', {
            'kibana.alert.risk_score': [50],
            'host.name': ['HOST-RISKY'],
          }),
          alertHit('alert-high-base', {
            'kibana.alert.risk_score': [60],
            'host.name': ['HOST-PLAIN'],
          }),
        ],
        risk: [
          {
            fields: {
              'host.name': ['HOST-RISKY'],
              'host.risk.calculated_level': ['Critical'],
              'host.risk.calculated_score_norm': [98],
            },
          },
        ],
      });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups[0].entityName).toBe('HOST-RISKY');
    });

    it('degrades gracefully to a 0 entity boost when the risk index is unavailable', async () => {
      const { esClient } = createEsClient({
        alerts: [criticalLateralMovementHit],
        riskThrows: true,
        criticalityThrows: true,
      });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups[0].scoreBreakdown.entityRiskBoost).toBe(0);
    });

    it('still returns the alert-only final score when enrichment is unavailable', async () => {
      const { esClient } = createEsClient({
        alerts: [criticalLateralMovementHit],
        riskThrows: true,
        criticalityThrows: true,
      });
      const result = await prioritizeAlerts({ ...defaultArgs, esClient });
      expect(result.groups[0].scoreBreakdown.finalScore).toBe(129);
    });
  });

  describe('explicit alertIds selection', () => {
    it('scores exactly the requested ids, bypassing the workflow_status and time-window filters', async () => {
      const { esClient, search } = createEsClient({ alerts: [criticalLateralMovementHit] });
      await prioritizeAlerts({
        ...defaultArgs,
        esClient,
        alertIds: ['alert-1', 'alert-2'],
      });

      const filter = getAlertQueryFilter(search);
      expect(filter).toEqual([{ ids: { values: ['alert-1', 'alert-2'] } }]);
    });

    it('applies the workflow_status and time-window filters when no ids are provided', async () => {
      const { esClient, search } = createEsClient({ alerts: [criticalLateralMovementHit] });
      await prioritizeAlerts({ ...defaultArgs, esClient });

      const filter = getAlertQueryFilter(search);
      const hasIdsClause = filter.some((clause) => 'ids' in clause);
      const hasRangeClause = filter.some((clause) => 'range' in clause);
      expect(hasIdsClause).toBe(false);
      expect(hasRangeClause).toBe(true);
    });

    it('sizes the fetch to cover the full selection when more ids than maxAlerts are supplied', async () => {
      const { esClient, search } = createEsClient({ alerts: [criticalLateralMovementHit] });
      const alertIds = Array.from({ length: 250 }, (_, i) => `alert-${i}`);
      await prioritizeAlerts({ ...defaultArgs, maxAlerts: 100, esClient, alertIds });

      const alertSearchCall = search.mock.calls.find(([params]) =>
        (params as { index: string }).index.startsWith('.alerts-security.')
      );
      expect((alertSearchCall![0] as { size: number }).size).toBe(250);
    });

    it('keeps size at maxAlerts on the queue-scan path (no ids)', async () => {
      const { esClient, search } = createEsClient({ alerts: [criticalLateralMovementHit] });
      await prioritizeAlerts({ ...defaultArgs, maxAlerts: 100, esClient });

      const alertSearchCall = search.mock.calls.find(([params]) =>
        (params as { index: string }).index.startsWith('.alerts-security.')
      );
      expect((alertSearchCall![0] as { size: number }).size).toBe(100);
    });
  });
});
