/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery, type Filter, type Query } from '@kbn/es-query';
import {
  INVESTIGATION_ENTITY_FIELDS,
  MAX_INVESTIGATION_FILTERS,
  type InvestigationSeed,
} from '@kbn/investigation-seed';
import {
  ALERT_END,
  ALERT_INDEX_PATTERN,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TYPE_ID,
  ALERT_START,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import {
  getGroupFilters,
  getGroupsFromAlertFields,
} from '../../common/custom_threshold_rule/helpers/get_group';

const LOG_THRESHOLD_RULE_TYPE_ID = 'logs.alert.document.count';
const CUSTOM_THRESHOLD_RULE_TYPE_ID = 'observability.rules.custom_threshold';
const LOOKBACK_UNITS = ['s', 'm', 'h', 'd'] as const;

/**
 * Comparator strings copied from infra log threshold rules. That helper cannot be imported
 * here because the infra plugin depends on observability, and the shared enum is not exported.
 */
const NEGATIVE_COMPARATORS = new Set(['does not equal', 'does not match', 'does not match phrase']);
const RANGE_COMPARATORS: Record<string, 'gt' | 'gte' | 'lt' | 'lte'> = {
  'more than': 'gt',
  'more than or equals': 'gte',
  'less than': 'lt',
  'less than or equals': 'lte',
};

const asString = (value: unknown): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
};

const asIso = (value: unknown): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return new Date(raw).toISOString();
  }
  if (typeof raw !== 'string' || raw.length === 0) {
    return undefined;
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
};

const asLookback = (
  timeSize: unknown,
  timeUnit: unknown
): NonNullable<Extract<InvestigationSeed['origin'], { app: 'alerts' }>['lookback']> | undefined => {
  if (
    typeof timeSize !== 'number' ||
    !Number.isFinite(timeSize) ||
    timeSize <= 0 ||
    timeSize > 10_000
  ) {
    return undefined;
  }
  if (
    typeof timeUnit !== 'string' ||
    !LOOKBACK_UNITS.includes(timeUnit as (typeof LOOKBACK_UNITS)[number])
  ) {
    return undefined;
  }
  return { timeSize, timeUnit: timeUnit as (typeof LOOKBACK_UNITS)[number] };
};

const asFilters = (value: unknown): Filter[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return [];
    }
    const filter = item as Filter;
    if (
      filter.meta === undefined ||
      typeof filter.meta !== 'object' ||
      Array.isArray(filter.meta)
    ) {
      return [];
    }
    return [filter];
  });
};

const asQuery = (value: unknown): Query | undefined => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const query = value as Partial<Query>;
  if (typeof query.language !== 'string' || query.language.length === 0) {
    return undefined;
  }
  if (typeof query.query !== 'string' || query.query.trim().length === 0) {
    return undefined;
  }
  return { language: query.language, query: query.query };
};

const kqlFilter = (kql: string | undefined): Filter | undefined => {
  const trimmed = kql?.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    return { meta: {}, query: toElasticsearchQuery(fromKueryExpression(trimmed)) };
  } catch {
    return undefined;
  }
};

const mergeRuleFilters = (ruleFilters: readonly Filter[]): Filter[] => {
  const queries = ruleFilters.flatMap((filter) => (filter.query ? [filter.query] : []));
  if (queries.length === 0) {
    return [];
  }
  return [{ meta: {}, query: { bool: { filter: queries } } }];
};

/** Keeps the seed inside its filter cap by collapsing rule-level filters into one bool filter. */
const boundSeedFilters = (
  ruleFilters: readonly Filter[],
  extraFilters: readonly Filter[]
): Filter[] => {
  const combined = [...ruleFilters, ...extraFilters];
  if (combined.length <= MAX_INVESTIGATION_FILTERS) {
    return combined;
  }
  return [...mergeRuleFilters(ruleFilters), ...extraFilters].slice(0, MAX_INVESTIGATION_FILTERS);
};

interface CriterionSnapshot {
  field?: unknown;
  value?: unknown;
  comparator?: unknown;
}

const criterionValue = (value: unknown): string | number | boolean | undefined =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : undefined;

