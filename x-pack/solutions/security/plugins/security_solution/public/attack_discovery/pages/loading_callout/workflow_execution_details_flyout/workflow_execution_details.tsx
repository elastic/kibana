/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';
import type { HttpSetup } from '@kbn/core/public';
import { ExecutionStatus } from '@kbn/workflows';

import { useKibana } from '../../../../common/lib/kibana';
import { AttackDiscoveryEventTypes } from '../../../../common/lib/telemetry';
import type { AttackDiscoveryPipelineStepType } from '../../../../common/lib/telemetry';
import { useHasWorkflowsPrivileges } from '../../hooks/use_has_workflows_privileges';
import { useGetAttackDiscoveryGeneration } from '../../hooks/use_get_attack_discovery_generation';
import { usePipelineData } from '../../hooks/use_pipeline_data';
import { useWorkflowExecutionDetails } from '../../hooks/use_workflow_execution_details';
import { WorkflowsMissingPrivilegesCallOut } from '../../workflows_missing_privileges_callout';
import { LoadingCallout } from '..';
import { StepDataModal } from '../step_data_modal';
import type { AggregatedWorkflowExecution, WorkflowInspectMetadata } from '../types';
import {
  getStepDataModalConfig,
  type StepDataModalConfig,
} from './helpers/get_step_data_modal_config';
import { buildEnrichedStepDataModalConfig } from './helpers/build_enriched_step_data_modal_config';
import type { FailureCategory } from './failure_actions/helpers/classify_error_category';
import { ConversationLink } from './conversation_link';
import { ExecutionContent } from './execution_content';
import { FailureSection } from './failure_section';
import { RefreshSection } from './refresh_section';
import { useEffectiveWorkflowTracking } from './use_effective_workflow_tracking';
import { useEnvironmentContext } from './use_environment_context';
import type {
  PerWorkflowAlertRetrieval,
  SourceMetadata,
} from './diagnostic_report/helpers/build_diagnostic_report';

/**
 * Interval used to keep polling pipeline data after the run reaches a terminal
 * (succeeded) state while the validation phase's discoveries are not yet
 * available from the pipeline-data endpoint.
 */
const AWAIT_VALIDATION_DATA_POLL_INTERVAL_MS = 5000;

/**
 * Upper bound on how long to keep polling for the validation phase's discoveries
 * after the run becomes terminal. Prevents indefinite polling if the validation
 * output never becomes queryable (e.g. an execution that produced no validation
 * workflow output).
 */
const AWAIT_VALIDATION_DATA_MAX_WAIT_MS = 60_000;

export interface WorkflowExecutionDetailsProps {
  alertsContextCount?: number | null;
  approximateFutureTime?: Date | null;
  averageSuccessfulDurationMs?: number;
  averageSuccessfulDurationNanoseconds?: number;
  configuredMaxAlerts?: number;
  connectorActionTypeId?: string;
  connectorModel?: string;
  connectorName?: string;
  dateRangeEnd?: string;
  dateRangeStart?: string;
  discoveriesCount?: number | null;
  duplicatesDroppedCount?: number;
  end?: string | null;
  errorCategory?: FailureCategory;
  eventActions?: string[] | null;
  executionUuid?: string;
  failedWorkflowId?: string;
  generatedCount?: number;
  generationEndTime?: string;
  generationStatus?: 'started' | 'succeeded' | 'failed' | 'canceled' | 'dismissed';
  hallucinationsFilteredCount?: number;
  http: HttpSetup;
  loadingMessage?: string;
  localStorageAttackDiscoveryMaxAlerts?: string;
  onClose: () => void;
  onRefresh?: () => void;
  persistedCount?: number;
  reason?: string;
  sourceMetadata?: SourceMetadata | null;
  start?: string | null;
  successfulGenerations?: number;
  workflowExecutions?: WorkflowExecutionsTracking | null;
  workflowId: string | null | undefined;
  workflowRunId: string | null | undefined;
}

