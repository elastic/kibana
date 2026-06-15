/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DEFAULT_ALERTS_INDEX } from '../../../../../common/constants';

const ALERT_TRIAGE_SOURCE_FIELDS = [
  '@timestamp',
  'kibana.alert.risk_score',
  'kibana.alert.severity',
  'kibana.alert.workflow_status',
  'kibana.alert.rule.name',
  'kibana.alert.rule.threat',
  'kibana.alert.case_ids',
  'kibana.alert.building_block_type',
  'host.name',
  'user.name',
  'source.ip',
  'destination.ip',
] as const;

/** Additive boosts on top of kibana.alert.risk_score, by MITRE tactic name. */
const MITRE_TACTIC_BOOST: Record<string, number> = {
  Exfiltration: 30,
  Impact: 30,
  'Command and Control': 30,
  'Lateral Movement': 30,
  'Credential Access': 20,
  'Privilege Escalation': 20,
  'Defense Evasion': 20,
  Persistence: 10,
  Execution: 10,
  'Initial Access': 10,
};

export interface ScoreBreakdown {
  baseRiskScore: number;
  mitreBoost: number;
  statusModifier: number;
  finalScore: number;
}

export interface TriageAlert {
  id: string;
  timestamp: string;
  ruleName: string;
  severity: string;
  workflowStatus: string;
  hostNames: string[];
  userNames: string[];
  mitreBoost: number;
  inCase: boolean;
  scoreBreakdown: ScoreBreakdown;
}

/** Maximum number of ranked groups returned to the LLM. */
const MAX_GROUPS_RETURNED = 10;

export interface TriageGroupSummary {
  groupKey: string;
  groupType: 'entity' | 'ungrouped';
  groupScore: number;
  entityType?: 'host' | 'user';
  entityName?: string;
  sharedEntities: string[];
  alertCount: number;
  /** _id of the highest-scoring alert in the group — include verbatim in the response. */
  topAlertId: string;
  topRuleName: string;
  severity: string;
  /** Deduplicated rule names across all alerts in the group (up to 5). */
  ruleNames: string[];
  scoreBreakdown: ScoreBreakdown;
}

export interface TriageResult {
  groups: TriageGroupSummary[];
  totalAlertsFetched: number;
  timeWindowHours: number;
}

export interface AlertTriageParams {
  esClient: ElasticsearchClient;
  spaceId: string;
  timeWindowHours: number;
  maxAlerts: number;
  workflowStatus: 'open' | 'open+acknowledged';
  alertIds?: string[];
}

function getValue(source: Record<string, unknown>, ...path: string[]): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function getStringValue(source: Record<string, unknown>, ...path: string[]): string {
  const value = getValue(source, ...path);
  return typeof value === 'string' ? value : '';
}

function getStringArray(source: Record<string, unknown>, ...path: string[]): string[] {
  const value = getValue(source, ...path);
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return [];
}

function getNumber(source: Record<string, unknown>, ...path: string[]): number {
  const value = getValue(source, ...path);
  return typeof value === 'number' ? value : 0;
}

function getMitreBoost(threat: unknown): number {
  if (!Array.isArray(threat)) return 0;
  let maxBoost = 0;
  for (const entry of threat) {
    if (entry != null && typeof entry === 'object') {
      const tactic = (entry as Record<string, unknown>).tactic;
      if (tactic != null && typeof tactic === 'object') {
        const name = (tactic as Record<string, unknown>).name;
        if (typeof name === 'string') {
          maxBoost = Math.max(maxBoost, MITRE_TACTIC_BOOST[name] ?? 0);
        }
      }
    }
  }
  return maxBoost;
}

function scoreAlert(id: string, source: Record<string, unknown>): TriageAlert {
  const baseRiskScore = getNumber(source, 'kibana', 'alert', 'risk_score');
  const mitreBoost = getMitreBoost(getValue(source, 'kibana', 'alert', 'rule', 'threat'));

  const workflowStatus = getStringValue(source, 'kibana', 'alert', 'workflow_status');
  const caseIds = getStringArray(source, 'kibana', 'alert', 'case_ids');
  const inCase = caseIds.length > 0;
  const isAcknowledged = workflowStatus === 'acknowledged';

  const statusModifier = (isAcknowledged ? -5 : 0) + (inCase ? -5 : 0);
  const finalScore = baseRiskScore + mitreBoost + statusModifier;

  return {
    id,
    timestamp: getStringValue(source, '@timestamp'),
    ruleName: getStringValue(source, 'kibana', 'alert', 'rule', 'name'),
    severity: getStringValue(source, 'kibana', 'alert', 'severity'),
    workflowStatus,
    hostNames: getStringArray(source, 'host', 'name'),
    userNames: getStringArray(source, 'user', 'name'),
    mitreBoost,
    inCase,
    scoreBreakdown: {
      baseRiskScore,
      mitreBoost,
      statusModifier,
      finalScore,
    },
  };
}

function getOrCreate<K>(map: Map<K, number[]>, key: K): number[] {
  let arr = map.get(key);
  if (arr == null) {
    arr = [];
    map.set(key, arr);
  }
  return arr;
}

