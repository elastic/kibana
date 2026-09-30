/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { getEntityAnalyticsEntityTypes } from '../../../../common/entity_analytics/utils';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { SEVERITY_UI_SORT_ORDER } from '../../common/utils';
import { ValidCriticalityLevels } from '../../../../common/entity_analytics/asset_criticality/constants';

export interface EntityFilters {
  entityTypes: EntityType[];
  riskLevels: RiskSeverity[];
  assetCriticality: string[];
  watchlists: string[];
  dataSources: string[];
}

const FILTER_FIELDS = [
  'entityTypes',
  'riskLevels',
  'assetCriticality',
  'watchlists',
  'dataSources',
] as const satisfies ReadonlyArray<keyof EntityFilters>;

const VALID_ENTITY_TYPES = new Set<string>(getEntityAnalyticsEntityTypes());
const VALID_RISK_LEVELS = new Set<string>(SEVERITY_UI_SORT_ORDER);
const VALID_CRITICALITY = new Set<string>(ValidCriticalityLevels);

const parseArray = (params: URLSearchParams, key: keyof EntityFilters): string[] => {
  const val = params.get(key);
  return val ? val.split(',').filter(Boolean) : [];
};

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
      entityTypes: parseArray(params, 'entityTypes').filter((v): v is EntityType =>
        VALID_ENTITY_TYPES.has(v)
      ),
      riskLevels: parseArray(params, 'riskLevels').filter((v): v is RiskSeverity =>
        VALID_RISK_LEVELS.has(v)
      ),
      assetCriticality: parseArray(params, 'assetCriticality').filter((v) =>
        VALID_CRITICALITY.has(v)
      ),
      watchlists: parseArray(params, 'watchlists'),
      dataSources: parseArray(params, 'dataSources'),
    };
  }, [search]);

  const setEntityFilters = useCallback(
    (next: EntityFilters) => {
      const params = new URLSearchParams(history.location.search);
      for (const key of FILTER_FIELDS) {
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
