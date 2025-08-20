/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useLoadConnectors } from '@kbn/elastic-assistant';
import { useKibana } from '../../../common/lib/kibana';
import { useEntityAnalyticsRoutes } from '../api';

export const useRiskScoreSpikesAiSummary = ({
  identifier,
  identifierKey,
  connectorId = '',
  enabled = true,
}: {
  identifier: string;
  identifierKey: string;
  connectorId?: string;
  enabled?: boolean;
}) => {
  const { fetchRiskScoreSpikesAiSummary } = useEntityAnalyticsRoutes();
  const { http } = useKibana().services;
  const { data: aiConnectors = [] } = useLoadConnectors({
    http,
  });

  const connector = useMemo(
    () => aiConnectors.find(({ id }) => id === connectorId) ?? aiConnectors[0],
    [aiConnectors, connectorId]
  );
  return useQuery(
    ['EA_LLM_RISK_SPIKES', identifier, identifierKey],
    () => {
      const { actionTypeId } = connector;

      return fetchRiskScoreSpikesAiSummary({
        identifier,
        identifierKey,
        apiConfig: {
          connectorId,
          actionTypeId,
        },
      });
    },
    {
      enabled: enabled && !!identifier && !!identifierKey && !!connectorId,
      staleTime: Infinity,
      cacheTime: Infinity,
    }
  );
};
