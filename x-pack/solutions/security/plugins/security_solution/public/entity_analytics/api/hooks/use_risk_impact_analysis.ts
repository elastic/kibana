/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../../common/lib/kibana';
import { RISK_IMPACT_URL } from '../../../../common/entity_analytics/risk_impact/constants';
import type { ProactiveRiskAnalysisResponse } from '../../../../common/entity_analytics/risk_impact/types';
import type { RiskImpactEntity } from '../../components/risk_impact_table';

interface RiskImpactEntitiesResponse {
  entities: RiskImpactEntity[];
}

/**
 * Hook to fetch risk impact analysis for a specific entity
 */
export const useRiskImpactAnalysis = (entityType: string, entityName: string) => {
  const { http } = useKibana().services;

  return useQuery<ProactiveRiskAnalysisResponse, Error>({
    queryKey: ['riskImpactAnalysis', entityType, entityName],
    queryFn: async () => {
      const response = await http.fetch<ProactiveRiskAnalysisResponse>(RISK_IMPACT_URL, {
        method: 'GET',
        query: {
          entity_type: entityType,
          entity_name: entityName,
        },
        version: '1',
      });
      return response;
    },
    enabled: Boolean(entityType && entityName),
  });
};

/**
 * Hook to fetch list of all entities with risk scores
 */
export const useRiskImpactEntities = () => {
  const { http } = useKibana().services;

  return useQuery<RiskImpactEntity[], Error>({
    queryKey: ['riskImpactEntities'],
    queryFn: async () => {
      const response = await http.fetch<RiskImpactEntitiesResponse>(RISK_IMPACT_URL, {
        method: 'GET',
        version: '1',
      });
      return response.entities;
    },
  });
};
