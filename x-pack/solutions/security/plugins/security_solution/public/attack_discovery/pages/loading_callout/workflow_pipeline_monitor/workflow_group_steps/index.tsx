/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { ExecutionStatus } from '@kbn/workflows';
import React, { useMemo, useState } from 'react';

import { formatDuration } from '../../format_duration';
import { LiveTimer } from '../../live_timer';
import type { StepExecutionWithLink } from '../../types';
import { useWorkflowEditorLink } from '../../../use_workflow_editor_link';
import { getCompositeStatus } from '../helpers/get_composite_status';
import { getStepExecutionTime } from '../helpers/get_step_execution_time';

/**
 * Renders content for a group of steps that all belong to the same workflow.
 * Shows the workflow metadata (name, description, link) once, with a combined
 * execution time across all steps. This prevents the workflow name/description
 * from repeating when a custom alert retrieval workflow has multiple steps.
 */
export interface WorkflowGroupStepsProps {
  inspectButton?: React.ReactNode;
  steps: StepExecutionWithLink[];
}

const WorkflowGroupStepsComponent: React.FC<WorkflowGroupStepsProps> = ({
  inspectButton,
  steps,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const representativeStep = steps[0];
  const { editorUrl } = useWorkflowEditorLink({
    workflowId: representativeStep.workflowId,
    workflowRunId: representativeStep.workflowRunId,
  });

  const totalExecutionTimeMs = useMemo(() => {
    let total = 0;
    let hasAny = false;

    for (const step of steps) {
      const time = getStepExecutionTime(step);

      if (time != null) {
        total += time;
        hasAny = true;
      }
    }

    return hasAny ? total : undefined;
  }, [steps]);

  const compositeStatus = useMemo(() => getCompositeStatus(steps), [steps]);

  const hasWorkflowMetadata =
    representativeStep.workflowName != null || representativeStep.workflowDescription != null;

  return (
    <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="xs">
      {hasWorkflowMetadata && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="xs">
            {representativeStep.workflowName != null && (
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
                          <strong>{representativeStep.workflowName}</strong>
                        </EuiLink>
                      ) : (
                        <span data-test-subj="stepWorkflowName">
                          <strong>{representativeStep.workflowName}</strong>
                        </span>
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            {representativeStep.workflowDescription != null && (
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
                      {representativeStep.workflowDescription}
                    </EuiText>
                  }
                  forceState={isDescriptionExpanded ? 'open' : 'closed'}
                  id={`workflow-group-description-${
                    representativeStep.workflowId ?? representativeStep.id
                  }`}
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
      {(compositeStatus === ExecutionStatus.RUNNING ||
        totalExecutionTimeMs != null ||
        inspectButton != null) && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {compositeStatus === ExecutionStatus.RUNNING && (
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
                  startedAt={representativeStep.startedAt}
                />
              </EuiFlexItem>
            )}
            {compositeStatus !== ExecutionStatus.RUNNING && totalExecutionTimeMs != null && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon color="subdued" size="s" type="clock" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText color="subdued" size="xs">
                      {formatDuration(totalExecutionTimeMs)}
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

WorkflowGroupStepsComponent.displayName = 'WorkflowGroupSteps';

export const WorkflowGroupSteps = React.memo(WorkflowGroupStepsComponent);
