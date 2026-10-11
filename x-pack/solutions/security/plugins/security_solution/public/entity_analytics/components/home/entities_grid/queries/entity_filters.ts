/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityFilters } from '../common';
import { buildFilterClause, esc, toList } from './esql';

/** Membership on multivalue keyword fields — scalar `IN` returns null for multi-valued docs. */
const buildMvContainsExpression = (field: string, values: readonly string[]): string => {
  const clauses = values.map((v) => `MV_CONTAINS(${field}, ${esc(v)})`);
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`;
};

/** Entity doc field of each entity filter, in filter order. */
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

/** AND-joined ES|QL predicate for URL entity filters (no leading `| WHERE`). */
export const buildEntityFiltersExpression = (filters: EntityFilters): string =>
  ENTITY_FILTER_FIELDS.flatMap(({ key, field, isMultiValue }) => {
    const values: readonly string[] = filters[key];
    if (!values.length) return [];
    return isMultiValue
      ? [buildMvContainsExpression(field, values)]
      : [`${field} IN (${toList(values)})`];
  }).join(' AND ');

/** DSL counterpart of {@link buildEntityFiltersExpression}. */
export const buildEntityFiltersQuery = (filters: EntityFilters): QueryDslQueryContainer[] =>
  ENTITY_FILTER_FIELDS.flatMap(({ key, field }) => {
    const values: readonly string[] = filters[key];
    return values.length ? [{ terms: { [field]: [...values] } }] : [];
  });

/** `| WHERE …` pipe clauses for NAT tile queries (empty when no filters). */
export const buildEntityFilterClauses = (filters: EntityFilters): string[] =>
  buildFilterClause(buildEntityFiltersExpression(filters));
