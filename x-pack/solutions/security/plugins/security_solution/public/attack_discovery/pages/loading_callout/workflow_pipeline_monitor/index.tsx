/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiPanel,
  EuiSteps,
  EuiText,
  EuiToolTip,
  type EuiStepProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ExecutionStatus } from '@kbn/workflows';
import React, { useCallback, useMemo } from 'react';

import type { PipelineDataResponse } from '../../hooks/use_pipeline_data';
import type { StepExecutionWithLink, WorkflowInspectMetadata } from '../types';
import { useWorkflowEditorLink } from '../../use_workflow_editor_link';
import { GroupedAlertRetrievalContent } from './grouped_alert_retrieval_content';
import { getCompositeStatus } from './helpers/get_composite_status';
import {
  getAlertsCountBadgeLabel,
  getCombinedAlertsCountBadgeLabel,
} from './helpers/get_alerts_count_badge_label';
import {
  getGenerationBadgeLabel,
  getValidationBadgeLabel,
} from './helpers/get_discovery_count_badge_label';
import { getStepExecutionTime } from './helpers/get_step_execution_time';
import { formatStepName } from './helpers/format_step_name';
import { INSPECT_CONFIG } from './helpers/inspect_config';
import { mapStatusToEuiStatus } from './helpers/map_status_to_eui_status';
import {
  getCanonicalOrder,
  groupStepsByWorkflow,
  isAlertRetrievalStep,
  isPersistenceStep,
} from './helpers/step_ordering';
import { PulsingTitle } from './pulsing_title';
import { StepContent } from './step_content';
import * as i18n from './translations';

interface WorkflowPipelineMonitorProps {
  onViewData?: (step: string, metadata?: WorkflowInspectMetadata) => void;
  pipelineData?: PipelineDataResponse;
  stepExecutions: StepExecutionWithLink[];
  workflowId: string | null | undefined;
  workflowRunId: string | null | undefined;
}

