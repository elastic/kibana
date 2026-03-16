/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorrelationConfig } from '../../rule_schema';

const ALERTS_INDEX = '.alerts-security.alerts-default';

const escapeEsqlString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const VALID_FIELD_NAME = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;
const validateFieldName = (name: string): string => {
  if (!VALID_FIELD_NAME.test(name)) {
    throw new Error(`Invalid field name: "${name}"`);
  }
  return name;
};

export const compileCorrelationQuery = (
  correlation: CorrelationConfig,
  selfRuleId: string,
  maxGroups?: number
): string => {
  const { rules, type, groupBy, timespan, condition } = correlation;
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

  let query: string;

  switch (type) {
    case 'temporal':
      query = compileTemporalQuery({ ruleFilter, selfGuard, groupByFields, timespan, rules });
      break;
    case 'temporal_ordered':
      query = compileTemporalOrderedQuery({
        ruleFilter,
        selfGuard,
        groupByFields,
        timespan,
        rules,
      });
      break;
    case 'event_count':
      query = compileEventCountQuery({
        ruleFilter,
        selfGuard,
        groupByFields,
        timespan,
        condition,
      });
      break;
    case 'value_count':
      query = compileValueCountQuery({
        ruleFilter,
        selfGuard,
        groupByFields,
        timespan,
        condition,
      });
      break;
    default:
      throw new Error(`Unsupported correlation type: ${type}`);
  }

  if (maxGroups !== undefined) {
    const safeLimit = Math.max(1, Math.floor(maxGroups));
    query += `\n| LIMIT ${safeLimit}`;
  }

  return query;
};

interface QueryParts {
  ruleFilter: string;
  selfGuard: string;
  groupByFields: string;
  timespan: string;
  rules?: string[];
  condition?: { operator: string; value: number; field?: string } | undefined;
}

const compileTemporalQuery = ({
  ruleFilter,
  selfGuard,
  groupByFields,
  timespan,
  rules,
}: QueryParts): string => {
  const minRules = rules?.length ?? 2;
  return `FROM ${ALERTS_INDEX} METADATA _id, _index
| WHERE ${ruleFilter}
  AND ${selfGuard}
  AND @timestamp >= NOW() - ${timespan}
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
}: QueryParts): string => {
  const minRules = rules?.length ?? 2;
  return `FROM ${ALERTS_INDEX} METADATA _id, _index
| WHERE ${ruleFilter}
  AND ${selfGuard}
  AND @timestamp >= NOW() - ${timespan}
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
}: QueryParts): string => {
  const op = condition ? mapOperator(condition.operator) : '>';
  const val = condition?.value ?? 1;
  return `FROM ${ALERTS_INDEX} METADATA _id, _index
| WHERE ${ruleFilter}
  AND ${selfGuard}
  AND @timestamp >= NOW() - ${timespan}
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
}: QueryParts): string => {
  const field = condition?.field ? validateFieldName(condition.field) : 'kibana.alert.uuid';
  const op = condition ? mapOperator(condition.operator) : '>';
  const val = condition?.value ?? 1;
  return `FROM ${ALERTS_INDEX} METADATA _id, _index
| WHERE ${ruleFilter}
  AND ${selfGuard}
  AND @timestamp >= NOW() - ${timespan}
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
