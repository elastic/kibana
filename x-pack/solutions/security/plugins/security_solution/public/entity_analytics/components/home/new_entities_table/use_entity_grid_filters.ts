/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { convertFiltersToESQLExpression, convertQueryToESQLExpression } from '@kbn/esql-utils';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store';
import { useEntityAnalyticsUrlState } from './use_entity_analytics_url_state';
import type { EntityFilters } from './use_entity_analytics_url_state';
import { esc, toList } from './common';

/** Membership on multivalue keyword fields — scalar `IN` returns null for multi-valued docs. */
const buildMvContainsExpression = (field: string, values: string[]): string => {
  const clauses = values.map((v) => `MV_CONTAINS(${field}, ${esc(v)})`);
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`;
};

const buildEntityFiltersExpression = (filters: EntityFilters): string => {
  const parts: string[] = [];

  if (filters.entityTypes.length)
    parts.push(`entity.EngineMetadata.Type IN (${toList(filters.entityTypes)})`);
  if (filters.riskLevels.length)
    parts.push(`entity.risk.calculated_level IN (${toList(filters.riskLevels)})`);
  if (filters.assetCriticality.length)
    parts.push(`asset.criticality IN (${toList(filters.assetCriticality)})`);
  if (filters.watchlists.length)
    parts.push(buildMvContainsExpression('entity.attributes.watchlists', filters.watchlists));
  if (filters.dataSources.length)
    parts.push(buildMvContainsExpression('entity.source', filters.dataSources));

  return parts.join(' AND ');
};

export const useEntityGridFilters = () => {
  const getGlobalFilters = useMemo(() => inputsSelectors.globalFiltersQuerySelector(), []);
  const getGlobalQuery = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalFilters = useDeepEqualSelector(getGlobalFilters);
  const globalQuery = useDeepEqualSelector(getGlobalQuery);
  const { entityFilters } = useEntityAnalyticsUrlState();

  return useMemo(() => {
    const { esqlExpression: filterBarExpr } = convertFiltersToESQLExpression(globalFilters);
    const queryExpr = convertQueryToESQLExpression(globalQuery);
    const entityExpr = buildEntityFiltersExpression(entityFilters);
    const parts = [filterBarExpr, queryExpr, entityExpr].filter(Boolean);
    return { whereExpression: parts.length ? parts.join(' AND ') : undefined };
  }, [globalFilters, globalQuery, entityFilters]);
};
