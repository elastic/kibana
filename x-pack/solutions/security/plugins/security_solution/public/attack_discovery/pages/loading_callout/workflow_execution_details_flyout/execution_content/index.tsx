/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import React from 'react';

import type { AggregatedWorkflowExecution, WorkflowInspectMetadata } from '../../types';
import { WorkflowPipelineMonitor } from '../../workflow_pipeline_monitor';
import type { PipelineDataResponse } from '../../../hooks/use_pipeline_data';
import * as i18n from '../translations';

interface Props {
  data: AggregatedWorkflowExecution | undefined;
  effectiveWorkflowId: string | null;
  effectiveWorkflowRunId: string | null | undefined;
  isLoading: boolean;
  onViewData: (step: string, metadata?: WorkflowInspectMetadata) => void;
  pipelineData: PipelineDataResponse | undefined;
}

const ExecutionContentComponent: React.FC<Props> = ({
  data,
  effectiveWorkflowId,
  effectiveWorkflowRunId,
  isLoading,
  onViewData,
  pipelineData,
}) => {
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

  if (data == null || data.steps == null || data.steps.length === 0) {
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
      onViewData={onViewData}
      pipelineData={pipelineData}
      stepExecutions={data.steps}
      workflowId={effectiveWorkflowId}
      workflowRunId={effectiveWorkflowRunId}
    />
  );
};

ExecutionContentComponent.displayName = 'ExecutionContent';

export const ExecutionContent = React.memo(ExecutionContentComponent);
