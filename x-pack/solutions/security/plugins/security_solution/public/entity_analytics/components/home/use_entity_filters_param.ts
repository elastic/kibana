/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { EntityType } from '../../../../common/entity_analytics/types';
import type { RiskSeverity } from '../../../../common/search_strategy';

export interface EntityFilters {
  entityTypes: EntityType[];
  riskLevels: RiskSeverity[];
  assetCriticality: string[];
  watchlists: string[];
  dataSources: string[];
}

const FILTER_FIELDS = [
  ['entityTypes', 'entity.EngineMetadata.Type'],
  ['riskLevels', 'entity.risk.calculated_level'],
  ['assetCriticality', 'asset.criticality'],
  ['watchlists', 'entity.attributes.watchlists'],
  ['dataSources', 'entity.source'],
] as const satisfies ReadonlyArray<[key: keyof EntityFilters, esField: string]>;

const parseArray = (params: URLSearchParams, key: keyof EntityFilters): string[] => {
  const val = params.get(key);
  return val ? val.split(',').filter(Boolean) : [];
};

export interface EntityFilterTerm {
  terms: Record<string, string[]>;
}

export const getEntityFilterTerms = (filters: EntityFilters): EntityFilterTerm[] =>
  FILTER_FIELDS.filter(([key]) => filters[key].length).map(([key, field]) => ({
    terms: { [field]: filters[key] as string[] },
  }));

interface EntityFiltersResult {
  entityFilters: EntityFilters;
  setEntityFilters: (filters: EntityFilters) => void;
}

export const useEntityFiltersParam = (): EntityFiltersResult => {
  const { search } = useLocation();
  const history = useHistory();

  const entityFilters = useMemo((): EntityFilters => {
    const params = new URLSearchParams(search);
    return {
      entityTypes: parseArray(params, 'entityTypes') as EntityType[],
      riskLevels: parseArray(params, 'riskLevels') as RiskSeverity[],
      assetCriticality: parseArray(params, 'assetCriticality'),
      watchlists: parseArray(params, 'watchlists'),
      dataSources: parseArray(params, 'dataSources'),
    };
  }, [search]);

  const setEntityFilters = useCallback(
    (next: EntityFilters) => {
      const params = new URLSearchParams(history.location.search);
      for (const [key] of FILTER_FIELDS) {
        const arr = next[key];
        if (arr.length) params.set(key, arr.join(','));
        else params.delete(key);
      }
      history.replace({ ...history.location, search: params.toString() });
    },
    [history]
  );

  return { entityFilters, setEntityFilters };
};
