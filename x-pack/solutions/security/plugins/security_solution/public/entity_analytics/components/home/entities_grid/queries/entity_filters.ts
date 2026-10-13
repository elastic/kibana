/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { escapeStringValue } from '@kbn/esql-utils';
import {
  RESOLUTION_RISK_LEVEL_FIELD,
  RISK_LEVEL_FIELD,
  type EntityFilters,
  type RowsMode,
} from '../common';
import { buildFilterClause, toList } from './esql';

/** Aliaseship on multivalue keyword fields — scalar `IN` returns null for multi-valued docs. */
const buildMvContainsExpression = (field: string, values: readonly string[]): string => {
  const clauses = values.map((v) => `MV_CONTAINS(${field}, ${escapeStringValue(v)})`);
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`;
};

/** Entity doc field of each entity filter, in filter order. */
const ENTITY_FILTER_FIELDS: ReadonlyArray<{
  key: keyof EntityFilters;
  field: string;
  isMultiValue?: boolean;
  /** The column shows the resolved entity's value in resolved rows, so the filter tests the resolved entity's. */
  isResolvedEntityValue?: boolean;
}> = [
  { key: 'entityTypes', field: 'entity.EngineMetadata.Type' },
  { key: 'riskLevels', field: 'entity.risk.calculated_level' },
  { key: 'assetCriticality', field: 'asset.criticality', isResolvedEntityValue: true },
  {
    key: 'watchlists',
    field: 'entity.attributes.watchlists',
    isMultiValue: true,
    isResolvedEntityValue: true,
  },
  { key: 'dataSources', field: 'entity.source', isMultiValue: true, isResolvedEntityValue: true },
];

/** The risk level a resolved row shows: its resolved entity's, or its own when it has no resolution level. */
const RESOLVED_RISK_LEVEL = `COALESCE(${RESOLUTION_RISK_LEVEL_FIELD}, ${RISK_LEVEL_FIELD})`;

const getFilterField = (key: keyof EntityFilters, field: string, rowsMode: RowsMode): string =>
  key === 'riskLevels' && rowsMode === 'resolved' ? RESOLVED_RISK_LEVEL : field;

/**
 * ES|QL predicates of the entity filters (no leading `| WHERE`), AND-joined. For resolved rows,
 * the filters on the columns that show the resolved entity's value come apart, as they are tested on the
 * groups: see `ResolvedEntityFilterOverrides`. Individual rows test every filter on the entity.
 */
export const buildEntityFilterExpressions = (
  filters: EntityFilters,
  rowsMode: RowsMode = 'individual'
): { entityExpression?: string; resolvedEntityValueExpression?: string } => {
  const entityParts: string[] = [];
  const resolvedEntityValueParts: string[] = [];
  ENTITY_FILTER_FIELDS.forEach(({ key, field, isMultiValue, isResolvedEntityValue }) => {
    const values: readonly string[] = filters[key];
    if (!values.length) return;
    const filterField = getFilterField(key, field, rowsMode);
    const part = isMultiValue
      ? buildMvContainsExpression(filterField, values)
      : `${filterField} IN (${toList(values)})`;
    (isResolvedEntityValue && rowsMode === 'resolved'
      ? resolvedEntityValueParts
      : entityParts
    ).push(part);
  });
  return {
    entityExpression: entityParts.join(' AND ') || undefined,
    resolvedEntityValueExpression: resolvedEntityValueParts.join(' AND ') || undefined,
  };
};

/** Every entity filter as one predicate, each tested on the entity. */
export const buildEntityFiltersExpression = (
  filters: EntityFilters,
  rowsMode: RowsMode = 'individual'
): string => {
  const { entityExpression, resolvedEntityValueExpression } = buildEntityFilterExpressions(
    filters,
    rowsMode
  );
  return [entityExpression, resolvedEntityValueExpression].filter(Boolean).join(' AND ');
};

/** DSL counterpart of {@link RESOLVED_RISK_LEVEL}. */
const buildResolvedRiskLevelQuery = (levels: readonly string[]): QueryDslQueryContainer => ({
  bool: {
    should: [
      { terms: { [RESOLUTION_RISK_LEVEL_FIELD]: [...levels] } },
      {
        bool: {
          filter: [{ terms: { [RISK_LEVEL_FIELD]: [...levels] } }],
          must_not: [{ exists: { field: RESOLUTION_RISK_LEVEL_FIELD } }],
        },
      },
    ],
    minimum_should_match: 1,
  },
});

/** DSL counterpart of {@link buildEntityFiltersExpression}. */
export const buildEntityFiltersQuery = (
  filters: EntityFilters,
  rowsMode: RowsMode = 'individual'
): QueryDslQueryContainer[] =>
  ENTITY_FILTER_FIELDS.flatMap(({ key, field }) => {
    const values: readonly string[] = filters[key];
    if (!values.length) return [];
    return key === 'riskLevels' && rowsMode === 'resolved'
      ? [buildResolvedRiskLevelQuery(values)]
      : [{ terms: { [field]: [...values] } }];
  });

export const buildEntityFilterClauses = (
  filters: EntityFilters,
  rowsMode: RowsMode = 'individual'
): string[] => buildFilterClause(buildEntityFiltersExpression(filters, rowsMode));
