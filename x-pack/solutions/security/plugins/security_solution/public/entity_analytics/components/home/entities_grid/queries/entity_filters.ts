/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { escapeStringValue } from '@kbn/esql-utils';
import { CriticalityLevelsForBulkUpload } from '../../../../../../common/entity_analytics/asset_criticality/constants';
import { CRITICALITY_FIELD, RESOLUTION_RISK_LEVEL_FIELD, RISK_LEVEL_FIELD } from '../common';
import type { EntityFilters, RowsMode } from '../common';
import { buildFilterClause, toList } from './esql';

/** Membership on multivalue keyword fields — scalar `IN` returns null for multi-valued docs. */
const buildMvContainsExpression = (field: string, values: readonly string[]): string => {
  const clauses = values.map((v) => `MV_CONTAINS(${field}, ${escapeStringValue(v)})`);
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`;
};

const ENTITY_FILTER_FIELDS: ReadonlyArray<{
  key: keyof EntityFilters;
  field: string;
  isMultiValue?: boolean;
}> = [
  { key: 'entityTypes', field: 'entity.EngineMetadata.Type' },
  { key: 'riskLevels', field: 'entity.risk.calculated_level' },
  { key: 'assetCriticality', field: CRITICALITY_FIELD },
  { key: 'watchlists', field: 'entity.attributes.watchlists', isMultiValue: true },
  { key: 'dataSources', field: 'entity.source', isMultiValue: true },
];

/** "Unassigned" is never stored: the filter bar counts entities without a criticality under it. */
const UNASSIGNED_CRITICALITY = CriticalityLevelsForBulkUpload.UNASSIGNED;

const buildCriticalityCondition = (values: readonly string[]): string => {
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

/** Plain field filters, not `COALESCE(…) IN (…)`: Lucene can only run filters on stored fields, not on computed values. */
const buildResolvedRiskLevelCondition = (values: readonly string[]): string =>
  `(${RESOLUTION_RISK_LEVEL_FIELD} IN (${toList(
    values
  )}) OR (${RESOLUTION_RISK_LEVEL_FIELD} IS NULL AND ${RISK_LEVEL_FIELD} IN (${toList(values)})))`;

/** AND-joined ES|QL predicate for URL entity filters (no leading `| WHERE`). */
export const buildEntityFiltersExpression = (
  filters: EntityFilters,
  rowsMode: RowsMode = 'individual'
): string =>
  ENTITY_FILTER_FIELDS.flatMap(({ key, field, isMultiValue }) => {
    const values: readonly string[] = filters[key];
    if (!values.length) return [];
    if (key === 'riskLevels' && rowsMode === 'resolved') {
      return [buildResolvedRiskLevelCondition(values)];
    }
    if (key === 'assetCriticality') return [buildCriticalityCondition(values)];
    return isMultiValue
      ? [buildMvContainsExpression(field, values)]
      : [`${field} IN (${toList(values)})`];
  }).join(' AND ');

const buildResolvedRiskLevelQuery = (values: readonly string[]): QueryDslQueryContainer => ({
  bool: {
    should: [
      { terms: { [RESOLUTION_RISK_LEVEL_FIELD]: [...values] } },
      {
        bool: {
          filter: [{ terms: { [RISK_LEVEL_FIELD]: [...values] } }],
          must_not: [{ exists: { field: RESOLUTION_RISK_LEVEL_FIELD } }],
        },
      },
    ],
    minimum_should_match: 1,
  },
});

export const buildEntityFiltersQuery = (
  filters: EntityFilters,
  rowsMode: RowsMode = 'individual'
): QueryDslQueryContainer[] =>
  ENTITY_FILTER_FIELDS.flatMap(({ key, field }) => {
    const values: readonly string[] = filters[key];
    if (!values.length) return [];
    if (key === 'riskLevels' && rowsMode === 'resolved') {
      return [buildResolvedRiskLevelQuery(values)];
    }
    if (key === 'assetCriticality') return [buildCriticalityQuery(values)];
    return [{ terms: { [field]: [...values] } }];
  });

/** `| WHERE …` pipe clauses for NAT tile queries (empty when no filters). */
export const buildEntityFilterClauses = (filters: EntityFilters): string[] =>
  buildFilterClause(buildEntityFiltersExpression(filters));
