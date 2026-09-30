/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIConnector } from '@kbn/elastic-assistant';
import type { AttackDiscoveryGeneration } from '@kbn/elastic-assistant-common';
import type { ErrorCategory } from '@kbn/discoveries-schemas';

import { getApproximateFutureTime } from '../../../../attack_discovery/pages/results/history/generations/get_approximate_future_time';
import { getConnectorNameFromId } from '../../../../attack_discovery/pages/utils/get_connector_name_from_id';
import { getGenAiConfig } from '../../../../attack_discovery/pages/use_attack_discovery/helpers';
import type { WorkflowExecutionDetailsProps } from '../../../../attack_discovery/pages/loading_callout/workflow_execution_details_flyout/workflow_execution_details';

/**
 * Maps a single {@link AttackDiscoveryGeneration} to the props consumed by
 * `WorkflowExecutionDetails`. Mirrors the per-generation destructuring in the
 * `Generations` component (which feeds `LoadingCallout`) so the control center's
 * detail view matches the inline Attack Discovery experience.
 *
 * The caller supplies `http`, `onClose`, and `onRefresh`.
 */
export const getWorkflowExecutionDetailsProps = ({
  aiConnectors,
  generation,
  localStorageAttackDiscoveryMaxAlerts,
}: {
  aiConnectors: AIConnector[] | undefined;
  generation: AttackDiscoveryGeneration;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
}): Omit<WorkflowExecutionDetailsProps, 'http' | 'onClose' | 'onRefresh'> => {
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
    source_metadata: sourceMetadata,
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

  const connector = aiConnectors?.find((c) => c.id === connectorId);
  const connectorActionTypeId = connector?.actionTypeId;
  const connectorModel = getGenAiConfig(connector)?.defaultModel;
  const averageSuccessfulDurationNanoseconds =
    connectorStats?.average_successful_duration_nanoseconds;

  return {
    alertsContextCount: alertsContextCount ?? null,
    approximateFutureTime: getApproximateFutureTime({
      averageSuccessfulDurationNanoseconds,
      generationStartTime: start,
    }),
    averageSuccessfulDurationMs:
      averageSuccessfulDurationNanoseconds != null
        ? Math.round(averageSuccessfulDurationNanoseconds / 1_000_000)
        : undefined,
    averageSuccessfulDurationNanoseconds,
    configuredMaxAlerts:
      localStorageAttackDiscoveryMaxAlerts != null
        ? parseInt(localStorageAttackDiscoveryMaxAlerts, 10) || undefined
        : undefined,
    connectorActionTypeId,
    connectorModel,
    connectorName: getConnectorNameFromId({ aiConnectors, connectorId }),
    discoveriesCount: discoveries,
    duplicatesDroppedCount,
    errorCategory,
    eventActions: stepEventActions ?? null,
    executionUuid,
    failedWorkflowId,
    generatedCount,
    generationEndTime,
    generationStatus: status,
    hallucinationsFilteredCount,
    loadingMessage,
    localStorageAttackDiscoveryMaxAlerts,
    persistedCount,
    reason,
    sourceMetadata,
    successfulGenerations: connectorStats?.successful_generations,
    workflowExecutions,
    workflowId,
    workflowRunId,
  };
};