const criterionQuery = (criterion: CriterionSnapshot): QueryDslQueryContainer | undefined => {
  if (typeof criterion.field !== 'string' || criterion.field.length === 0) {
    return undefined;
  }
  if (typeof criterion.comparator !== 'string') {
    return undefined;
  }
  const field = criterion.field;
  const value = criterionValue(criterion.value);
  if (value === undefined) {
    return undefined;
  }
  const rangeProperty = RANGE_COMPARATORS[criterion.comparator];
  if (rangeProperty) {
    return { range: { [field]: { [rangeProperty]: value } } };
  }
  if (criterion.comparator === 'equals' || criterion.comparator === 'does not equal') {
    return { term: { [field]: { value } } };
  }
  if (criterion.comparator === 'matches' || criterion.comparator === 'does not match') {
    return { match: { [field]: value } };
  }
  if (
    criterion.comparator === 'matches phrase' ||
    criterion.comparator === 'does not match phrase'
  ) {
    return { match_phrase: { [field]: String(value) } };
  }
  return undefined;
};

const isRatioCriteria = (criteria: unknown): boolean =>
  Array.isArray(criteria) &&
  criteria.length === 2 &&
  criteria.every((entry) => Array.isArray(entry));

const countCriteria = (criteria: unknown): CriterionSnapshot[] =>
  Array.isArray(criteria) &&
  criteria.every((entry) => entry !== null && typeof entry === 'object' && !Array.isArray(entry))
    ? (criteria as CriterionSnapshot[])
    : [];

/** One seed filter for every count criterion, so a long rule stays inside the filter cap. */
const logThresholdCriteriaToFilter = (
  criteria: readonly CriterionSnapshot[]
): Filter | undefined => {
  const filter: QueryDslQueryContainer[] = [];
  const mustNot: QueryDslQueryContainer[] = [];
  for (const criterion of criteria) {
    const query = criterionQuery(criterion);
    if (!query || typeof criterion.comparator !== 'string') {
      continue;
    }
    if (NEGATIVE_COMPARATORS.has(criterion.comparator)) {
      mustNot.push(query);
    } else {
      filter.push(query);
    }
  }
  if (filter.length === 0 && mustNot.length === 0) {
    return undefined;
  }
  return {
    meta: {},
    query: {
      bool: {
        ...(filter.length > 0 ? { filter } : {}),
        ...(mustNot.length > 0 ? { must_not: mustNot } : {}),
      },
    },
  };
};

interface SearchIndexSnapshot {
  title?: string;
}

interface MetricSnapshot {
  aggType?: string;
  field?: string;
  filter?: string;
}

interface CriteriaSnapshot {
  metrics?: MetricSnapshot[];
  timeSize?: number;
  timeUnit?: string;
}

interface RuleParamsSnapshot {
  searchConfiguration?: {
    index?: string | SearchIndexSnapshot;
    query?: { language?: string; query?: string };
    filter?: unknown;
  };
  criteria?: CriteriaSnapshot[] | CriteriaSnapshot | unknown;
  timeSize?: number;
  timeUnit?: string;
  logView?: { logViewId?: string };
}

interface RuleSeedMetadata {
  indexPattern?: string;
  dataViewId?: string;
  metric?: InvestigationSeed['metric'];
  query?: Query;
  filters: Filter[];
  alertEnd?: string;
  logViewId?: string;
  lookback?: NonNullable<Extract<InvestigationSeed['origin'], { app: 'alerts' }>['lookback']>;
}

const ruleParamsFrom = (fields: Record<string, unknown>): RuleParamsSnapshot | undefined => {
  const raw = Array.isArray(fields[ALERT_RULE_PARAMETERS])
    ? fields[ALERT_RULE_PARAMETERS][0]
    : fields[ALERT_RULE_PARAMETERS];
  return raw && typeof raw === 'object' ? (raw as RuleParamsSnapshot) : undefined;
};

