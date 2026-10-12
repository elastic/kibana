/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsStringTermsBucketKeys,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { SnapshotContext } from '../snapshot/context';
import {
  ACTIVE_WORKFLOW_STATUSES,
  ECS_TACTIC_FIELD,
  MAX_RULE_BUCKETS,
  MAX_TACTIC_BUCKETS,
  MAX_TOP_RULES_PER_TACTIC,
  RULE_TACTIC_FIELD,
  getAlertsIndex,
} from './constants';
import type { TacticLookup } from './mitre_tactics';

export interface AlertRuleSummary {
  ruleId: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Alerts from this rule in range (open / acknowledged, non-building-block). */
  alertCount: number;
}

export interface TacticAlertActivity {
  /** Alerts mapped to this tactic via the rule's own threat mapping. */
  viaRule: number;
  /** Alerts mapped via the ECS `threat.tactic.id` fallback (external / promotion alerts). */
  viaEcs: number;
  /** Rule ids, most alerts first (max 3). */
  topRuleIds: string[];
}

export interface AlertsByTactic {
  totalAlerts: number;
  byTactic: Map<string, TacticAlertActivity>;
  unmapped: { alerts: number; topRuleIds: string[] };
  rules: Map<string, AlertRuleSummary>;
}

interface RuleBucket extends AggregationsStringTermsBucketKeys {
  name?: { buckets: Array<{ key: string }> };
  severity?: { buckets: Array<{ key: string }> };
}

interface TopRulesAgg {
  buckets: AggregationsStringTermsBucketKeys[];
}

interface TacticBucket extends AggregationsStringTermsBucketKeys {
  rules?: TopRulesAgg;
}

interface AlertsByTacticAggs {
  all_rules?: { buckets: RuleBucket[] };
  rule_tactics?: { buckets: TacticBucket[] };
  ecs_fallback?: {
    doc_count: number;
    tactics?: { buckets: TacticBucket[] };
    unmapped?: { doc_count: number; rules?: TopRulesAgg };
  };
}

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

const asSeverity = (value: string | undefined): AlertRuleSummary['severity'] =>
  SEVERITIES.find((severity) => severity === value) ?? 'medium';

const topRulesAgg = (size: number) => ({
  terms: { field: 'kibana.alert.rule.uuid', size },
});

export const buildAlertsByTacticQuery = (range: {
  from: string;
  to: string;
}): QueryDslQueryContainer => ({
  bool: {
    filter: [
      { range: { '@timestamp': { gte: range.from, lte: range.to } } },
      { terms: { 'kibana.alert.workflow_status': [...ACTIVE_WORKFLOW_STATUSES] } },
    ],
    must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
  },
});

/**
 * Pure reducer over the aggregation response. Rule-mapped and ECS-fallback tactic buckets are
 * merged per tactic id (names such as v18 "Defense Evasion" are aliased to ids); an alert is
 * mapped by exactly one source because the ECS branch only sees alerts without a rule mapping.
 */
export const reduceAlertsByTactic = (
  totalAlerts: number,
  aggs: AlertsByTacticAggs | undefined,
  lookup: TacticLookup
): AlertsByTactic => {
  const rules = new Map<string, AlertRuleSummary>();
  for (const bucket of aggs?.all_rules?.buckets ?? []) {
    const ruleId = String(bucket.key);
    rules.set(ruleId, {
      ruleId,
      name: bucket.name?.buckets[0]?.key ?? ruleId,
      severity: asSeverity(bucket.severity?.buckets[0]?.key),
      alertCount: bucket.doc_count,
    });
  }

  const byTactic = new Map<string, TacticAlertActivity & { ruleCounts: Map<string, number> }>();
  const add = (buckets: TacticBucket[] | undefined, source: 'viaRule' | 'viaEcs'): void => {
    for (const bucket of buckets ?? []) {
      const tacticId = lookup.resolveId(String(bucket.key));
      if (tacticId) {
        const entry = byTactic.get(tacticId) ?? {
          viaRule: 0,
          viaEcs: 0,
          topRuleIds: [],
          ruleCounts: new Map<string, number>(),
        };
        entry[source] += bucket.doc_count;
        for (const ruleBucket of bucket.rules?.buckets ?? []) {
          const ruleId = String(ruleBucket.key);
          entry.ruleCounts.set(ruleId, (entry.ruleCounts.get(ruleId) ?? 0) + ruleBucket.doc_count);
        }
        byTactic.set(tacticId, entry);
      }
    }
  };
  add(aggs?.rule_tactics?.buckets, 'viaRule');
  add(aggs?.ecs_fallback?.tactics?.buckets, 'viaEcs');

  const result = new Map<string, TacticAlertActivity>();
  for (const [tacticId, { ruleCounts, ...activity }] of byTactic) {
    const topRuleIds = [...ruleCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_TOP_RULES_PER_TACTIC)
      .map(([ruleId]) => ruleId);
    result.set(tacticId, { ...activity, topRuleIds });
  }

  return {
    totalAlerts,
    byTactic: result,
    unmapped: {
      alerts: aggs?.ecs_fallback?.unmapped?.doc_count ?? 0,
      topRuleIds: (aggs?.ecs_fallback?.unmapped?.rules?.buckets ?? []).map(({ key }) =>
        String(key)
      ),
    },
    rules,
  };
};

/** One size:0 aggregation over the security alerts index for the brief's time range. */
export const fetchAlertsByTactic = async (
  ctx: SnapshotContext,
  lookup: TacticLookup
): Promise<AlertsByTactic> => {
  const response = await ctx.esClient.search<unknown, AlertsByTacticAggs>(
    {
      index: getAlertsIndex(ctx.spaceId),
      size: 0,
      track_total_hits: true,
      ignore_unavailable: true,
      query: buildAlertsByTacticQuery(ctx.timeRange),
      aggs: {
        all_rules: {
          terms: { field: 'kibana.alert.rule.uuid', size: MAX_RULE_BUCKETS },
          aggs: {
            name: { terms: { field: 'kibana.alert.rule.name', size: 1 } },
            severity: { terms: { field: 'kibana.alert.severity', size: 1 } },
          },
        },
        rule_tactics: {
          terms: { field: RULE_TACTIC_FIELD, size: MAX_TACTIC_BUCKETS },
          aggs: { rules: topRulesAgg(MAX_TOP_RULES_PER_TACTIC) },
        },
        // Alerts with no rule threat mapping (external / promotion rules) fall back to ECS.
        ecs_fallback: {
          filter: { bool: { must_not: [{ exists: { field: RULE_TACTIC_FIELD } }] } },
          aggs: {
            tactics: {
              terms: { field: ECS_TACTIC_FIELD, size: MAX_TACTIC_BUCKETS },
              aggs: { rules: topRulesAgg(MAX_TOP_RULES_PER_TACTIC) },
            },
            unmapped: {
              filter: { bool: { must_not: [{ exists: { field: ECS_TACTIC_FIELD } }] } },
              aggs: { rules: topRulesAgg(MAX_TOP_RULES_PER_TACTIC) },
            },
          },
        },
      },
    },
    { signal: ctx.abortSignal }
  );

  const { total } = response.hits;
  const totalAlerts = typeof total === 'number' ? total : total?.value ?? 0;
  return reduceAlertsByTactic(totalAlerts, response.aggregations, lookup);
};
