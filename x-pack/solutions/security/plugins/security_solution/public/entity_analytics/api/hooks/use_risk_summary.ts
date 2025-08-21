/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useEntityAnalyticsRoutes } from '../api';

export const useRiskScoreAiSummary = ({
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
  const { fetchRiskScoreAiSummary } = useEntityAnalyticsRoutes();

  return useQuery(
    ['EA_LLM_RISK_SUMMARY', identifier, identifierKey],
    () => {
      return fetchRiskScoreAiSummary({
        identifier,
        identifierKey,
        connectorId,
      });
    },
    {
      enabled: enabled && !!identifier && !!identifierKey && !!connectorId,
      staleTime: Infinity,
      cacheTime: Infinity,
    }
  );
};