const WorkflowExecutionDetailsComponent: React.FC<WorkflowExecutionDetailsProps> = ({
  alertsContextCount,
  approximateFutureTime,
  averageSuccessfulDurationMs,
  averageSuccessfulDurationNanoseconds,
  configuredMaxAlerts,
  connectorActionTypeId,
  connectorModel,
  connectorName,
  dateRangeEnd,
  dateRangeStart,
  discoveriesCount,
  duplicatesDroppedCount,
  end,
  errorCategory,
  eventActions,
  executionUuid,
  failedWorkflowId,
  generatedCount,
  generationEndTime,
  generationStatus,
  hallucinationsFilteredCount,
  http,
  loadingMessage,
  localStorageAttackDiscoveryMaxAlerts,
  onClose,
  onRefresh,
  persistedCount,
  reason,
  sourceMetadata,
  start,
  successfulGenerations,
  workflowExecutions,
  workflowId,
  workflowRunId,
}) => {
  const { spaces, telemetry } = useKibana().services;
  const { hasWorkflowsRead, missingPrivileges } = useHasWorkflowsPrivileges();

  const environmentContext = useEnvironmentContext(spaces);

  const [stepDataModalConfig, setStepDataModalConfig] = useState<StepDataModalConfig | null>(null);

  // Fetch the authoritative execution status directly from the Attack Discovery
  // API. The prop `generationStatus` can be stale (e.g. a schedule execution log
  // row whose status hasn't been refreshed since the run completed). The live data
  // from this hook overrides the prop as soon as the first fetch returns.
  // Polling: 10 s while running (< 10 min elapsed), 30 s after that to handle
  // runs that will never complete (e.g. server killed mid-execution).
  const { generation: liveGeneration } = useGetAttackDiscoveryGeneration({
    executionUuid,
    http,
  });

  const effectiveGenerationStatus = liveGeneration?.status ?? generationStatus;

  // Merge prop-provided counts with the (potentially fresher) live generation
  // values. Kept in a memo so the fallback logic does not inflate the
  // component's cyclomatic complexity.
  const loadingCalloutCounts = useMemo(
    () => ({
      alertsContextCount: alertsContextCount ?? liveGeneration?.alerts_context_count ?? null,
      discoveries: discoveriesCount ?? liveGeneration?.discoveries,
      duplicatesDroppedCount: duplicatesDroppedCount ?? liveGeneration?.duplicates_dropped_count,
      generatedCount: generatedCount ?? liveGeneration?.generated_count,
      generationEndTime: generationEndTime ?? liveGeneration?.end,
      hallucinationsFilteredCount:
        hallucinationsFilteredCount ?? liveGeneration?.hallucinations_filtered_count,
      persistedCount: persistedCount ?? liveGeneration?.persisted_count,
    }),
    [
      alertsContextCount,
      discoveriesCount,
      duplicatesDroppedCount,
      generatedCount,
      generationEndTime,
      hallucinationsFilteredCount,
      liveGeneration,
      persistedCount,
    ]
  );

  const {
    effectiveWorkflowExecutions,
    effectiveWorkflowId,
    effectiveWorkflowRunId,
    pipelineDataRefetchIntervalMs,
  } = useEffectiveWorkflowTracking({
    executionUuid,
    generationStatus: effectiveGenerationStatus,
    http,
    workflowExecutions,
    workflowId,
    workflowRunId,
  });

  // In provided mode, the orchestrator workflow ID is null but we can still
  // fetch pipeline data using the generation workflow run ID as a fallback.
  const generationWorkflowRunId = effectiveWorkflowId == null ? effectiveWorkflowRunId : undefined;

  // Enable pipeline data fetching as soon as the execution has started so
  // inspect buttons appear as each step completes (not only after all steps finish).
  // In provided mode, effectiveWorkflowId may be null — allow fetching if
  // we have a generationWorkflowRunId fallback.
  const isPipelineDataEnabled =
    effectiveGenerationStatus != null &&
    executionUuid != null &&
    (effectiveWorkflowId != null || generationWorkflowRunId != null);

  const { data, isLoading } = useWorkflowExecutionDetails({
    executionUuid,
    http,
    stubData: {
      eventActions,
      generationStatus: effectiveGenerationStatus,
    },
    workflowId: effectiveWorkflowId,
    workflowExecutions: effectiveWorkflowExecutions,
    workflowRunId: effectiveWorkflowRunId,
  });

  // The overall run flips to a terminal (succeeded) status at the
  // `generation-succeeded` event, which is emitted BEFORE the separate
  // validation workflow finishes writing its output. If pipeline-data polling
  // stops at that moment, `validated_discoveries` is cached as null — the
  // Validation count badge disappears and Inspect falls back to the generated
  // discoveries. Keep polling (bounded) until the validation phase's
  // discoveries are available from the pipeline-data endpoint.
  const [validationDataResolved, setValidationDataResolved] = useState(false);
  const [awaitValidationTimedOut, setAwaitValidationTimedOut] = useState(false);

  const isAwaitingValidationData =
    effectiveGenerationStatus === 'succeeded' &&
    effectiveWorkflowExecutions?.validation != null &&
    !validationDataResolved &&
    !awaitValidationTimedOut;

  const effectivePipelineDataRefetchIntervalMs = isAwaitingValidationData
    ? AWAIT_VALIDATION_DATA_POLL_INTERVAL_MS
    : pipelineDataRefetchIntervalMs;

  const { data: pipelineData } = usePipelineData({
    executionId: executionUuid ?? '',
    generationWorkflowRunId: generationWorkflowRunId ?? undefined,
    http,
    isEnabled: isPipelineDataEnabled,
    refetchIntervalMs: effectivePipelineDataRefetchIntervalMs,
    workflowId: effectiveWorkflowId ?? '_',
  });

  // Reset the await-validation tracking when the execution changes so a new run
  // starts polling for its own validation output. Declared before the resolve
  // effect so that, on mount, a cached non-null result still resolves.
  useEffect(() => {
    setValidationDataResolved(false);
    setAwaitValidationTimedOut(false);
  }, [executionUuid]);

  // Mark the validation discoveries resolved once the pipeline-data endpoint
  // returns them. An empty array is a valid resolved state (a run may legitimately
  // persist zero discoveries), so polling stops in that case too.
  useEffect(() => {
    if (pipelineData?.validated_discoveries != null) {
      setValidationDataResolved(true);
    }
  }, [pipelineData]);

  // Cap the extra polling so we do not poll indefinitely if the validation
  // output never becomes available.
  useEffect(() => {
    if (!isAwaitingValidationData) {
      return;
    }

    const timer = setTimeout(() => {
      setAwaitValidationTimedOut(true);
    }, AWAIT_VALIDATION_DATA_MAX_WAIT_MS);

    return () => clearTimeout(timer);
  }, [isAwaitingValidationData]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleViewData = useCallback(
    (step: string, metadata?: WorkflowInspectMetadata) => {
      if (pipelineData == null) {
        return;
      }

      const stepTypeMap: Record<string, AttackDiscoveryPipelineStepType> = {
        combined_retrieval: 'alert_retrieval',
        generation: 'generation',
        retrieval: 'alert_retrieval',
        validation: 'validation',
      };

      const resolvedKey = step.startsWith('retrieval:') ? 'retrieval' : step;
      const stepType = stepTypeMap[resolvedKey];

      if (stepType != null) {
        telemetry.reportEvent(AttackDiscoveryEventTypes.PipelineStepInspected, {
          step_type: stepType,
        });
      }

      const config = getStepDataModalConfig(step, pipelineData, metadata);

      if (config != null) {
        setStepDataModalConfig(
          buildEnrichedStepDataModalConfig({ config, metadata, steps: data?.steps })
        );
      }
    },
    [data?.steps, pipelineData, telemetry]
  );

  const handleCloseStepDataModal = useCallback(() => {
    setStepDataModalConfig(null);
  }, []);

  /** Build per-workflow alert retrieval for the diagnostic report by joining
   *  pipeline data counts with workflow references from execution tracking. */
  const perWorkflowAlertRetrieval = useMemo((): PerWorkflowAlertRetrieval[] | undefined => {
    const alertRetrieval = pipelineData?.alert_retrieval;
    if (alertRetrieval == null || alertRetrieval.length === 0) {
      return undefined;
    }

    const items = alertRetrieval.filter((item) => item.workflow_run_id != null);
    if (items.length === 0) {
      return undefined;
    }

    return items.map((item) => {
      const itemWorkflowRunId = item.workflow_run_id as string;
      const ref = effectiveWorkflowExecutions?.alertRetrieval?.find(
        (r) => r.workflowRunId === itemWorkflowRunId
      );
      return {
        alertsContextCount: item.alerts_context_count,
        extractionStrategy: item.extraction_strategy,
        workflowId: ref?.workflowId ?? itemWorkflowRunId,
        workflowName: ref?.workflowName,
        workflowRunId: itemWorkflowRunId,
      };
    });
  }, [effectiveWorkflowExecutions?.alertRetrieval, pipelineData?.alert_retrieval]);

  const showRefreshButton = effectiveGenerationStatus === 'succeeded' && onRefresh != null;

  const anyStepFailed =
    data?.steps?.some((step) => step.status === ExecutionStatus.FAILED) ?? false;

  const showTroubleshootWithAi =
    anyStepFailed ||
    effectiveGenerationStatus === 'failed' ||
    effectiveGenerationStatus === 'canceled' ||
    effectiveGenerationStatus === 'dismissed';

  // Some failures abort the run before any workflow executes (e.g. the alert
  // retrieval workflows toggle is enabled but no workflow is selected), so there
  // is no aggregated execution data to display. Fall back to a minimal failed
  // execution so the failure/troubleshoot section still renders and the user can
  // run the troubleshooting skill. The fallback is only used once we are no
  // longer loading, so post-workflow failures still wait for their real data.
  const failureAggregatedExecution: AggregatedWorkflowExecution = data ?? {
    status: ExecutionStatus.FAILED,
    steps: [],
    workflowExecutions: effectiveWorkflowExecutions,
  };

  const showFailureSection = showTroubleshootWithAi && (data != null || !isLoading);

  return (
    <>
      <LoadingCallout
        alertsContextCount={loadingCalloutCounts.alertsContextCount}
        approximateFutureTime={approximateFutureTime ?? null}
        averageSuccessfulDurationNanoseconds={averageSuccessfulDurationNanoseconds}
        connectorName={connectorName}
        discoveries={loadingCalloutCounts.discoveries}
        duplicatesDroppedCount={loadingCalloutCounts.duplicatesDroppedCount}
        end={end}
        eventActions={eventActions}
        executionUuid={executionUuid}
        generatedCount={loadingCalloutCounts.generatedCount}
        generationEndTime={loadingCalloutCounts.generationEndTime}
        hallucinationsFilteredCount={loadingCalloutCounts.hallucinationsFilteredCount}
        hideActions
        loadingMessage={loadingMessage}
        localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
        persistedCount={loadingCalloutCounts.persistedCount}
        reason={reason}
        start={start}
        status={effectiveGenerationStatus}
        successfulGenerations={successfulGenerations}
        workflowExecutions={effectiveWorkflowExecutions}
        workflowId={effectiveWorkflowId ?? undefined}
        workflowRunId={effectiveWorkflowRunId ?? undefined}
      />

      <EuiHorizontalRule />

      {hasWorkflowsRead ? (
        <ExecutionContent
          data={data}
          effectiveWorkflowId={effectiveWorkflowId}
          effectiveWorkflowRunId={effectiveWorkflowRunId}
          isLoading={isLoading}
          onViewData={handleViewData}
          pipelineData={pipelineData}
        />
      ) : (
        <WorkflowsMissingPrivilegesCallOut missingPrivileges={missingPrivileges} />
      )}

      {liveGeneration?.conversation_id != null && (
        <>
          <EuiSpacer size="m" />

          <ConversationLink conversationId={liveGeneration.conversation_id} />
        </>
      )}

      {showFailureSection && (
        <>
          <EuiSpacer size="m" />

          <FailureSection
            aggregatedExecution={failureAggregatedExecution}
            alertsContextCount={alertsContextCount}
            averageSuccessfulDurationMs={averageSuccessfulDurationMs}
            configuredMaxAlerts={configuredMaxAlerts}
            connectorActionTypeId={connectorActionTypeId}
            connectorModel={connectorModel}
            connectorName={connectorName}
            dateRangeEnd={dateRangeEnd}
            dateRangeStart={dateRangeStart}
            diagnosticsContext={pipelineData?.diagnostics_context}
            discoveriesCount={discoveriesCount}
            duplicatesDroppedCount={duplicatesDroppedCount}
            environmentContext={environmentContext}
            errorCategory={errorCategory}
            executionUuid={executionUuid}
            failedWorkflowId={failedWorkflowId}
            failureReason={reason}
            generatedCount={generatedCount}
            generationStatus={effectiveGenerationStatus}
            hallucinationsFilteredCount={hallucinationsFilteredCount}
            perWorkflowAlertRetrieval={perWorkflowAlertRetrieval}
            persistedCount={persistedCount}
            sourceMetadata={sourceMetadata}
            workflowId={workflowId ?? undefined}
          />
        </>
      )}

      {showRefreshButton && <RefreshSection onClose={handleClose} onRefresh={onRefresh} />}

      {stepDataModalConfig != null && (
        <StepDataModal
          dataCount={stepDataModalConfig.dataCount}
          dataType={stepDataModalConfig.dataType}
          extractionStrategy={stepDataModalConfig.extractionStrategy}
          items={stepDataModalConfig.items}
          onClose={handleCloseStepDataModal}
          stepName={stepDataModalConfig.stepName}
          workflowId={stepDataModalConfig.workflowId}
          workflowName={stepDataModalConfig.workflowName}
          workflowRunId={stepDataModalConfig.workflowRunId}
          workflowSummaries={stepDataModalConfig.workflowSummaries}
        />
      )}
    </>
  );
};

WorkflowExecutionDetailsComponent.displayName = 'WorkflowExecutionDetails';

export const WorkflowExecutionDetails = React.memo(WorkflowExecutionDetailsComponent);
