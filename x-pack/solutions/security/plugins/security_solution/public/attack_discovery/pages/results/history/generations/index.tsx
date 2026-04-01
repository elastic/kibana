/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIConnector } from '@kbn/elastic-assistant';
import type { GetAttackDiscoveryGenerationsResponse } from '@kbn/elastic-assistant-common';
import { EuiSpacer } from '@elastic/eui';
import type { ErrorCategory } from '@kbn/discoveries-schemas';
import React, { useMemo } from 'react';

import { getApproximateFutureTime } from './get_approximate_future_time';
import { getConnectorNameFromId } from '../../../utils/get_connector_name_from_id';
import { LoadingCallout } from '../../../loading_callout';

const N_LATEST_NON_DISMISSED_GENERATIONS = 5; // show only the latest n non-dismissed generations

interface Props {
  aiConnectors: AIConnector[] | undefined;
  data: GetAttackDiscoveryGenerationsResponse | undefined;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  onRefresh?: () => void;
  refetchGenerations: () => void;
}

const GenerationsComponent: React.FC<Props> = ({
  aiConnectors,
  data,
  localStorageAttackDiscoveryMaxAlerts,
  onRefresh,
  refetchGenerations,
}) => {
  const callouts = useMemo(
    () =>
      data?.generations
        .filter(({ status }) => status !== 'dismissed') // filter out dismissed generations
        .slice(0, N_LATEST_NON_DISMISSED_GENERATIONS) // limit display to a handful of the latest, non-dismissed generations
        .map((generation, i) => {
          const {
            alerts_context_count: alertsContextCount,
            connector_id: connectorId,
            connector_stats: connectorStats,
            discoveries,
            duplicates_dropped_count: duplicatesDroppedCount,
            end: generationEndTime,
            error_category: errorCategoryRaw,
            execution_uuid: executionUuid,
            failed_workflow_id: failedWorkflowId,
            generated_count: generatedCount,
            hallucinations_filtered_count: hallucinationsFilteredCount,
            loading_message: loadingMessage,
            persisted_count: persistedCount,
            reason,
            start,
            status,
            step_event_actions: stepEventActions,
            workflow_executions: workflowExecutions,
            workflow_id: workflowId,
            workflow_run_id: workflowRunId,
          } = generation;

          // Cast the raw string from the API schema to the canonical ErrorCategory union.
          // The server writes only known ErrorCategory values; unknown strings fall back
          // to undefined so classifyFailure will use regex classification instead.
          const errorCategory = errorCategoryRaw as ErrorCategory | undefined;

          return (
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
                connectorName={getConnectorNameFromId({
                  aiConnectors,
                  connectorId,
                })}
                discoveries={discoveries}
                duplicatesDroppedCount={duplicatesDroppedCount}
                errorCategory={errorCategory}
                eventActions={stepEventActions ?? null}
                executionUuid={executionUuid}
                failedWorkflowId={failedWorkflowId}
                generatedCount={generatedCount}
                generationEndTime={generationEndTime}
                hallucinationsFilteredCount={hallucinationsFilteredCount}
                localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
                loadingMessage={loadingMessage}
                onRefresh={onRefresh}
                persistedCount={persistedCount}
                refetchGenerations={refetchGenerations}
                reason={reason}
                status={status}
                successfulGenerations={connectorStats?.successful_generations}
                workflowId={workflowId}
                workflowExecutions={workflowExecutions}
                workflowRunId={workflowRunId}
              />

              {i < data?.generations.length - 1 && <EuiSpacer size="s" />}
            </div>
          );
        }) ?? null,
    [
      aiConnectors,
      data?.generations,
      localStorageAttackDiscoveryMaxAlerts,
      onRefresh,
      refetchGenerations,
    ]
  );

  return callouts;
};

GenerationsComponent.displayName = 'Generations';

export const Generations = React.memo(GenerationsComponent);
