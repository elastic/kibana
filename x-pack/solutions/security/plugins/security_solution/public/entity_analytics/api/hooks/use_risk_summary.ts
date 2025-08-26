/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { GenAiConfig } from '@kbn/elastic-assistant/impl/connectorland/helpers';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import type { TraceOptions } from '@kbn/elastic-assistant/impl/assistant/types';
import { isEmpty } from 'lodash/fp';
import { useEntityAnalyticsRoutes } from '../api';

export const useRiskScoreAiSummary = ({
  identifier,
  identifierKey,

  enabled = true,

  alertsIndexPattern,
  anonymizationFields,
  genAiConfig,
  size,
  start,
  end,
  selectedConnector,
  traceOptions,
}: {
  identifier: string;
  identifierKey: string;
  enabled?: boolean;
  alertsIndexPattern: string | undefined;
  anonymizationFields: {
    page: number;
    perPage: number;
    total: number;
    data: Array<{
      id: string;
      field: string;
      timestamp?: string | undefined;
      allowed?: boolean | undefined;
      anonymized?: boolean | undefined;
      updatedAt?: string | undefined;
      updatedBy?: string | undefined;
      createdAt?: string | undefined;
      createdBy?: string | undefined;
      namespace?: string | undefined;
    }>;
  };
  genAiConfig?: GenAiConfig;
  size: number;
  start: string;
  end: string;
  selectedConnector?: ActionConnector;
  traceOptions: TraceOptions;
}) => {
  const { fetchRiskScoreAiSummary } = useEntityAnalyticsRoutes();
  const connectorId = selectedConnector?.id ?? '';

  return useQuery(
    ['EA_LLM_RISK_SUMMARY', identifier, identifierKey],
    () => {
      return fetchRiskScoreAiSummary({
        identifier,
        identifierKey,

        alertsIndexPattern: alertsIndexPattern ?? '',
        anonymizationFields: anonymizationFields?.data ?? [],
        replacements: {}, // no need to re-use replacements in the current implementation
        size,
        start,
        end,
        apiConfig: {
          connectorId,
          actionTypeId: selectedConnector?.actionTypeId ?? '',
          provider: genAiConfig?.apiProvider,
          model: genAiConfig?.defaultModel,
        },
        langSmithProject: isEmpty(traceOptions?.langSmithProject)
          ? undefined
          : traceOptions?.langSmithProject,
        langSmithApiKey: isEmpty(traceOptions?.langSmithApiKey)
          ? undefined
          : traceOptions?.langSmithApiKey,
      });
    },
    {
      enabled: enabled && !!identifier && !!identifierKey && !!connectorId,
      staleTime: Infinity,
      cacheTime: Infinity,
    }
  );
};
