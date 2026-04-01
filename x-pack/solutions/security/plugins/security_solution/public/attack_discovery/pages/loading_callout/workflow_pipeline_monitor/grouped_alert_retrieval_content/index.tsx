/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';

import { formatDuration } from '../../format_duration';
import type { StepExecutionWithLink, WorkflowInspectMetadata } from '../../types';
import { StepContent } from '../step_content';
import { WorkflowGroupSteps } from '../workflow_group_steps';
import { groupStepsByWorkflow } from '../helpers/step_ordering';
import * as i18n from '../translations';

/**
 * Renders the content for a grouped "Alert retrieval" parent step that contains
 * multiple sub-workflow steps (e.g., legacy + custom alert retrieval).
 *
 * Steps from the same workflow are grouped together so the workflow name and
 * description appear only once (instead of repeating for every step).
 */
export interface GroupedAlertRetrievalContentProps {
  /** Badge showing the combined alerts count (e.g. "75 alerts" or "75+ alerts") */
  combinedAlertsCountBadge?: React.ReactNode;
  /** Combined time (ms) across all alert retrieval workflows; shown when combinedInspectButton is rendered */
  combinedTimeMs?: number;
  /** Inspect button for the combined alerts entry; null/undefined hides the combined row entirely */
  combinedInspectButton?: React.ReactNode;
  /** Renders an alerts count badge for the workflow identified by its workflowRunId */
  renderWorkflowAlertsCountBadge?: (workflowRunId?: string) => React.ReactNode;
  /** Renders an inspect button for the workflow identified by its workflowRunId */
  renderWorkflowInspectButton?: (
    workflowRunId: string | undefined,
    metadata: WorkflowInspectMetadata
  ) => React.ReactNode;
  subSteps: StepExecutionWithLink[];
}

const GroupedAlertRetrievalContentComponent: React.FC<GroupedAlertRetrievalContentProps> = ({
  combinedAlertsCountBadge,
  combinedTimeMs,
  combinedInspectButton,
  renderWorkflowAlertsCountBadge,
  renderWorkflowInspectButton,
  subSteps,
}) => {
  const workflowGroups = useMemo(() => groupStepsByWorkflow(subSteps), [subSteps]);

  return (
    <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
      {workflowGroups.map((group) => {
        const representativeStep = group[0];
        const key = representativeStep.workflowId ?? representativeStep.id;
        const metadata: WorkflowInspectMetadata = {
          workflowId: representativeStep.workflowId,
          workflowName: representativeStep.workflowName,
          workflowRunId: representativeStep.workflowRunId,
        };

        if (group.length === 1) {
          return (
            <EuiFlexItem grow={false} key={key}>
              <StepContent
                alertsCountBadge={renderWorkflowAlertsCountBadge?.(
                  representativeStep.workflowRunId
                )}
                executionTimeMs={representativeStep.executionTimeMs}
                finishedAt={representativeStep.finishedAt}
                inspectButton={renderWorkflowInspectButton?.(
                  representativeStep.workflowRunId,
                  metadata
                )}
                startedAt={representativeStep.startedAt}
                status={representativeStep.status}
                step={representativeStep}
              />
            </EuiFlexItem>
          );
        }

        return (
          <EuiFlexItem grow={false} key={key}>
            <WorkflowGroupSteps
              inspectButton={renderWorkflowInspectButton?.(
                representativeStep.workflowRunId,
                metadata
              )}
              steps={group}
            />
          </EuiFlexItem>
        );
      })}

      {combinedInspectButton != null && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {combinedAlertsCountBadge != null && (
              <EuiFlexItem grow={false}>{combinedAlertsCountBadge}</EuiFlexItem>
            )}
            {combinedTimeMs != null && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon color="subdued" size="s" type="clock" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText color="subdued" size="xs">
                      {formatDuration(combinedTimeMs)} {i18n.TOTAL}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>{combinedInspectButton}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

GroupedAlertRetrievalContentComponent.displayName = 'GroupedAlertRetrievalContent';

export const GroupedAlertRetrievalContent = React.memo(GroupedAlertRetrievalContentComponent);
