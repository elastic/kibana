/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { escapeStringValue } from '@kbn/esql-utils';
import { CriticalityLevelsForBulkUpload } from '../../../../../../common/entity_analytics/asset_criticality/constants';
import { RiskSeverity } from '../../../../../../common/search_strategy';
import { CRITICALITY_FIELD, RESOLUTION_RISK_LEVEL_FIELD, RISK_LEVEL_FIELD } from '../common';
import type { EntityFilters, RowsMode } from '../common';
import { buildFilterClause, toList } from './esql';

/** Membership on multivalue keyword fields — scalar `IN` returns null for multi-valued docs. */
export const buildMvContainsExpression = (field: string, values: readonly string[]): string => {
  const clauses = values.map((v) => `MV_CONTAINS(${field}, ${escapeStringValue(v)})`);
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`;
};

const ENTITY_FILTER_FIELDS: ReadonlyArray<{
  key: keyof EntityFilters;
  field: string;
  isMultiValue?: boolean;
}> = [
  { key: 'entityTypes', field: 'entity.EngineMetadata.Type' },
  { key: 'riskLevels', field: RISK_LEVEL_FIELD }, // Individual rows only (resolved: group level)
  { key: 'assetCriticality', field: CRITICALITY_FIELD },
  { key: 'watchlists', field: 'entity.attributes.watchlists', isMultiValue: true },
  { key: 'dataSources', field: 'entity.source', isMultiValue: true },
];

/** "Unassigned" is never stored: the filter bar counts entities without a criticality under it. */
const UNASSIGNED_CRITICALITY = CriticalityLevelsForBulkUpload.UNASSIGNED;

export const buildCriticalityCondition = (values: readonly string[]): string => {
  const levels = values.filter((value) => value !== UNASSIGNED_CRITICALITY);
  const conditions = [
    ...(levels.length ? [`${CRITICALITY_FIELD} IN (${toList(levels)})`] : []),
    ...(values.includes(UNASSIGNED_CRITICALITY) ? [`${CRITICALITY_FIELD} IS NULL`] : []),
  ];
  return conditions.length === 1 ? conditions[0] : `(${conditions.join(' OR ')})`;
};

const buildCriticalityQuery = (values: readonly string[]): QueryDslQueryContainer => {
  const levels = values.filter((value) => value !== UNASSIGNED_CRITICALITY);
  return {
    bool: {
      should: [
        ...(levels.length ? [{ terms: { [CRITICALITY_FIELD]: levels } }] : []),
        ...(values.includes(UNASSIGNED_CRITICALITY)
          ? [{ bool: { must_not: { exists: { field: CRITICALITY_FIELD } } } }]
          : []),
      ],
      minimum_should_match: 1,
    },
  };
};

/** "Unknown" is also the absence of a level: the filter bar counts entities without one under it. */
const includesUnknown = (values: readonly string[]): boolean =>
  values.includes(RiskSeverity.Unknown);

/** A bucket matches the stored levels only: entities without a level are the "no value" bucket. */
interface RiskLevelMatch {
  storedOnly?: boolean;
}

const matchesNoLevel = (values: readonly string[], { storedOnly }: RiskLevelMatch): boolean =>
  !storedOnly && includesUnknown(values);

const buildRiskLevelCondition = (values: readonly string[], match: RiskLevelMatch = {}): string =>
  matchesNoLevel(values, match)
    ? `(${RISK_LEVEL_FIELD} IN (${toList(values)}) OR ${RISK_LEVEL_FIELD} IS NULL)`
    : `${RISK_LEVEL_FIELD} IN (${toList(values)})`;

/** Plain field filters, not `COALESCE(…) IN (…)`: Lucene can only run filters on stored fields, not on computed values. */
export const buildResolvedRiskLevelCondition = (
  values: readonly string[],
  match: RiskLevelMatch = {}
): string =>
  `(${RESOLUTION_RISK_LEVEL_FIELD} IN (${toList(
    values
  )}) OR (${RESOLUTION_RISK_LEVEL_FIELD} IS NULL AND ${buildRiskLevelCondition(values, match)}))`;

const SOURCE_FIELD = 'entity.source';
const WATCHLISTS_FIELD = 'entity.attributes.watchlists';

/** Group by fields whose value on a resolved row is the group's, not the main entity's own. */
export const GROUP_VALUE_FIELDS: readonly string[] = [
  CRITICALITY_FIELD,
  SOURCE_FIELD,
  WATCHLISTS_FIELD,
  RISK_LEVEL_FIELD,
];

export const isGroupValueField = (field: string): boolean => GROUP_VALUE_FIELDS.includes(field);

/**
 * The ES|QL condition of one Group by bucket on a resolved row, `null` for the "no value" bucket.
 * It runs after `STATS` / `LOOKUP JOIN`, so it uses comparisons, not MATCH.
 */
export const buildGroupValueBucketExpression = (field: string, value: string | null): string => {
  if (field === CRITICALITY_FIELD) {
    return buildCriticalityCondition([value ?? UNASSIGNED_CRITICALITY]);
  }
  if (field === RISK_LEVEL_FIELD) {
    return value == null
      ? `(${RESOLUTION_RISK_LEVEL_FIELD} IS NULL AND ${RISK_LEVEL_FIELD} IS NULL)`
      : buildResolvedRiskLevelCondition([value], { storedOnly: true });
  }
  return value == null ? `${field} IS NULL` : buildMvContainsExpression(field, [value]);
};

/** AND-joined ES|QL predicate for URL entity filters (no leading `| WHERE`). */
export const buildEntityFiltersExpression = (
  filters: EntityFilters,
  rowsMode: RowsMode = 'individual'
): string =>
  ENTITY_FILTER_FIELDS.flatMap(({ key, field, isMultiValue }) => {
    const values: readonly string[] = filters[key];
    if (!values.length) return [];
    if (key === 'riskLevels') {
      return [
        rowsMode === 'resolved'
          ? buildResolvedRiskLevelCondition(values)
          : buildRiskLevelCondition(values),
      ];
    }
    if (key === 'assetCriticality') return [buildCriticalityCondition(values)];
    return isMultiValue
      ? [buildMvContainsExpression(field, values)]
      : [`${field} IN (${toList(values)})`];
  }).join(' AND ');

const buildRiskLevelQuery = (
  values: readonly string[],
  match: RiskLevelMatch = {}
): QueryDslQueryContainer => ({
  bool: {
    should: [
      { terms: { [RISK_LEVEL_FIELD]: [...values] } },
      ...(matchesNoLevel(values, match)
        ? [{ bool: { must_not: { exists: { field: RISK_LEVEL_FIELD } } } }]
        : []),
    ],
    minimum_should_match: 1,
  },
});

const buildResolvedRiskLevelQuery = (
  values: readonly string[],
  match: RiskLevelMatch = {}
): QueryDslQueryContainer => ({
  bool: {
    should: [
      { terms: { [RESOLUTION_RISK_LEVEL_FIELD]: [...values] } },
      {
        bool: {
          filter: [buildRiskLevelQuery(values, match)],
          must_not: [{ exists: { field: RESOLUTION_RISK_LEVEL_FIELD } }],
        },
      },
    ],
    minimum_should_match: 1,
  },
});

/** The DSL form of `buildGroupValueBucketExpression`, on the main entity's stored values. */
export const buildGroupValueBucketQuery = (
  field: string,
  value: string | null
): QueryDslQueryContainer => {
  if (field === CRITICALITY_FIELD) return buildCriticalityQuery([value ?? UNASSIGNED_CRITICALITY]);
  if (field === RISK_LEVEL_FIELD) {
    return value == null
      ? {
          bool: {
            must_not: [
              { exists: { field: RESOLUTION_RISK_LEVEL_FIELD } },
              { exists: { field: RISK_LEVEL_FIELD } },
            ],
          },
        }
      : buildResolvedRiskLevelQuery([value], { storedOnly: true });
  }
  return value == null
    ? { bool: { must_not: { exists: { field } } } }
    : { term: { [field]: value } };
};

export const buildEntityFiltersQuery = (
  filters: EntityFilters,
  rowsMode: RowsMode = 'individual'
): QueryDslQueryContainer[] =>
  ENTITY_FILTER_FIELDS.flatMap(({ key, field }) => {
    const values: readonly string[] = filters[key];
    if (!values.length) return [];
    if (key === 'riskLevels') {
      return [
        rowsMode === 'resolved' ? buildResolvedRiskLevelQuery(values) : buildRiskLevelQuery(values),
      ];
    }
    if (key === 'assetCriticality') return [buildCriticalityQuery(values)];
    return [{ terms: { [field]: [...values] } }];
  });

/** `| WHERE …` pipe clauses for NAT tile queries (empty when no filters). */
export const buildEntityFilterClauses = (filters: EntityFilters): string[] =>
  buildFilterClause(buildEntityFiltersExpression(filters));
