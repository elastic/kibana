/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { escapeStringValue } from '@kbn/esql-utils';
import { RESOLUTION_RISK_LEVEL_FIELD, RISK_LEVEL_FIELD } from '../common';
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
  { key: 'assetCriticality', field: 'asset.criticality' },
  { key: 'watchlists', field: 'entity.attributes.watchlists', isMultiValue: true },
  { key: 'dataSources', field: 'entity.source', isMultiValue: true },
];

/** The risk level a resolved row shows: its resolved entity's, or its own when it has no resolution level. */
const RESOLVED_RISK_LEVEL = `COALESCE(${RESOLUTION_RISK_LEVEL_FIELD}, ${RISK_LEVEL_FIELD})`;

const getFilterField = (key: keyof EntityFilters, field: string, rowsMode: RowsMode): string =>
  key === 'riskLevels' && rowsMode === 'resolved' ? RESOLVED_RISK_LEVEL : field;

/** AND-joined ES|QL predicate for URL entity filters (no leading `| WHERE`). */
export const buildEntityFiltersExpression = (
  filters: EntityFilters,
  rowsMode: RowsMode = 'individual'
): string =>
  ENTITY_FILTER_FIELDS.flatMap(({ key, field, isMultiValue }) => {
    const values: readonly string[] = filters[key];
    if (!values.length) return [];
    const filterField = getFilterField(key, field, rowsMode);
    return isMultiValue
      ? [buildMvContainsExpression(filterField, values)]
      : [`${filterField} IN (${toList(values)})`];
  }).join(' AND ');

export const buildEntityFiltersQuery = (filters: EntityFilters): QueryDslQueryContainer[] =>
  ENTITY_FILTER_FIELDS.flatMap(({ key, field }) => {
    const values: readonly string[] = filters[key];
    return values.length ? [{ terms: { [field]: [...values] } }] : [];
  });

/** `| WHERE …` pipe clauses for NAT tile queries (empty when no filters). */
export const buildEntityFilterClauses = (filters: EntityFilters): string[] =>
  buildFilterClause(buildEntityFiltersExpression(filters));
