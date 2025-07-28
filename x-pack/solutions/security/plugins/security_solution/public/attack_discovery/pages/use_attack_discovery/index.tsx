/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAssistantContext, useLoadConnectors } from '@kbn/elastic-assistant';
import type {
  AttackDiscoveries,
  Replacements,
  GenerationInterval,
  AttackDiscoveryStats,
} from '@kbn/elastic-assistant-common';
import {
  AttackDiscoveryPostResponse,
  API_VERSIONS,
  ATTACK_DISCOVERY,
} from '@kbn/elastic-assistant-common';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useState } from 'react';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';

import { usePollApi } from './use_poll_api/use_poll_api';
import { useKibana } from '../../../common/lib/kibana';
import { getErrorToastText } from '../helpers';
import { getGenAiConfig, getRequestBody } from './helpers';
import { CONNECTOR_ERROR, ERROR_GENERATING_ATTACK_DISCOVERIES } from '../translations';
import * as i18n from './translations';
import { useInvalidateGetAttackDiscoveryGenerations } from '../use_get_attack_discovery_generations';
import { useKibanaFeatureFlags } from '../use_kibana_feature_flags';

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
  alertsContextCount: number | null;
  approximateFutureTime: Date | null;
  attackDiscoveries: AttackDiscoveries;
  didInitialFetch: boolean;
  failureReason: string | null;
  fetchAttackDiscoveries: (options?: FetchAttackDiscoveriesOptions) => Promise<void>;
  generationIntervals: GenerationInterval[] | undefined;
  isLoading: boolean;
  isLoadingPost: boolean;
  lastUpdated: Date | null;
  onCancel: () => Promise<void>;
  replacements: Replacements;
  stats: AttackDiscoveryStats | null;
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
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();
  // get Kibana services and connectors
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { data: aiConnectors } = useLoadConnectors({
    http,
  });

  // generation can take a long time, so we calculate an approximate future time:
  const [approximateFutureTime, setApproximateFutureTime] = useState<Date | null>(null);
  // whether post request is loading (dont show actions)
  const [isLoadingPost, setIsLoadingPost] = useState<boolean>(false);
  const {
    cancelAttackDiscovery,
    data: pollData,
    pollApi,
    status: pollStatus,
    setStatus: setPollStatus,
    didInitialFetch,
    stats,
  } = usePollApi({ http, setApproximateFutureTime, toasts, connectorId });

  // loading boilerplate:
  const [isLoading, setIsLoading] = useState(false);

  // get alerts index pattern and allow lists from the assistant context:
  const { alertsIndexPattern, traceOptions } = useAssistantContext();

  const { data: anonymizationFields } = useFetchAnonymizationFields();

  const [generationIntervals, setGenerationIntervals] = React.useState<GenerationInterval[]>([]);
  const [attackDiscoveries, setAttackDiscoveries] = useState<AttackDiscoveries>([]);
  const [replacements, setReplacements] = useState<Replacements>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);

  // number of alerts sent as context to the LLM:
  const [alertsContextCount, setAlertsContextCount] = useState<number | null>(null);

  useEffect(() => {
    if (
      !attackDiscoveryAlertsEnabled &&
      connectorId != null &&
      connectorId !== '' &&
      aiConnectors != null &&
      aiConnectors.length > 0
    ) {
      pollApi();
      setLoadingConnectorId?.(connectorId);
      setAlertsContextCount(null);
      setFailureReason(null);
      setLastUpdated(null);
      setReplacements({});
      setAttackDiscoveries([]);
      setGenerationIntervals([]);
      setPollStatus(null);
    }
  }, [
    aiConnectors,
    attackDiscoveryAlertsEnabled,
    connectorId,
    pollApi,
    setLoadingConnectorId,
    setPollStatus,
  ]);

  useEffect(() => {
    if (attackDiscoveryAlertsEnabled) {
      return;
    }

    if (pollStatus === 'running') {
      setIsLoading(true);
      setLoadingConnectorId?.(connectorId ?? null);
    } else {
      setIsLoading(false);
      setLoadingConnectorId?.(null);
    }
  }, [pollStatus, connectorId, setLoadingConnectorId, attackDiscoveryAlertsEnabled]);

  useEffect(() => {
    if (attackDiscoveryAlertsEnabled) {
      return;
    }

    if (pollData !== null && pollData.connectorId === connectorId) {
      if (pollData.alertsContextCount != null) setAlertsContextCount(pollData.alertsContextCount);
      if (pollData.attackDiscoveries.length && pollData.attackDiscoveries[0].timestamp != null) {
        // get last updated from timestamp, not from updatedAt since this can indicate the last time the status was updated
        setLastUpdated(new Date(pollData.attackDiscoveries[0].timestamp));
      }
      if (pollData.replacements) setReplacements(pollData.replacements);
      if (pollData.status === 'failed' && pollData.failureReason) {
        setFailureReason(pollData.failureReason);
      } else {
        setFailureReason(null);
      }
      setAttackDiscoveries(pollData.attackDiscoveries);
      setGenerationIntervals(pollData.generationIntervals);
    }
  }, [attackDiscoveryAlertsEnabled, connectorId, pollData]);

  const invalidateGetAttackDiscoveryGenerations = useInvalidateGetAttackDiscoveryGenerations();

  /** The callback when users click the Generate button */
  const fetchAttackDiscoveries = useCallback(
    async (options: FetchAttackDiscoveriesOptions | undefined) => {
      try {
        const effectiveSize = options?.overrideSize ?? options?.size ?? size;
        if (effectiveSize != null) {
          setAlertsContextCount(effectiveSize);
        }

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
        // sets isLoading to true
        setPollStatus('running');
        setIsLoadingPost(true);
        setApproximateFutureTime(null);

        // call the internal API to generate attack discoveries:
        const rawResponse = await http.post(ATTACK_DISCOVERY, {
          body: JSON.stringify(bodyWithOverrides),
          version: API_VERSIONS.internal.v1,
        });

        setIsLoadingPost(false);
        const parsedResponse = AttackDiscoveryPostResponse.safeParse(rawResponse);

        if (!parsedResponse.success) {
          throw new Error('Failed to parse the response');
        }

        if (attackDiscoveryAlertsEnabled) {
          toasts?.addSuccess({
            title: i18n.GENERATION_STARTED_TITLE,
            text: i18n.GENERATION_STARTED_TEXT(effectiveConnector?.name ?? connectorName),
          });
        }
      } catch (error) {
        setIsLoadingPost(false);
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
      attackDiscoveryAlertsEnabled,
      connectorId,
      connectorName,
      http,
      invalidateGetAttackDiscoveryGenerations,
      setLoadingConnectorId,
      setPollStatus,
      size,
      toasts,
      traceOptions,
    ]
  );

  return {
    alertsContextCount,
    approximateFutureTime,
    attackDiscoveries,
    didInitialFetch,
    failureReason,
    fetchAttackDiscoveries,
    generationIntervals,
    isLoading,
    isLoadingPost,
    lastUpdated,
    onCancel: cancelAttackDiscovery,
    replacements,
    stats,
  };
};
