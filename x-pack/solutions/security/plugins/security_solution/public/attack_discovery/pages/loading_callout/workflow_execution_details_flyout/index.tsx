/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';
import type { HttpSetup } from '@kbn/core/public';
import { ExecutionStatus } from '@kbn/workflows';

import { useKibana } from '../../../../common/lib/kibana';
import { AttackDiscoveryEventTypes } from '../../../../common/lib/telemetry';
import type { AttackDiscoveryPipelineStepType } from '../../../../common/lib/telemetry';
import { useGetAttackDiscoveryGeneration } from '../../hooks/use_get_attack_discovery_generation';
import { usePipelineData } from '../../hooks/use_pipeline_data';
import { useWorkflowExecutionDetails } from '../../hooks/use_workflow_execution_details';
import { LoadingCallout } from '..';
import { StepDataModal } from '../step_data_modal';
import type { WorkflowInspectMetadata } from '../types';
import {
  getStepDataModalConfig,
  type StepDataModalConfig,
} from './helpers/get_step_data_modal_config';
import { buildEnrichedStepDataModalConfig } from './helpers/build_enriched_step_data_modal_config';
import type { FailureCategory } from './failure_actions/helpers/classify_error_category';
import { ExecutionContent } from './execution_content';
import { FailureSection } from './failure_section';
import { RefreshSection } from './refresh_section';
import { useEffectiveWorkflowTracking } from './use_effective_workflow_tracking';
import { useEnvironmentContext } from './use_environment_context';
import type {
  PerWorkflowAlertRetrieval,
  SourceMetadata,
} from './diagnostic_report/helpers/build_diagnostic_report';
import * as i18n from './translations';

interface WorkflowExecutionDetailsFlyoutProps {
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

const WorkflowExecutionDetailsFlyoutComponent: React.FC<WorkflowExecutionDetailsFlyoutProps> = ({
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
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'workflowExecutionDetailsFlyout',
  });

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

  const {
    effectiveWorkflowExecutions,
    effectiveWorkflowId,
    effectiveWorkflowRunId,
    isTerminalStatus,
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

  const { data: pipelineData, refetch: refetchPipelineData } = usePipelineData({
    executionId: executionUuid ?? '',
    generationWorkflowRunId: generationWorkflowRunId ?? undefined,
    http,
    isEnabled: isPipelineDataEnabled,
    refetchIntervalMs: pipelineDataRefetchIntervalMs,
    workflowId: effectiveWorkflowId ?? '_',
  });

  // Trigger a final pipeline data fetch when the execution transitions to a
  // terminal state. The last polling cycle may have run before the validation
  // step's output was written to ES (validation typically completes within
  // milliseconds of the success event that stops polling), so without this
  // final fetch the generation and validation count badges remain empty even
  // though the server has the data ready.
  const prevIsTerminalRef = useRef(isTerminalStatus);
  useEffect(() => {
    if (!prevIsTerminalRef.current && isTerminalStatus && isPipelineDataEnabled) {
      refetchPipelineData();
    }
    prevIsTerminalRef.current = isTerminalStatus;
  }, [isPipelineDataEnabled, isTerminalStatus, refetchPipelineData]);

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

  return (
    <EuiFlyout
      aria-labelledby={flyoutTitleId}
      data-test-subj="workflowExecutionDetailsFlyout"
      onClose={handleClose}
      size="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{i18n.WORKFLOW_EXECUTION_DETAILS}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <LoadingCallout
          alertsContextCount={alertsContextCount ?? liveGeneration?.alerts_context_count ?? null}
          approximateFutureTime={approximateFutureTime ?? null}
          averageSuccessfulDurationNanoseconds={averageSuccessfulDurationNanoseconds}
          connectorName={connectorName}
          discoveries={discoveriesCount ?? liveGeneration?.discoveries}
          duplicatesDroppedCount={
            duplicatesDroppedCount ?? liveGeneration?.duplicates_dropped_count
          }
          end={end}
          eventActions={eventActions}
          executionUuid={executionUuid}
          generatedCount={generatedCount ?? liveGeneration?.generated_count}
          generationEndTime={generationEndTime ?? liveGeneration?.end}
          hallucinationsFilteredCount={
            hallucinationsFilteredCount ?? liveGeneration?.hallucinations_filtered_count
          }
          hideActions
          loadingMessage={loadingMessage}
          localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
          persistedCount={persistedCount ?? liveGeneration?.persisted_count}
          reason={reason}
          start={start}
          status={effectiveGenerationStatus}
          successfulGenerations={successfulGenerations}
          workflowExecutions={effectiveWorkflowExecutions}
          workflowId={effectiveWorkflowId ?? undefined}
          workflowRunId={effectiveWorkflowRunId ?? undefined}
        />

        <EuiHorizontalRule />

        <ExecutionContent
          data={data}
          effectiveWorkflowId={effectiveWorkflowId}
          effectiveWorkflowRunId={effectiveWorkflowRunId}
          isLoading={isLoading}
          onViewData={handleViewData}
          pipelineData={pipelineData}
        />

        {showTroubleshootWithAi && data != null && (
          <>
            <EuiSpacer size="m" />

            <FailureSection
              aggregatedExecution={data}
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
      </EuiFlyoutBody>

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
    </EuiFlyout>
  );
};

WorkflowExecutionDetailsFlyoutComponent.displayName = 'WorkflowExecutionDetailsFlyout';

export const WorkflowExecutionDetailsFlyout = React.memo(WorkflowExecutionDetailsFlyoutComponent);