function buildGroups(alerts: TriageAlert[]): TriageGroupSummary[] {
  // Union-find to cluster alerts that share entities
  const parent: number[] = alerts.map((_, i) => i);

  const find = (x: number): number => {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };

  const union = (x: number, y: number): void => {
    const px = find(x);
    const py = find(y);
    if (px !== py) parent[px] = py;
  };

  // Build entity -> alert indices map
  const entityToIndices = new Map<string, number[]>();
  for (let i = 0; i < alerts.length; i++) {
    const alert = alerts[i];
    for (const host of alert.hostNames) {
      getOrCreate(entityToIndices, `host:${host}`).push(i);
    }
    for (const user of alert.userNames) {
      getOrCreate(entityToIndices, `user:${user}`).push(i);
    }
  }

  // Union alerts that share an entity
  for (const indices of entityToIndices.values()) {
    for (let i = 1; i < indices.length; i++) {
      union(indices[0], indices[i]);
    }
  }

  // Build component map: root -> alert indices
  const components = new Map<number, number[]>();
  for (let i = 0; i < alerts.length; i++) {
    const root = find(i);
    getOrCreate(components, root).push(i);
  }

  const groups: TriageGroupSummary[] = [];

  for (const [, indices] of components) {
    const groupAlerts = indices.map((i) => alerts[i]);
    const groupScore = Math.max(...groupAlerts.map((a) => a.scoreBreakdown.finalScore));
    const topAlert = groupAlerts.reduce((best, a) =>
      a.scoreBreakdown.finalScore > best.scoreBreakdown.finalScore ? a : best
    );

    // Determine shared entities across all alerts in the group
    const sharedHosts = groupAlerts
      .flatMap((a) => a.hostNames)
      .filter((h, _, arr) => arr.filter((x) => x === h).length > 1);
    const sharedUsers = groupAlerts
      .flatMap((a) => a.userNames)
      .filter((u, _, arr) => arr.filter((x) => x === u).length > 1);
    const uniqueSharedHosts = [...new Set(sharedHosts)];
    const uniqueSharedUsers = [...new Set(sharedUsers)];

    const hasSharedEntities = uniqueSharedHosts.length > 0 || uniqueSharedUsers.length > 0;
    const hasSingleAlertWithEntities =
      groupAlerts.length === 1 &&
      (groupAlerts[0].hostNames.length > 0 || groupAlerts[0].userNames.length > 0);

    let groupKey: string;
    let entityType: 'host' | 'user' | undefined;
    let entityName: string | undefined;
    let sharedEntities: string[];

    if (hasSharedEntities) {
      if (uniqueSharedHosts.length > 0) {
        entityType = 'host';
        entityName = uniqueSharedHosts[0];
        groupKey = `host:${uniqueSharedHosts[0]}`;
        sharedEntities = uniqueSharedHosts;
      } else {
        entityType = 'user';
        entityName = uniqueSharedUsers[0];
        groupKey = `user:${uniqueSharedUsers[0]}`;
        sharedEntities = uniqueSharedUsers;
      }
    } else if (hasSingleAlertWithEntities) {
      const singleAlert = groupAlerts[0];
      if (singleAlert.hostNames.length > 0) {
        entityType = 'host';
        entityName = singleAlert.hostNames[0];
        groupKey = `host:${singleAlert.hostNames[0]}`;
        sharedEntities = singleAlert.hostNames;
      } else {
        entityType = 'user';
        entityName = singleAlert.userNames[0];
        groupKey = `user:${singleAlert.userNames[0]}`;
        sharedEntities = singleAlert.userNames;
      }
    } else {
      groupKey = `ungrouped:${topAlert.id}`;
      sharedEntities = [];
    }

    const groupType: 'entity' | 'ungrouped' = entityType != null ? 'entity' : 'ungrouped';

    // Deduplicate rule names across the group (cap at 5 to stay compact)
    const ruleNames = [...new Set(groupAlerts.map((a) => a.ruleName).filter(Boolean))].slice(0, 5);

    groups.push({
      groupKey,
      groupType,
      groupScore,
      entityType,
      entityName,
      sharedEntities,
      alertCount: groupAlerts.length,
      topAlertId: topAlert.id,
      topRuleName: topAlert.ruleName,
      severity: topAlert.severity,
      ruleNames,
      scoreBreakdown: topAlert.scoreBreakdown,
    });
  }

  // Return only the top N groups — the LLM doesn't need the full long tail.
  return groups.sort((a, b) => b.groupScore - a.groupScore).slice(0, MAX_GROUPS_RETURNED);
}

export const prioritizeAlerts = async ({
  esClient,
  spaceId,
  timeWindowHours,
  maxAlerts,
  workflowStatus,
  alertIds,
}: AlertTriageParams): Promise<TriageResult> => {
  const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

  const workflowShouldClauses =
    workflowStatus === 'open+acknowledged'
      ? [
          { match_phrase: { 'kibana.alert.workflow_status': 'open' } },
          { match_phrase: { 'kibana.alert.workflow_status': 'acknowledged' } },
        ]
      : [{ match_phrase: { 'kibana.alert.workflow_status': 'open' } }];

  const filterClauses: Array<Record<string, unknown>> = [
    {
      bool: {
        should: workflowShouldClauses,
        minimum_should_match: 1,
      },
    },
    {
      range: {
        '@timestamp': {
          gte: `now-${timeWindowHours}h`,
          lte: 'now',
        },
      },
    },
  ];

  if (alertIds != null && alertIds.length > 0) {
    filterClauses.push({ ids: { values: alertIds } });
  }

  const result = await esClient.search({
    index: alertsIndex,
    size: maxAlerts,
    query: {
      bool: {
        filter: filterClauses,
        must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
      },
    },
    sort: [{ 'kibana.alert.risk_score': { order: 'desc' } }, { '@timestamp': { order: 'desc' } }],
    _source: Array.from(ALERT_TRIAGE_SOURCE_FIELDS),
    ignore_unavailable: true,
  });

  const hits = result.hits.hits;
  const scoredAlerts: TriageAlert[] = hits.map((hit) =>
    scoreAlert(hit._id ?? '', (hit._source ?? {}) as Record<string, unknown>)
  );

  const groups = buildGroups(scoredAlerts);

  return {
    groups,
    totalAlertsFetched: hits.length,
    timeWindowHours,
  };
};
