/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorrelationConfig } from '../../rule_schema';

const ALERTS_INDEX_PREFIX = '.alerts-security.alerts-';

// Query cache for performance optimization
// Key: JSON.stringify({ correlation, selfRuleId, spaceId, maxGroups })
// Value: Compiled ES|QL query string
const queryCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000; // Prevent unbounded growth

const escapeEsqlString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const VALID_FIELD_NAME = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;
const validateFieldName = (name: string): string => {
  if (!VALID_FIELD_NAME.test(name)) {
    throw new Error(`Invalid field name: "${name}"`);
  }
  return name;
};

const VALID_CLUSTER_NAME = /^[a-zA-Z0-9_-]+$/;
const validateClusterName = (name: string): string => {
  if (!VALID_CLUSTER_NAME.test(name)) {
    throw new Error(`Invalid remote cluster name: "${name}"`);
  }
  return name;
};

const VALID_SPACE_NAME = /^[a-z0-9_-]+$/;
const validateSpaceName = (name: string): string => {
  if (!VALID_SPACE_NAME.test(name)) {
    throw new Error(`Invalid space ID: "${name}"`);
  }
  return name;
};

const buildFromClause = (
  spaceId: string,
  remoteClusters?: string[],
  targetSpaces?: string[]
): string => {
  const baseIndex = `${ALERTS_INDEX_PREFIX}${spaceId}`;
  const localIndices = [baseIndex];

  if (targetSpaces && targetSpaces.length > 0) {
    for (const space of targetSpaces) {
      validateSpaceName(space);
      const spaceIndex = `${ALERTS_INDEX_PREFIX}${space}`;
      if (!localIndices.includes(spaceIndex)) {
        localIndices.push(spaceIndex);
      }
    }
  }

  const allIndices = [...localIndices];
  if (remoteClusters && remoteClusters.length > 0) {
    for (const cluster of remoteClusters) {
      validateClusterName(cluster);
      for (const localIndex of localIndices) {
        allIndices.push(`${cluster}:${localIndex}`);
      }
    }
  }

  return allIndices.join(', ');
};

export const buildEnrichmentIndices = (spaceId: string, targetSpaces?: string[]): string[] => {
  const indices = [`${ALERTS_INDEX_PREFIX}${spaceId}`];
  if (targetSpaces && targetSpaces.length > 0) {
    for (const space of targetSpaces) {
      validateSpaceName(space);
      const spaceIndex = `${ALERTS_INDEX_PREFIX}${space}`;
      if (!indices.includes(spaceIndex)) {
        indices.push(spaceIndex);
      }
    }
  }
  return indices;
};

export const compileCorrelationQuery = (
  correlation: CorrelationConfig,
  selfRuleId: string,
  spaceId: string,
  maxGroups?: number,
  incrementalFrom?: string
): string => {
  // Check cache first for performance (skip cache if incremental - timestamp changes)
  const cacheKey = JSON.stringify({ correlation, selfRuleId, spaceId, maxGroups });
  if (!incrementalFrom) {
    const cachedQuery = queryCache.get(cacheKey);
    if (cachedQuery) {
      return cachedQuery;
    }
  }

  const { rules, type, groupBy, timespan, condition, remoteClusters, targetSpaces } = correlation;
  if (groupBy.length === 0) {
    throw new Error('Correlation rules require at least one groupBy field');
  }
  const validatedGroupBy = groupBy.map(validateFieldName);
  const groupByFields = validatedGroupBy.join(', ');
  const escapedSelfId = escapeEsqlString(selfRuleId);
  const selfGuard = `kibana.alert.rule.uuid != "${escapedSelfId}"`;
  const ruleFilter =
    rules.length === 1
      ? `kibana.alert.rule.uuid == "${escapeEsqlString(rules[0])}"`
      : `kibana.alert.rule.uuid IN (${rules.map((r) => `"${escapeEsqlString(r)}"`).join(', ')})`;
  const fromClause = buildFromClause(spaceId, remoteClusters, targetSpaces);

  let query: string;

  switch (type) {
    case 'temporal':
      query = compileTemporalQuery({
        ruleFilter,
        selfGuard,
        groupByFields,
        timespan,
        rules,
        fromClause,
        incrementalFrom,
      });
      break;
    case 'temporal_ordered':
      query = compileTemporalOrderedQuery({
        ruleFilter,
        selfGuard,
        groupByFields,
        timespan,
        rules,
        fromClause,
        incrementalFrom,
      });
      break;
    case 'event_count':
      query = compileEventCountQuery({
        ruleFilter,
        selfGuard,
        groupByFields,
        timespan,
        condition,
        fromClause,
        incrementalFrom,
      });
      break;
    case 'value_count':
      query = compileValueCountQuery({
        ruleFilter,
        selfGuard,
        groupByFields,
        timespan,
        condition,
        fromClause,
        incrementalFrom,
      });
      break;
    default:
      throw new Error(`Unsupported correlation type: ${type}`);
  }

  if (maxGroups !== undefined) {
    const safeLimit = Math.max(1, Math.floor(maxGroups));
    query += `\n| LIMIT ${safeLimit}`;
  }

  // Cache the compiled query (skip caching incremental queries since timestamp changes)
  if (!incrementalFrom) {
    if (queryCache.size >= MAX_CACHE_SIZE) {
      // Simple LRU: Clear entire cache when full (prevent unbounded growth)
      queryCache.clear();
    }
    queryCache.set(cacheKey, query);
  }

  return query;
};

