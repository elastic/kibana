/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAssistantContext } from '@kbn/elastic-assistant';
import { isEmpty } from 'lodash/fp';
import { useCallback, useState } from 'react';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';

import { useKibana } from '../../../common/lib/kibana';
import { AttackDiscoveryEventTypes } from '../../../common/lib/telemetry';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { getErrorToastText } from '../helpers';
import { callInternalGenerateApi, callPublicGenerateApi, getRequestBody } from './helpers';
import {
  ALERTS_INDEX_PATTERN_ERROR,
  CONNECTOR_ERROR,
  ERROR_GENERATING_ATTACK_DISCOVERIES,
} from '../translations';
import * as i18n from './translations';
import { useInvalidateGetAttackDiscoveryGenerations } from '../use_get_attack_discovery_generations';

interface FetchAttackDiscoveriesOptions {
  end?: string;
  filter?: Record<string, unknown>;
  overrideConnectorId?: string;
  overrideConnectorName?: string;
  overrideEnd?: string;
  overrideFilter?: Record<string, unknown>;
  overrideSize?: number;
  overrideStart?: string;
  size?: number;
  start?: string;
  trigger?: 'manual' | 'save_and_run';
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
    featureFlags,
    http,
    notifications: { toasts },
    telemetry,
  } = useKibana().services;

  // Get current space ID for workflow configuration
  const spaceId = useSpaceId();

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
        const effectiveTrigger = options?.trigger ?? 'manual';

        if (!effectiveConnectorId) {
          throw new Error(CONNECTOR_ERROR);
        }

        const effectiveRequestBody = getRequestBody({
          alertsIndexPattern,
          anonymizationFields,
          connectorId: effectiveConnectorId,
          size,
          traceOptions,
        });

        const bodyWithOverrides = {
          ...effectiveRequestBody,
          connectorName,
          end: effectiveEnd,
          filter: effectiveFilter,
          size: effectiveSize,
          start: effectiveStart,
        };
        setLoadingConnectorId?.(effectiveConnectorId ?? null);

        // Check if workflow integration feature flag is enabled
        const attackDiscoveryWorkflowsEnabled = await featureFlags.getBooleanValue(
          'securitySolution.attackDiscoveryWorkflowsEnabled',
          false
        );

        // Call appropriate API based on feature flag
        if (attackDiscoveryWorkflowsEnabled) {
          if (!alertsIndexPattern) {
            throw new Error(ALERTS_INDEX_PATTERN_ERROR);
          }

          telemetry.reportEvent(AttackDiscoveryEventTypes.GenerationStarted, {
            execution_mode: 'workflow',
            trigger: effectiveTrigger,
          });

          await callInternalGenerateApi({
            alertsIndexPattern,
            apiConfig: {
              actionTypeId: bodyWithOverrides.apiConfig.actionTypeId,
              connectorId: bodyWithOverrides.apiConfig.connectorId,
              model: bodyWithOverrides.apiConfig.model,
            },
            end: effectiveEnd,
            filter: effectiveFilter,
            http,
            size: effectiveSize,
            spaceId: spaceId ?? null,
            start: effectiveStart,
          });
        } else {
          telemetry.reportEvent(AttackDiscoveryEventTypes.GenerationStarted, {
            execution_mode: 'legacy',
            trigger: effectiveTrigger,
          });

          await callPublicGenerateApi({
            body: bodyWithOverrides,
            http,
          });
        }

        // Show success toast
        toasts?.addSuccess({
          text: i18n.GENERATION_STARTED_TEXT(options?.overrideConnectorName ?? connectorName),
          title: i18n.GENERATION_STARTED_TITLE,
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
      alertsIndexPattern,
      anonymizationFields,
      connectorId,
      connectorName,
      featureFlags,
      http,
      invalidateGetAttackDiscoveryGenerations,
      setLoadingConnectorId,
      size,
      spaceId,
      telemetry,
      toasts,
      traceOptions,
    ]
  );

  return {
    fetchAttackDiscoveries,
    isLoading,
  };
};
