/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchAlertsByTactic, reduceAlertsByTactic } from './alerts_by_tactic';
import { createTestContext, createTestLookup } from './test_helpers';

const ruleBucket = (key: string, name: string, severity: string, docCount: number) => ({
  key,
  doc_count: docCount,
  name: { buckets: [{ key: name }] },
  severity: { buckets: [{ key: severity }] },
});

describe('reduceAlertsByTactic', () => {
  const lookup = createTestLookup();

  it('merges rule-mapped tactics with the ECS fallback and reports unmapped alerts', () => {
    const result = reduceAlertsByTactic(
      50,
      {
        all_rules: {
          buckets: [
            ruleBucket('rule-rdp', 'RDP', 'high', 5),
            ruleBucket('rule-edr', 'Endpoint Security', 'critical', 12),
          ],
        },
        rule_tactics: {
          buckets: [
            {
              key: 'TA0008',
              doc_count: 5,
              rules: { buckets: [{ key: 'rule-rdp', doc_count: 5 }] },
            },
          ],
        },
        ecs_fallback: {
          doc_count: 12,
          tactics: {
            buckets: [
              {
                key: 'TA0008',
                doc_count: 1,
                rules: { buckets: [{ key: 'rule-edr', doc_count: 1 }] },
              },
            ],
          },
          unmapped: { doc_count: 11, rules: { buckets: [{ key: 'rule-edr', doc_count: 11 }] } },
        },
      },
      lookup
    );

    expect(result.totalAlerts).toBe(50);
    expect(result.byTactic.get('TA0008')).toEqual({
      viaRule: 5,
      viaEcs: 1,
      topRuleIds: ['rule-rdp', 'rule-edr'],
    });
    expect(result.unmapped).toEqual({ alerts: 11, topRuleIds: ['rule-edr'] });
    expect(result.rules.get('rule-edr')).toEqual({
      ruleId: 'rule-edr',
      name: 'Endpoint Security',
      severity: 'critical',
      alertCount: 12,
    });
  });

  it('aliases v18 names to ids and merges them with id buckets', () => {
    const result = reduceAlertsByTactic(
      4,
      {
        rule_tactics: {
          buckets: [
            { key: 'TA0005', doc_count: 3 },
            { key: 'Defense Evasion', doc_count: 1 },
            { key: 'Mystery', doc_count: 9 },
          ],
        },
      },
      lookup
    );
    expect(result.byTactic.get('TA0005')).toMatchObject({ viaRule: 4, viaEcs: 0 });
    expect(result.byTactic.size).toBe(1);
  });

  it('defaults unknown severities and handles an empty response', () => {
    const result = reduceAlertsByTactic(
      0,
      { all_rules: { buckets: [ruleBucket('r', 'R', 'weird', 1)] } },
      lookup
    );
    expect(result.rules.get('r')?.severity).toBe('medium');
    expect(reduceAlertsByTactic(0, undefined, lookup).unmapped).toEqual({
      alerts: 0,
      topRuleIds: [],
    });
  });
});

describe('fetchAlertsByTactic', () => {
  it('runs a single size:0 aggregation excluding building blocks and closed alerts', async () => {
    const ctx = createTestContext();
    ctx.esClient.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 3, relation: 'eq' }, hits: [] },
      aggregations: {
        rule_tactics: { buckets: [{ key: 'TA0006', doc_count: 3 }] },
      },
    });

    const result = await fetchAlertsByTactic(ctx, createTestLookup());

    expect(ctx.esClient.search).toHaveBeenCalledTimes(1);
    const [params] = ctx.esClient.search.mock.calls[0];
    expect(params).toMatchObject({
      index: '.alerts-security.alerts-default',
      size: 0,
      query: {
        bool: {
          filter: expect.arrayContaining([
            { terms: { 'kibana.alert.workflow_status': ['open', 'acknowledged'] } },
          ]),
          must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
        },
      },
    });
    expect(result.totalAlerts).toBe(3);
    expect(result.byTactic.get('TA0006')?.viaRule).toBe(3);
  });
});