const customThresholdMetadata = (
  fields: Record<string, unknown>,
  params: RuleParamsSnapshot | undefined
): RuleSeedMetadata => {
  const searchIndex = params?.searchConfiguration?.index;
  const dataViewId = typeof searchIndex === 'string' && searchIndex ? searchIndex : undefined;
  const indexPattern =
    searchIndex &&
    typeof searchIndex === 'object' &&
    typeof searchIndex.title === 'string' &&
    searchIndex.title
      ? searchIndex.title
      : undefined;
  const criteriaList = Array.isArray(params?.criteria)
    ? (params.criteria as CriteriaSnapshot[])
    : params?.criteria && typeof params.criteria === 'object'
    ? [params.criteria as CriteriaSnapshot]
    : [];
  const firstCriterion = criteriaList[0];
  const singleMetric =
    criteriaList.length === 1 && firstCriterion?.metrics?.length === 1
      ? firstCriterion.metrics[0]
      : undefined;
  const metric = asString(singleMetric?.aggType)
    ? {
        operationType: asString(singleMetric?.aggType) as string,
        ...(asString(singleMetric?.field) ? { field: asString(singleMetric?.field) } : {}),
      }
    : undefined;

  const criteriaFilter =
    metric?.operationType === 'count' ? kqlFilter(asString(singleMetric?.filter)) : undefined;
  const groupFilters = getGroupFilters(getGroupsFromAlertFields(fields));
  const extraFilters = [...(criteriaFilter ? [criteriaFilter] : []), ...groupFilters];

  return {
    ...(indexPattern ? { indexPattern } : {}),
    ...(dataViewId ? { dataViewId } : {}),
    ...(metric ? { metric } : {}),
    ...(asQuery(params?.searchConfiguration?.query)
      ? { query: asQuery(params?.searchConfiguration?.query) }
      : {}),
    filters: boundSeedFilters(asFilters(params?.searchConfiguration?.filter), extraFilters),
    ...(asIso(fields[ALERT_END]) ? { alertEnd: asIso(fields[ALERT_END]) } : {}),
    ...(asLookback(firstCriterion?.timeSize, firstCriterion?.timeUnit)
      ? { lookback: asLookback(firstCriterion?.timeSize, firstCriterion?.timeUnit) }
      : {}),
  };
};

const logThresholdMetadata = (
  fields: Record<string, unknown>,
  params: RuleParamsSnapshot | undefined
): RuleSeedMetadata => {
  const indexPattern = asString(fields[ALERT_INDEX_PATTERN]);
  const logViewId = asString(params?.logView?.logViewId);
  const ratio = isRatioCriteria(params?.criteria);
  const criteriaFilter = ratio
    ? undefined
    : logThresholdCriteriaToFilter(countCriteria(params?.criteria));
  const filters = boundSeedFilters(
    [],
    [
      ...(criteriaFilter ? [criteriaFilter] : []),
      ...getGroupFilters(getGroupsFromAlertFields(fields)),
    ]
  );

  return {
    ...(indexPattern ? { indexPattern } : {}),
    ...(logViewId ? { logViewId } : {}),
    metric: { operationType: ratio ? 'ratio' : 'count' },
    filters,
    ...(asIso(fields[ALERT_END]) ? { alertEnd: asIso(fields[ALERT_END]) } : {}),
    ...(asLookback(params?.timeSize, params?.timeUnit)
      ? { lookback: asLookback(params?.timeSize, params?.timeUnit) }
      : {}),
  };
};

const extractRuleSeedMetadata = (
  fields: Record<string, unknown>,
  ruleTypeId: string
): RuleSeedMetadata => {
  const params = ruleParamsFrom(fields);
  if (ruleTypeId === CUSTOM_THRESHOLD_RULE_TYPE_ID) {
    return customThresholdMetadata(fields, params);
  }
  if (ruleTypeId === LOG_THRESHOLD_RULE_TYPE_ID) {
    return logThresholdMetadata(fields, params);
  }
  return { filters: [] };
};

/**
 * Builds the investigation seed from an alert. Returns undefined when the alert
 * has no id, rule type, or start time, because those are required to run.
 */
export const investigationSeedFromAlert = (alert: {
  fields: object;
  lastUpdated?: number;
}): InvestigationSeed | undefined => {
  const fields = alert.fields as Record<string, unknown>;
  const alertId = asString(fields[ALERT_UUID]);
  const ruleTypeId = asString(fields[ALERT_RULE_TYPE_ID]);
  const from = asIso(fields[ALERT_START]);
  if (!alertId || !ruleTypeId || !from) {
    return undefined;
  }

  const to =
    asIso(fields[ALERT_END]) ??
    (alert.lastUpdated !== undefined ? new Date(alert.lastUpdated).toISOString() : undefined) ??
    new Date().toISOString();

  const entities: InvestigationSeed['entities'] = {};
  for (const field of INVESTIGATION_ENTITY_FIELDS) {
    const value = asString(fields[field]);
    if (value) {
      entities[field] = value;
    }
  }

  const metadata = extractRuleSeedMetadata(fields, ruleTypeId);
  const { filters, query, alertEnd, logViewId, lookback, ...indexMetadata } = metadata;

  return {
    origin: {
      app: 'alerts',
      alertId,
      ruleTypeId,
      ...(alertEnd ? { alertEnd } : {}),
      ...(logViewId ? { logViewId } : {}),
      ...(lookback ? { lookback } : {}),
    },
    timeRange: { from, to },
    ...(query ? { query } : {}),
    filters,
    entities,
    ...indexMetadata,
  };
};
