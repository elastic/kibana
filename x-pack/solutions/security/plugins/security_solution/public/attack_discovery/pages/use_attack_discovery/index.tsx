/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAssistantContext, useLoadConnectors } from '@kbn/elastic-assistant';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_GENERATE,
  PostAttackDiscoveryGenerateResponse,
} from '@kbn/elastic-assistant-common';
import { isEmpty } from 'lodash/fp';
import { useCallback, useState } from 'react';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';

import { useKibana } from '../../../common/lib/kibana';
import { getErrorToastText } from '../helpers';
import { getGenAiConfig, getRequestBody } from './helpers';
import { CONNECTOR_ERROR, ERROR_GENERATING_ATTACK_DISCOVERIES } from '../translations';
import * as i18n from './translations';
import { useInvalidateGetAttackDiscoveryGenerations } from '../use_get_attack_discovery_generations';

interface FetchAttackDiscoveriesOptions {
  end?: string;
  filter?: Record<string, unknown>;
  overrideConnectorId?: string;
  overrideEnd?: string;
  overrideFilter?: Record<string, unknown>;
  overrideSize?: number;
  overrideStart?: string;
  size?: number;
  start?: string;
}

export interface UseAttackDiscovery {
  fetchAttackDiscoveries: (options?: FetchAttackDiscoveriesOptions) => Promise<void>;
  isLoading: boolean;
}

export const useAttackDiscovery = ({
  connectorId,
  connectorName,
  size,
  setLoadingConnectorId,
}: {
  connectorId: string | undefined;
  connectorName?: string;
  size: number;
  setLoadingConnectorId?: (loadingConnectorId: string | null) => void;
}): UseAttackDiscovery => {
  // get Kibana services and connectors
  const {
    http,
    notifications: { toasts },
    settings,
  } = useKibana().services;

  const { data: aiConnectors } = useLoadConnectors({
    http,
    settings,
  });

  // loading boilerplate:
  const [isLoading, setIsLoading] = useState(false);

  // get alerts index pattern and allow lists from the assistant context:
  const { alertsIndexPattern, traceOptions } = useAssistantContext();

  const { data: anonymizationFields } = useFetchAnonymizationFields();

  const invalidateGetAttackDiscoveryGenerations = useInvalidateGetAttackDiscoveryGenerations();

  /** The callback when users click the Generate button */
  const fetchAttackDiscoveries = useCallback(
    async (options: FetchAttackDiscoveriesOptions | undefined) => {
      try {
        const effectiveSize = options?.overrideSize ?? options?.size ?? size;

        const effectiveEnd = options?.overrideEnd ?? options?.end;
        const effectiveFilter =
          options?.overrideFilter ?? (!isEmpty(options?.filter) ? options?.filter : undefined);
        const effectiveStart = options?.overrideStart ?? options?.start;
        const effectiveConnectorId = options?.overrideConnectorId ?? connectorId;

        // Get the request body with the effective connector ID
        const effectiveConnector = aiConnectors?.find(
          (connector) => connector.id === effectiveConnectorId
        );
        const effectiveGenAiConfig = getGenAiConfig(effectiveConnector);
        const effectiveRequestBody = getRequestBody({
          alertsIndexPattern,
          anonymizationFields,
          genAiConfig: effectiveGenAiConfig,
          size,
          selectedConnector: effectiveConnector,
          traceOptions,
        });

        const bodyWithOverrides = {
          ...effectiveRequestBody,
          connectorName: effectiveConnector?.name ?? connectorName,
          end: effectiveEnd,
          filter: effectiveFilter,
          size: effectiveSize,
          start: effectiveStart,
        };

        if (
          bodyWithOverrides.apiConfig.connectorId === '' ||
          bodyWithOverrides.apiConfig.actionTypeId === ''
        ) {
          throw new Error(CONNECTOR_ERROR);
        }
        setLoadingConnectorId?.(effectiveConnectorId ?? null);

        // call the API to generate attack discoveries:
        const rawResponse = await http.post(ATTACK_DISCOVERY_GENERATE, {
          body: JSON.stringify(bodyWithOverrides),
          version: API_VERSIONS.public.v1,
        });

        const parsedResponse = PostAttackDiscoveryGenerateResponse.safeParse(rawResponse);

        if (!parsedResponse.success) {
          throw new Error('Failed to parse the response');
        }

        toasts?.addSuccess({
          title: i18n.GENERATION_STARTED_TITLE,
          text: i18n.GENERATION_STARTED_TEXT(effectiveConnector?.name ?? connectorName),
        });
      } catch (error) {
        setIsLoading(false);
        toasts?.addDanger(error, {
          title: ERROR_GENERATING_ATTACK_DISCOVERIES,
          text: getErrorToastText(error),
        });
      } finally {
        invalidateGetAttackDiscoveryGenerations();
      }
    },
    [
      aiConnectors,
      alertsIndexPattern,
      anonymizationFields,
      connectorId,
      connectorName,
      http,
      invalidateGetAttackDiscoveryGenerations,
      setLoadingConnectorId,
      size,
      toasts,
      traceOptions,
    ]
  );

  return {
    fetchAttackDiscoveries,
    isLoading,
  };
};
