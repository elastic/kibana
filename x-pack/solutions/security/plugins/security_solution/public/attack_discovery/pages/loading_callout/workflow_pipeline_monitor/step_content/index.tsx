/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ExecutionStatus } from '@kbn/workflows';
import { ExecutionStatus as ExecutionStatusEnum } from '@kbn/workflows';
import React, { useState } from 'react';

import { formatDuration } from '../../format_duration';
import { LiveTimer } from '../../live_timer';
import type { StepExecutionWithLink } from '../../types';
import { useWorkflowEditorLink } from '../../../use_workflow_editor_link';
import { getStepExecutionTime } from '../helpers/get_step_execution_time';

/**
 * Memoized step content component to prevent timer remounts during polling.
 *
 * By extracting step rendering into a separate memoized component with stable
 * props comparison, we prevent the LiveTimer from being unmounted and remounted
 * on every poll cycle, which would cause the timer to reset.
 */
export interface StepContentProps {
  alertsCountBadge?: React.ReactNode;
  executionTimeMs: number | undefined;
  finishedAt: string | undefined;
  inspectButton?: React.ReactNode;
  startedAt: string;
  status: ExecutionStatus;
  step: StepExecutionWithLink;
}

const StepContentComponent: React.FC<StepContentProps> = ({
  alertsCountBadge,
  executionTimeMs,
  finishedAt,
  inspectButton,
  startedAt,
  status,
  step,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const { editorUrl } = useWorkflowEditorLink({
    workflowId: step.workflowId,
    workflowRunId: step.workflowRunId,
  });

  const calculatedTime = getStepExecutionTime({
    ...step,
    executionTimeMs,
    finishedAt,
    startedAt,
    status,
  });

  const hasWorkflowMetadata = step.workflowName != null || step.workflowDescription != null;

  return (
    <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="xs">
      {hasWorkflowMetadata && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="xs">
            {step.workflowName != null && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon color="subdued" size="s" type="workflowsApp" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      {editorUrl != null ? (
                        <EuiLink
                          data-test-subj="stepWorkflowName"
                          external
                          href={editorUrl}
                          target="_blank"
                        >
                          <strong>{step.workflowName}</strong>
                        </EuiLink>
                      ) : (
                        <span data-test-subj="stepWorkflowName">
                          <strong>{step.workflowName}</strong>
                        </span>
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            {step.workflowDescription != null && (
              <EuiFlexItem grow={false}>
                <EuiAccordion
                  arrowDisplay="left"
                  arrowProps={{
                    css: css`
                      align-self: flex-start;
                      block-size: 16px;
                      inline-size: 16px;
                      margin-top: 2px;
                      min-block-size: 0;
                      min-inline-size: 0;
                    `,
                  }}
                  borders="none"
                  buttonContent={
                    <EuiText
                      color="subdued"
                      css={
                        !isDescriptionExpanded
                          ? css`
                              display: -webkit-box;
                              -webkit-line-clamp: 1;
                              -webkit-box-orient: vertical;
                              overflow: hidden;
                            `
                          : undefined
                      }
                      data-test-subj="stepWorkflowDescription"
                      size="xs"
                    >
                      {step.workflowDescription}
                    </EuiText>
                  }
                  forceState={isDescriptionExpanded ? 'open' : 'closed'}
                  id={`step-description-${step.id}`}
                  onToggle={() => setIsDescriptionExpanded((prev) => !prev)}
                  paddingSize="none"
                >
                  <></>
                </EuiAccordion>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
      {(alertsCountBadge != null ||
        status === ExecutionStatusEnum.RUNNING ||
        calculatedTime != null ||
        inspectButton != null) && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {alertsCountBadge != null && <EuiFlexItem grow={false}>{alertsCountBadge}</EuiFlexItem>}
            {status === ExecutionStatusEnum.RUNNING && (
              <EuiFlexItem grow={false}>
                <LiveTimer
                  isRunning={true}
                  render={({ formattedDuration }) => (
                    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon color="subdued" size="s" type="clock" aria-hidden={true} />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText color="subdued" size="s">
                          {formattedDuration}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                  startedAt={startedAt}
                />
              </EuiFlexItem>
            )}
            {status !== ExecutionStatusEnum.RUNNING && calculatedTime != null && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon color="subdued" size="s" type="clock" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText color="subdued" size="xs">
                      {formatDuration(calculatedTime)}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            {inspectButton != null && <EuiFlexItem grow={false}>{inspectButton}</EuiFlexItem>}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

StepContentComponent.displayName = 'StepContent';

export const StepContent = React.memo(StepContentComponent, (prevProps, nextProps) => {
  return (
    (prevProps.alertsCountBadge == null) === (nextProps.alertsCountBadge == null) &&
    prevProps.executionTimeMs === nextProps.executionTimeMs &&
    prevProps.finishedAt === nextProps.finishedAt &&
    (prevProps.inspectButton == null) === (nextProps.inspectButton == null) &&
    prevProps.startedAt === nextProps.startedAt &&
    prevProps.status === nextProps.status &&
    prevProps.step.id === nextProps.step.id &&
    prevProps.step.workflowDescription === nextProps.step.workflowDescription &&
    prevProps.step.workflowId === nextProps.step.workflowId &&
    prevProps.step.workflowName === nextProps.step.workflowName &&
    prevProps.step.workflowRunId === nextProps.step.workflowRunId
  );
});
