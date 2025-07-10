/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIConnector } from '@kbn/elastic-assistant';
import type {
  GenerationInterval,
  GetAttackDiscoveryGenerationsResponse,
} from '@kbn/elastic-assistant-common';
import { EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { getApproximateFutureTime } from './get_approximate_future_time';
import { getConnectorNameFromId } from '../../../utils/get_connector_name_from_id';
import { LoadingCallout } from '../../../loading_callout';

const N_LATEST_NON_DISMISSED_GENERATIONS = 5; // show only the latest n non-dismissed generations

const EMPTY_INTERVALS: GenerationInterval[] = [];

interface Props {
  aiConnectors: AIConnector[] | undefined;
  data: GetAttackDiscoveryGenerationsResponse | undefined;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  refetchGenerations: () => void;
}

const GenerationsComponent: React.FC<Props> = ({
  aiConnectors,
  data,
  localStorageAttackDiscoveryMaxAlerts,
  refetchGenerations,
}) => {
  const callouts = useMemo(
    () =>
      data?.generations
        .filter(({ status }) => status !== 'dismissed') // filter out dismissed generations
        .slice(0, N_LATEST_NON_DISMISSED_GENERATIONS) // limit display to a handful of the latest, non-dismissed generations
        .map(
          (
            {
              alerts_context_count: alertsContextCount,
              discoveries,
              end: generationEndTime,
              connector_stats: connectorStats,
              connector_id: connectorId,
              execution_uuid: executionUuid,
              loading_message: loadingMessage,
              reason,
              start,
              status,
            },
            i
          ) => (
            <div data-test-subj="generations" key={executionUuid}>
              <LoadingCallout
                alertsContextCount={alertsContextCount ?? null}
                approximateFutureTime={getApproximateFutureTime({
                  averageSuccessfulDurationNanoseconds:
                    connectorStats?.average_successful_duration_nanoseconds,
                  generationStartTime: start,
                })}
                averageSuccessfulDurationNanoseconds={
                  connectorStats?.average_successful_duration_nanoseconds
                }
                connectorIntervals={EMPTY_INTERVALS}
                connectorName={getConnectorNameFromId({
                  aiConnectors,
                  connectorId,
                })}
                discoveries={discoveries}
                executionUuid={executionUuid}
                generationEndTime={generationEndTime}
                localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
                loadingMessage={loadingMessage}
                refetchGenerations={refetchGenerations}
                reason={reason}
                status={status}
                successfulGenerations={connectorStats?.successful_generations}
              />

              {i < data?.generations.length - 1 && <EuiSpacer size="s" />}
            </div>
          )
        ) ?? null,
    [aiConnectors, data?.generations, localStorageAttackDiscoveryMaxAlerts, refetchGenerations]
  );

  return callouts;
};

GenerationsComponent.displayName = 'Generations';

export const Generations = React.memo(GenerationsComponent);
