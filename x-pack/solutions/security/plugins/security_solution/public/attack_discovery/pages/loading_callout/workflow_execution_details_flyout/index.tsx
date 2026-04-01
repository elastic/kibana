/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';
import type { HttpSetup } from '@kbn/core/public';

import { KibanaServices, useKibana } from '../../../../common/lib/kibana';
import { AttackDiscoveryEventTypes } from '../../../../common/lib/telemetry';
import type { AttackDiscoveryPipelineStepType } from '../../../../common/lib/telemetry';
import { usePipelineData } from '../../hooks/use_pipeline_data';
import { useWorkflowExecutionDetails } from '../../hooks/use_workflow_execution_details';
import { LoadingCallout } from '..';
import { StepDataModal } from '../step_data_modal';
import type { WorkflowInspectMetadata } from '../types';
import { WorkflowPipelineMonitor } from '../workflow_pipeline_monitor';
import { DiagnosticReport } from './diagnostic_report';
import { FailureActions } from './failure_actions';
import type { FailureCategory } from './failure_actions/helpers/classify_error_category';
import {
  getStepDataModalConfig,
  type StepDataModalConfig,
} from './helpers/get_step_data_modal_config';
import { getEnvironmentContext, type EnvironmentContext } from './helpers/get_environment_context';
import * as i18n from './translations';
import { TroubleshootWithAi } from './troubleshoot_with_ai';

interface WorkflowExecutionDetailsFlyoutProps {
  alertsContextCount?: number | null;
  approximateFutureTime?: Date | null;
  averageSuccessfulDurationNanoseconds?: number;
  connectorName?: string;
  discoveriesCount?: number | null;
  end?: string | null;
  errorCategory?: FailureCategory;
  eventActions?: string[] | null;
  executionUuid?: string;
  failedWorkflowId?: string;
  generationEndTime?: string;
  generationStatus?: 'started' | 'succeeded' | 'failed' | 'canceled' | 'dismissed';
  http: HttpSetup;
  loadingMessage?: string;
  localStorageAttackDiscoveryMaxAlerts?: string;
  onClose: () => void;
  onRefresh?: () => void;
  reason?: string;
  start?: string | null;
  successfulGenerations?: number;
  workflowExecutions?: WorkflowExecutionsTracking | null;
  workflowId: string | null | undefined;
  workflowRunId: string | null | undefined;
}

