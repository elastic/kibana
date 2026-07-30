/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';

import type { StepExecutionWithLink, WorkflowInspectMetadata } from '../../types';
import { WorkflowGroupSteps } from '../workflow_group_steps';
import { groupStepsByWorkflow } from '../helpers/step_ordering';

/** The canonical step ID of the managed Attack Discovery generation workflow. */
const GENERATION_STEP_ID = 'generate_discoveries';

/**
 * Renders the content for the "Generation" pipeline phase, which may contain
 * more than one workflow: the optional generation-phase gate (skill) followed by
 * the generation workflow itself.
 *
 * The gate is surfaced like an alert-retrieval workflow (workflow name + alerts
 * count badge + raw-alerts inspect button), because it can retrieve net-new
 * alerts. The generation workflow is surfaced with a discovery count badge and
 * the generation inspect button. Each workflow's steps are grouped so its name
 * and description appear only once.
 */
export interface GroupedGenerationContentProps {
  /** Renders a discovery count badge for the generation workflow */
  renderDiscoveryCountBadge: (step: StepExecutionWithLink) => React.ReactNode;
  /** Renders the inspect button for the generation workflow */
  renderGenerationInspectButton: (step: StepExecutionWithLink) => React.ReactNode;
  /** Renders an alerts count badge for a gate workflow identified by its workflowRunId */
  renderWorkflowAlertsCountBadge: (workflowRunId?: string) => React.ReactNode;
  /** Renders an inspect button for a gate workflow identified by its workflowRunId */
  renderWorkflowInspectButton: (
    workflowRunId: string | undefined,
    metadata: WorkflowInspectMetadata
  ) => React.ReactNode;
  subSteps: StepExecutionWithLink[];
}

const isGenerationWorkflowGroup = (group: StepExecutionWithLink[]): boolean =>
  group.some((step) => step.stepId === GENERATION_STEP_ID);

const GroupedGenerationContentComponent: React.FC<GroupedGenerationContentProps> = ({
  renderDiscoveryCountBadge,
  renderGenerationInspectButton,
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
        const isGeneration = isGenerationWorkflowGroup(group);

        const badge = isGeneration
          ? renderDiscoveryCountBadge(representativeStep)
          : renderWorkflowAlertsCountBadge(representativeStep.workflowRunId);

        const inspectButton = isGeneration
          ? renderGenerationInspectButton(representativeStep)
          : renderWorkflowInspectButton(representativeStep.workflowRunId, {
              workflowId: representativeStep.workflowId,
              workflowName: representativeStep.workflowName,
              workflowRunId: representativeStep.workflowRunId,
            });

        return (
          <EuiFlexItem grow={false} key={key}>
            <WorkflowGroupSteps badge={badge} inspectButton={inspectButton} steps={group} />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

GroupedGenerationContentComponent.displayName = 'GroupedGenerationContent';

export const GroupedGenerationContent = React.memo(GroupedGenerationContentComponent);
