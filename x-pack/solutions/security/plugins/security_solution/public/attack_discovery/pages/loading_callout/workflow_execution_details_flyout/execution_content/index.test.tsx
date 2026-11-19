/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';

import type { AggregatedWorkflowExecution, StepExecutionWithLink } from '../../types';
import { WorkflowPipelineMonitor } from '../../workflow_pipeline_monitor';
import { ExecutionContent } from '.';

jest.mock('../../workflow_pipeline_monitor', () => ({
  WorkflowPipelineMonitor: jest.fn(() => (
    <div data-test-subj="workflowPipelineMonitor">{'Mock WorkflowPipelineMonitor'}</div>
  )),
}));

const mockStepExecutions: StepExecutionWithLink[] = [
  {
    error: undefined,
    executionTimeMs: 1000,
    finishedAt: '2024-01-01T00:00:01.000Z',
    globalExecutionIndex: 0,
    id: 'step-1',
    input: undefined,
    output: undefined,
    scopeStack: [],
    startedAt: '2024-01-01T00:00:00.000Z',
    state: undefined,
    status: ExecutionStatus.COMPLETED,
    stepExecutionIndex: 0,
    stepId: 'retrieve_alerts',
    stepType: 'alert_retrieval',
    topologicalIndex: 0,
    workflowId: 'workflow-123',
    workflowRunId: 'run-456',
  },
];

const mockExecutionData: AggregatedWorkflowExecution = {
  status: ExecutionStatus.RUNNING,
  steps: mockStepExecutions,
  workflowExecutions: null,
};

const defaultProps = {
  data: mockExecutionData,
  effectiveWorkflowId: 'workflow-123',
  effectiveWorkflowRunId: 'run-456',
  isLoading: false,
  onViewData: jest.fn(),
  pipelineData: undefined,
};

describe('ExecutionContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('renders loading spinner when isLoading is true', () => {
      render(<ExecutionContent {...defaultProps} isLoading={true} data={undefined} />);

      expect(screen.getByTestId('loadingSpinner')).toBeInTheDocument();
    });

    it('renders loading message when isLoading is true', () => {
      render(<ExecutionContent {...defaultProps} isLoading={true} data={undefined} />);

      expect(screen.getByText('Loading execution details...')).toBeInTheDocument();
    });

    it('does not render WorkflowPipelineMonitor when isLoading is true', () => {
      render(<ExecutionContent {...defaultProps} isLoading={true} data={undefined} />);

      expect(screen.queryByTestId('workflowPipelineMonitor')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state when data is undefined', () => {
      render(<ExecutionContent {...defaultProps} data={undefined} />);

      expect(screen.getByText('No execution data available')).toBeInTheDocument();
    });

    it('renders empty state when steps is undefined', () => {
      render(
        <ExecutionContent
          {...defaultProps}
          data={{ ...mockExecutionData, steps: undefined as never }}
        />
      );

      expect(screen.getByText('No execution data available')).toBeInTheDocument();
    });

    it('renders empty state when steps is empty array', () => {
      render(<ExecutionContent {...defaultProps} data={{ ...mockExecutionData, steps: [] }} />);

      expect(screen.getByText('No execution data available')).toBeInTheDocument();
    });

    it('does not render WorkflowPipelineMonitor when data is empty', () => {
      render(<ExecutionContent {...defaultProps} data={undefined} />);

      expect(screen.queryByTestId('workflowPipelineMonitor')).not.toBeInTheDocument();
    });
  });

  describe('pipeline content', () => {
    it('renders WorkflowPipelineMonitor when data and steps are available', () => {
      render(<ExecutionContent {...defaultProps} />);

      expect(screen.getByTestId('workflowPipelineMonitor')).toBeInTheDocument();
    });

    it('passes stepExecutions to WorkflowPipelineMonitor', () => {
      render(<ExecutionContent {...defaultProps} />);

      const lastCall = (WorkflowPipelineMonitor as unknown as jest.Mock).mock.calls.at(-1)?.[0];

      expect(lastCall?.stepExecutions).toEqual(mockStepExecutions);
    });

    it('passes effectiveWorkflowId to WorkflowPipelineMonitor', () => {
      render(<ExecutionContent {...defaultProps} />);

      const lastCall = (WorkflowPipelineMonitor as unknown as jest.Mock).mock.calls.at(-1)?.[0];

      expect(lastCall?.workflowId).toBe('workflow-123');
    });

    it('passes effectiveWorkflowRunId to WorkflowPipelineMonitor', () => {
      render(<ExecutionContent {...defaultProps} />);

      const lastCall = (WorkflowPipelineMonitor as unknown as jest.Mock).mock.calls.at(-1)?.[0];

      expect(lastCall?.workflowRunId).toBe('run-456');
    });

    it('passes onViewData to WorkflowPipelineMonitor', () => {
      render(<ExecutionContent {...defaultProps} />);

      const lastCall = (WorkflowPipelineMonitor as unknown as jest.Mock).mock.calls.at(-1)?.[0];

      expect(lastCall?.onViewData).toEqual(expect.any(Function));
    });
  });
});