interface QueryParts {
  ruleFilter: string;
  selfGuard: string;
  groupByFields: string;
  timespan: string;
  fromClause: string;
  rules?: string[];
  condition?: { operator: string; value: number; field?: string } | undefined;
  incrementalFrom?: string;
}

const buildTimeFilter = (timespan: string, incrementalFrom?: string): string => {
  if (incrementalFrom) {
    // Incremental mode: Only process alerts newer than last processed timestamp
    return `@timestamp > "${incrementalFrom}"`;
  } else {
    // Full window mode: Process all alerts in timespan window
    return `@timestamp >= NOW() - ${timespan}`;
  }
};

const compileTemporalQuery = ({
  ruleFilter,
  selfGuard,
  groupByFields,
  timespan,
  rules,
  fromClause,
  incrementalFrom,
}: QueryParts): string => {
  const minRules = rules?.length ?? 2;
  const timeFilter = buildTimeFilter(timespan, incrementalFrom);
  return `FROM ${fromClause} METADATA _id, _index
| WHERE ${ruleFilter}
  AND ${selfGuard}
  AND ${timeFilter}
| STATS
    rule_count = COUNT_DISTINCT(kibana.alert.rule.uuid),
    alert_ids = VALUES(kibana.alert.uuid),
    rule_names = VALUES(kibana.alert.rule.name),
    min_time = MIN(@timestamp),
    max_time = MAX(@timestamp),
    max_risk = MAX(kibana.alert.risk_score),
    severity_list = VALUES(kibana.alert.severity)
  BY ${groupByFields}
| WHERE rule_count >= ${minRules}`;
};

const compileTemporalOrderedQuery = ({
  ruleFilter,
  selfGuard,
  groupByFields,
  timespan,
  rules,
  fromClause,
  incrementalFrom,
}: QueryParts): string => {
  const minRules = rules?.length ?? 2;
  const timeFilter = buildTimeFilter(timespan, incrementalFrom);
  return `FROM ${fromClause} METADATA _id, _index
| WHERE ${ruleFilter}
  AND ${selfGuard}
  AND ${timeFilter}
| SORT @timestamp ASC
| STATS
    rule_count = COUNT_DISTINCT(kibana.alert.rule.uuid),
    alert_ids = VALUES(kibana.alert.uuid),
    rule_names = VALUES(kibana.alert.rule.name),
    first_seen = MIN(@timestamp),
    last_seen = MAX(@timestamp),
    max_risk = MAX(kibana.alert.risk_score),
    severity_list = VALUES(kibana.alert.severity)
  BY ${groupByFields}
| WHERE rule_count >= ${minRules}`;
};

const compileEventCountQuery = ({
  ruleFilter,
  selfGuard,
  groupByFields,
  timespan,
  condition,
  fromClause,
  incrementalFrom,
}: QueryParts): string => {
  const op = condition ? mapOperator(condition.operator) : '>';
  const val = condition?.value ?? 1;
  const timeFilter = buildTimeFilter(timespan, incrementalFrom);
  return `FROM ${fromClause} METADATA _id, _index
| WHERE ${ruleFilter}
  AND ${selfGuard}
  AND ${timeFilter}
| STATS
    event_count = COUNT(*),
    alert_ids = VALUES(kibana.alert.uuid),
    rule_names = VALUES(kibana.alert.rule.name),
    min_time = MIN(@timestamp),
    max_time = MAX(@timestamp),
    max_risk = MAX(kibana.alert.risk_score),
    severity_list = VALUES(kibana.alert.severity)
  BY ${groupByFields}
| WHERE event_count ${op} ${val}`;
};

const compileValueCountQuery = ({
  ruleFilter,
  selfGuard,
  groupByFields,
  timespan,
  condition,
  fromClause,
  incrementalFrom,
}: QueryParts): string => {
  const field = condition?.field ? validateFieldName(condition.field) : 'kibana.alert.uuid';
  const op = condition ? mapOperator(condition.operator) : '>';
  const val = condition?.value ?? 1;
  const timeFilter = buildTimeFilter(timespan, incrementalFrom);
  return `FROM ${fromClause} METADATA _id, _index
| WHERE ${ruleFilter}
  AND ${selfGuard}
  AND ${timeFilter}
| STATS
    distinct_values = COUNT_DISTINCT(${field}),
    alert_ids = VALUES(kibana.alert.uuid),
    rule_names = VALUES(kibana.alert.rule.name),
    min_time = MIN(@timestamp),
    max_time = MAX(@timestamp),
    max_risk = MAX(kibana.alert.risk_score),
    severity_list = VALUES(kibana.alert.severity)
  BY ${groupByFields}
| WHERE distinct_values ${op} ${val}`;
};

const mapOperator = (op: string): string => {
  switch (op) {
    case 'eq':
      return '==';
    case 'neq':
      return '!=';
    case 'gt':
      return '>';
    case 'gte':
      return '>=';
    case 'lt':
      return '<';
    case 'lte':
      return '<=';
    default:
      throw new Error(`Unknown operator: ${op}`);
  }
};