const WorkflowExecutionDetailsFlyoutComponent: React.FC<WorkflowExecutionDetailsFlyoutProps> = ({
  alertsContextCount,
  approximateFutureTime,
  averageSuccessfulDurationNanoseconds,
  connectorName,
  discoveriesCount,
  end,
  errorCategory,
  eventActions,
  executionUuid,
  failedWorkflowId,
  generationEndTime,
  generationStatus,
  http,
  loadingMessage,
  localStorageAttackDiscoveryMaxAlerts,
  onClose,
  onRefresh,
  reason,
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

  const [environmentContext, setEnvironmentContext] = useState<EnvironmentContext | undefined>(
    undefined
  );
  const [stepDataModalConfig, setStepDataModalConfig] = useState<StepDataModalConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    getEnvironmentContext({
      kibanaVersion: KibanaServices.getKibanaVersion(),
      spaces,
    }).then((ctx) => {
      if (!cancelled) {
        setEnvironmentContext(ctx);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [spaces]);

  const isTerminalStatus =
    generationStatus === 'succeeded' ||
    generationStatus === 'failed' ||
    generationStatus === 'canceled' ||
    generationStatus === 'dismissed';

  // Enable pipeline data fetching as soon as the execution has started so
  // inspect buttons appear as each step completes (not only after all steps finish).
  const isPipelineDataEnabled =
    generationStatus != null && executionUuid != null && workflowId != null;

  // Poll every 5 s while the execution is still running; stop once terminal.
  const PIPELINE_DATA_POLL_INTERVAL_MS = 5000;
  const pipelineDataRefetchIntervalMs = isTerminalStatus ? 0 : PIPELINE_DATA_POLL_INTERVAL_MS;

  const { data, isLoading } = useWorkflowExecutionDetails({
    executionUuid,
    http,
    stubData: {
      alertsContextCount,
      discoveriesCount,
      eventActions,
      generationStatus,
    },
    workflowId,
    workflowExecutions,
    workflowRunId,
  });

  const { data: pipelineData } = usePipelineData({
    executionId: executionUuid ?? '',
    http,
    isEnabled: isPipelineDataEnabled,
    refetchIntervalMs: pipelineDataRefetchIntervalMs,
    workflowId: workflowId ?? '',
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleRefresh = useCallback(() => {
    onRefresh?.();
    onClose();
  }, [onClose, onRefresh]);

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
        // Enrich per-workflow summaries with workflow names from step execution data
        const enrichedSummaries = config.workflowSummaries?.map((summary) => {
          const matchingStep = data?.steps.find(
            (s) => s.workflowRunId != null && s.workflowRunId === summary.workflowRunId
          );

          return matchingStep != null
            ? {
                ...summary,
                workflowId: summary.workflowId ?? matchingStep.workflowId,
                workflowName: summary.workflowName ?? matchingStep.workflowName,
              }
            : summary;
        });

        setStepDataModalConfig({
          ...config,
          workflowId: metadata?.workflowId,
          workflowName: metadata?.workflowName,
          workflowRunId: metadata?.workflowRunId,
          workflowSummaries: enrichedSummaries,
        });
      }
    },
    [data?.steps, pipelineData, telemetry]
  );

  const handleCloseStepDataModal = useCallback(() => {
    setStepDataModalConfig(null);
  }, []);

  const showRefreshButton = generationStatus === 'succeeded' && onRefresh != null;

  const showTroubleshootWithAi =
    generationStatus === 'failed' ||
    generationStatus === 'canceled' ||
    generationStatus === 'dismissed';

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <EuiFlexGroup alignItems="center" direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner data-test-subj="loadingSpinner" size="l" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              {i18n.LOADING_EXECUTION_DETAILS}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (!data || !data.steps || data.steps.length === 0) {
      return (
        <EuiFlexGroup alignItems="center" direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              {i18n.NO_EXECUTION_DATA}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <WorkflowPipelineMonitor
        onViewData={handleViewData}
        pipelineData={pipelineData}
        stepExecutions={data.steps}
        workflowId={workflowId}
        workflowRunId={workflowRunId}
      />
    );
  }, [data, handleViewData, isLoading, pipelineData, workflowId, workflowRunId]);

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
          alertsContextCount={alertsContextCount ?? null}
          approximateFutureTime={approximateFutureTime ?? null}
          averageSuccessfulDurationNanoseconds={averageSuccessfulDurationNanoseconds}
          connectorName={connectorName}
          discoveries={discoveriesCount ?? undefined}
          end={end}
          eventActions={eventActions}
          executionUuid={executionUuid}
          generationEndTime={generationEndTime}
          hideActions
          loadingMessage={loadingMessage}
          localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
          reason={reason}
          start={start}
          status={generationStatus}
          successfulGenerations={successfulGenerations}
          workflowExecutions={workflowExecutions}
          workflowId={workflowId ?? undefined}
          workflowRunId={workflowRunId ?? undefined}
        />

        <EuiHorizontalRule />

        {content}

        {showTroubleshootWithAi && data != null && reason != null && (
          <>
            <EuiSpacer size="m" />

            <FailureActions
              aggregatedExecution={data}
              errorCategory={errorCategory}
              failedWorkflowId={failedWorkflowId}
              reason={reason}
              workflowId={workflowId ?? undefined}
            />
          </>
        )}

        {showTroubleshootWithAi && data != null && (
          <>
            <EuiSpacer size="m" />

            <EuiFlexGroup
              alignItems="center"
              gutterSize="none"
              justifyContent="spaceBetween"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <TroubleshootWithAi
                  aggregatedExecution={data}
                  alertsContextCount={alertsContextCount}
                  connectorName={connectorName}
                  diagnosticsContext={pipelineData?.diagnostics_context}
                  discoveriesCount={discoveriesCount}
                  environmentContext={environmentContext}
                  errorCategory={errorCategory}
                  executionUuid={executionUuid}
                  failedWorkflowId={failedWorkflowId}
                  failureReason={reason}
                  generationStatus={generationStatus}
                />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <DiagnosticReport
                  aggregatedExecution={data}
                  alertsContextCount={alertsContextCount}
                  connectorName={connectorName}
                  diagnosticsContext={pipelineData?.diagnostics_context}
                  discoveriesCount={discoveriesCount}
                  environmentContext={environmentContext}
                  executionUuid={executionUuid}
                  failureReason={reason}
                  generationStatus={generationStatus}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}

        {showRefreshButton && (
          <>
            <EuiSpacer size="m" />

            <EuiButton
              data-test-subj="flyoutRefreshButton"
              iconType="refresh"
              onClick={handleRefresh}
            >
              {i18n.REFRESH}
            </EuiButton>
          </>
        )}
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