const WorkflowPipelineMonitorComponent: React.FC<WorkflowPipelineMonitorProps> = ({
  onViewData,
  pipelineData,
  stepExecutions,
  workflowId,
  workflowRunId,
}) => {
  const { editorUrl } = useWorkflowEditorLink({ workflowId, workflowRunId });

  const sortedSteps = useMemo(() => {
    return [...stepExecutions]
      .filter((step) => !isPersistenceStep(step))
      .sort((a, b) => a.topologicalIndex - b.topologicalIndex);
  }, [stepExecutions]);

  /** Renders an inline inspect button for a pipeline phase when data is available */
  const renderInspectButton = useCallback(
    (
      phase: string,
      pipelinePhase?: string,
      metadata?: WorkflowInspectMetadata
    ): React.ReactNode => {
      if (pipelineData == null || onViewData == null) {
        return null;
      }

      const config =
        INSPECT_CONFIG[phase] ??
        (pipelinePhase != null ? INSPECT_CONFIG[pipelinePhase] : undefined);

      if (config == null || !config.hasData(pipelineData)) {
        return null;
      }

      return (
        <EuiToolTip content={config.tooltip}>
          <EuiButtonEmpty
            data-test-subj={config.testSubj}
            iconType="inspect"
            onClick={() => onViewData(config.dataKey, metadata)}
            size="xs"
          >
            {i18n.INSPECT}
          </EuiButtonEmpty>
        </EuiToolTip>
      );
    },
    [onViewData, pipelineData]
  );

  /** Finds the alert retrieval entry matching a workflow run ID, if any */
  const findAlertRetrieval = useCallback(
    (runId?: string) => {
      if (runId == null || pipelineData?.alert_retrieval == null) {
        return undefined;
      }

      return pipelineData.alert_retrieval.find((entry) => entry.workflow_run_id === runId);
    },
    [pipelineData]
  );

  /** Renders a per-workflow inspect button for individual alert retrieval workflows */
  const renderWorkflowInspectButton = useCallback(
    (runId: string | undefined, metadata: WorkflowInspectMetadata): React.ReactNode => {
      if (pipelineData == null || onViewData == null) {
        return null;
      }

      const entry = findAlertRetrieval(runId);

      if (entry == null) {
        return null;
      }

      const hasAlerts = entry.alerts.length > 0;

      return (
        <EuiToolTip content={hasAlerts ? i18n.INSPECT_RAW_ALERTS : i18n.NO_ALERTS_TO_INSPECT}>
          {/* span wrapper required for EuiToolTip to attach to a disabled button */}
          <span tabIndex={hasAlerts ? undefined : 0}>
            <EuiButtonEmpty
              data-test-subj={`inspectAlertRetrieval-${runId ?? 'unknown'}`}
              disabled={!hasAlerts}
              iconType="inspect"
              onClick={
                hasAlerts
                  ? () => onViewData(`retrieval:${runId ?? 'unknown'}`, metadata)
                  : undefined
              }
              size="xs"
            >
              {i18n.INSPECT}
            </EuiButtonEmpty>
          </span>
        </EuiToolTip>
      );
    },
    [findAlertRetrieval, onViewData, pipelineData]
  );

  /** Renders the combined alerts inspect button shown after all per-workflow entries */
  const renderCombinedInspectButton = useCallback((): React.ReactNode => {
    if (pipelineData == null || onViewData == null) {
      return null;
    }

    if (pipelineData.combined_alerts == null) {
      return null;
    }

    return (
      <EuiToolTip content={i18n.INSPECT_COMBINED_ALERTS_TOOLTIP}>
        <EuiButtonEmpty
          data-test-subj="inspectCombinedAlerts"
          iconType="inspect"
          onClick={() => onViewData('combined_retrieval')}
          size="xs"
        >
          {i18n.INSPECT_COMBINED_ALERTS}
        </EuiButtonEmpty>
      </EuiToolTip>
    );
  }, [onViewData, pipelineData]);

  /** Renders an alerts count badge for an individual alert retrieval workflow */
  const renderWorkflowAlertsCountBadge = useCallback(
    (runId?: string): React.ReactNode => {
      const entry = findAlertRetrieval(runId);

      if (entry == null) {
        return null;
      }

      const label = getAlertsCountBadgeLabel(entry.alerts_context_count);

      if (label == null) {
        return null;
      }

      return (
        <EuiBadge color="hollow" data-test-subj={`alertsCountBadge-${runId ?? 'unknown'}`}>
          {label}
        </EuiBadge>
      );
    },
    [findAlertRetrieval]
  );

  const isGenerationStep = useCallback(
    (step: StepExecutionWithLink): boolean =>
      step.stepId === 'generate_discoveries' || step.pipelinePhase === 'generate_discoveries',
    []
  );

  const isValidationStep = useCallback(
    (step: StepExecutionWithLink): boolean =>
      step.stepId === 'validate_discoveries' ||
      step.stepId === 'promote_discoveries' ||
      step.pipelinePhase === 'validate_discoveries' ||
      step.pipelinePhase === 'promote_discoveries',
    []
  );

  /** Renders a discovery count badge for generation or validation steps */
  const renderDiscoveryCountBadge = useCallback(
    (step: StepExecutionWithLink): React.ReactNode => {
      if (pipelineData == null) {
        return null;
      }

      if (isGenerationStep(step)) {
        const label = getGenerationBadgeLabel(pipelineData);

        return label != null ? (
          <EuiBadge color="hollow" data-test-subj="generationDiscoveriesBadge">
            {label}
          </EuiBadge>
        ) : null;
      }

      if (isValidationStep(step)) {
        const label = getValidationBadgeLabel(pipelineData);

        return label != null ? (
          <EuiBadge color="hollow" data-test-subj="validationDiscoveriesBadge">
            {label}
          </EuiBadge>
        ) : null;
      }

      return null;
    },
    [isGenerationStep, isValidationStep, pipelineData]
  );

  // Note: EuiStepProps types `title` as `string`, but EUI runtime accepts ReactNode.
  // We cast to allow our PulsingTitle component for animated running step titles.
  const steps = useMemo(() => {
    const alertRetrievalSteps = sortedSteps.filter(isAlertRetrievalStep);
    const otherSteps = sortedSteps.filter((step) => !isAlertRetrievalStep(step));

    const generationStep = otherSteps.find(
      (step) =>
        step.stepId === 'generate_discoveries' || step.pipelinePhase === 'generate_discoveries'
    );
    const isGenerationStarted =
      generationStep != null && generationStep.status !== ExecutionStatus.PENDING;

    const alertRetrievalStepItems: EuiStepProps[] = (() => {
      if (alertRetrievalSteps.length > 1) {
        const rawCompositeStatus = getCompositeStatus(alertRetrievalSteps);

        const compositeStatus =
          rawCompositeStatus === ExecutionStatus.COMPLETED && !isGenerationStarted
            ? ExecutionStatus.RUNNING
            : rawCompositeStatus;

        const workflowGroups = groupStepsByWorkflow(alertRetrievalSteps);
        const showCombinedEntry = isGenerationStarted && workflowGroups.length > 1;

        const combinedTimeMs = showCombinedEntry
          ? alertRetrievalSteps.reduce((sum, step) => {
              const time = getStepExecutionTime(step);
              return time != null ? sum + time : sum;
            }, 0) || undefined
          : undefined;

        const combinedBadgeLabel = showCombinedEntry
          ? getCombinedAlertsCountBadgeLabel(
              (pipelineData?.alert_retrieval ?? []).map((entry) => entry.alerts_context_count)
            )
          : null;

        const combinedAlertsCountBadge =
          combinedBadgeLabel != null ? (
            <EuiBadge color="hollow" data-test-subj="combinedAlertsCountBadge">
              {combinedBadgeLabel}
            </EuiBadge>
          ) : undefined;

        return [
          {
            children: (
              <GroupedAlertRetrievalContent
                combinedAlertsCountBadge={combinedAlertsCountBadge}
                combinedInspectButton={
                  showCombinedEntry ? renderCombinedInspectButton() : undefined
                }
                combinedTimeMs={combinedTimeMs}
                renderWorkflowAlertsCountBadge={renderWorkflowAlertsCountBadge}
                renderWorkflowInspectButton={renderWorkflowInspectButton}
                subSteps={alertRetrievalSteps}
              />
            ),
            status: mapStatusToEuiStatus(compositeStatus),
            title:
              compositeStatus === ExecutionStatus.RUNNING ? (
                <PulsingTitle>{i18n.ALERT_RETRIEVAL}</PulsingTitle>
              ) : (
                i18n.ALERT_RETRIEVAL
              ),
          } as EuiStepProps,
        ];
      }

      if (alertRetrievalSteps.length === 1) {
        const step = alertRetrievalSteps[0];

        const effectiveStatus =
          step.status === ExecutionStatus.COMPLETED && !isGenerationStarted
            ? ExecutionStatus.RUNNING
            : step.status;

        return [
          {
            children: (
              <StepContent
                alertsCountBadge={renderWorkflowAlertsCountBadge(step.workflowRunId)}
                executionTimeMs={step.executionTimeMs}
                finishedAt={step.finishedAt}
                inspectButton={renderInspectButton(step.stepId, step.pipelinePhase, {
                  workflowId: step.workflowId,
                  workflowName: step.workflowName,
                  workflowRunId: step.workflowRunId,
                })}
                key={step.id}
                startedAt={step.startedAt}
                status={step.status}
                step={step}
              />
            ),
            status: mapStatusToEuiStatus(effectiveStatus),
            title:
              effectiveStatus === ExecutionStatus.RUNNING ? (
                <PulsingTitle>{i18n.ALERT_RETRIEVAL}</PulsingTitle>
              ) : (
                i18n.ALERT_RETRIEVAL
              ),
          } as EuiStepProps,
        ];
      }

      return [];
    })();

    const orderedOtherSteps = [...otherSteps].sort(
      (a, b) => getCanonicalOrder(a) - getCanonicalOrder(b)
    );

    const otherStepItems: EuiStepProps[] = orderedOtherSteps.map(
      (step) =>
        ({
          children: (
            <StepContent
              alertsCountBadge={renderDiscoveryCountBadge(step)}
              executionTimeMs={step.executionTimeMs}
              finishedAt={step.finishedAt}
              inspectButton={renderInspectButton(step.stepId, step.pipelinePhase, {
                workflowId: step.workflowId,
                workflowName: step.workflowName,
                workflowRunId: step.workflowRunId,
              })}
              key={step.id}
              startedAt={step.startedAt}
              status={step.status}
              step={step}
            />
          ),
          status: mapStatusToEuiStatus(step.status),
          title:
            step.status === ExecutionStatus.RUNNING ? (
              <PulsingTitle>{formatStepName(step.stepId)}</PulsingTitle>
            ) : (
              formatStepName(step.stepId)
            ),
        } as EuiStepProps)
    );

    return [...alertRetrievalStepItems, ...otherStepItems];
  }, [
    pipelineData,
    renderCombinedInspectButton,
    renderDiscoveryCountBadge,
    renderInspectButton,
    renderWorkflowAlertsCountBadge,
    renderWorkflowInspectButton,
    sortedSteps,
  ]);

  return (
    <EuiPanel data-test-subj="workflowPipelineMonitor" paddingSize="m">
      {sortedSteps.length === 0 ? (
        <EuiText color="subdued" size="s">
          {i18n.NO_STEPS_AVAILABLE}
        </EuiText>
      ) : (
        <EuiSteps
          css={css`
            .euiStep__content {
              padding-block-start: 4px;
              padding-block-end: 16px;
            }
          `}
          steps={steps}
        />
      )}
      {false && editorUrl && (
        <EuiButton
          data-test-subj="openInEditorButton"
          href={editorUrl ?? undefined}
          iconType="popout"
          rel="noopener noreferrer"
          size="s"
          target="_blank"
        >
          {i18n.OPEN_IN_EDITOR}
        </EuiButton>
      )}
    </EuiPanel>
  );
};

WorkflowPipelineMonitorComponent.displayName = 'WorkflowPipelineMonitor';

export const WorkflowPipelineMonitor = React.memo(WorkflowPipelineMonitorComponent);
