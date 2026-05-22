/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';
import type { HttpSetup } from '@kbn/core/public';

import { WorkflowExecutionDetailsFlyout } from '.';
import { TestProviders } from '../../../../common/mock';
import { usePipelineData } from '../../hooks/use_pipeline_data';
import type { PipelineDataResponse } from '../../hooks/use_pipeline_data';
import { useWorkflowExecutionDetails } from '../../hooks/use_workflow_execution_details';
import { WorkflowPipelineMonitor } from '../workflow_pipeline_monitor';
import type { AggregatedWorkflowExecution, StepExecutionWithLink } from '../types';
import type { TroubleshootWithAiProps } from './troubleshoot_with_ai';
import { FailureSection } from './failure_section';

jest.mock('../../hooks/use_pipeline_data');
jest.mock('../../hooks/use_workflow_execution_details');
jest.mock('../workflow_pipeline_monitor', () => ({
  WorkflowPipelineMonitor: jest.fn((props: Record<string, unknown>) => (
    <div data-test-subj="workflowPipelineMonitor">
      {'Mock WorkflowPipelineMonitor'}
      {typeof props.onViewData === 'function' && (
        <>
          <button
            data-test-subj="mockViewRetrieval"
            onClick={() => (props.onViewData as Function)('retrieval')}
            type="button"
          />
          <button
            data-test-subj="mockViewGeneration"
            onClick={() => (props.onViewData as Function)('generation')}
            type="button"
          />
          <button
            data-test-subj="mockViewValidation"
            onClick={() => (props.onViewData as Function)('validation')}
            type="button"
          />
        </>
      )}
    </div>
  )),
}));
jest.mock('..', () => ({
  LoadingCallout: jest.fn(({ hideActions }) => (
    <div data-test-subj="loadingCallout" data-hide-actions={hideActions}>
      {'Mock LoadingCallout'}
    </div>
  )),
}));
jest.mock('./troubleshoot_with_ai', () => ({
  TroubleshootWithAi: jest.fn((props: TroubleshootWithAiProps) => (
    <div data-test-subj="troubleshootWithAi" data-generation-status={props.generationStatus}>
      {'Mock TroubleshootWithAi'}
    </div>
  )),
}));
jest.mock('./failure_section', () => ({
  FailureSection: jest.fn(() => <div data-test-subj="failureSection" />),
}));

const MockWorkflowPipelineMonitor = WorkflowPipelineMonitor as unknown as jest.Mock;
const mockUsePipelineData = usePipelineData as jest.Mock;
const mockUseWorkflowExecutionDetails = useWorkflowExecutionDetails as jest.Mock;
const MockFailureSection = FailureSection as jest.MockedFunction<typeof FailureSection>;

const mockPipelineDataResponse: PipelineDataResponse = {
  alert_retrieval: [
    {
      alerts: ['alert-1', 'alert-2'],
      alerts_context_count: 2,
      extraction_strategy: 'default_esql',
    },
  ],
  combined_alerts: {
    alerts: ['alert-1', 'alert-2'],
    alerts_context_count: 2,
  },
  generation: {
    attack_discoveries: [
      {
        alert_ids: ['alert-1'],
        details_markdown: 'Details',
        summary_markdown: 'Summary',
        title: 'Test Discovery',
      },
    ],
    execution_uuid: 'exec-uuid',
    replacements: {},
  },
  validated_discoveries: [
    {
      alert_ids: ['alert-1'],
      details_markdown: 'Validated details',
      summary_markdown: 'Validated summary',
      title: 'Validated Discovery',
    },
  ],
};

describe('WorkflowExecutionDetailsFlyout', () => {
  const mockOnClose = jest.fn();
  const mockHttp = {} as HttpSetup;

  const mockStepExecutions: StepExecutionWithLink[] = [
    {
      error: undefined,
      executionTimeMs: 1500,
      finishedAt: '2024-01-01T00:00:01.500Z',
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
    executionUuid: 'exec-uuid-789',
    http: mockHttp,
    onClose: mockOnClose,
    workflowId: 'workflow-123',
    workflowRunId: 'run-456',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelineData.mockReturnValue({
      data: undefined,
      error: undefined,
      isError: false,
      isLoading: false,
    });
    mockUseWorkflowExecutionDetails.mockReturnValue({
      data: mockExecutionData,
      error: undefined,
      isLoading: false,
    });
  });

  describe('rendering', () => {
    it('renders the flyout', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('workflowExecutionDetailsFlyout')).toBeInTheDocument();
    });

    it('renders the flyout title', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('Workflow Execution Details')).toBeInTheDocument();
    });

    it('renders WorkflowPipelineMonitor when data is available', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('workflowPipelineMonitor')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders loading spinner when isLoading is true', () => {
      mockUseWorkflowExecutionDetails.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
      });

      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('loadingSpinner')).toBeInTheDocument();
    });

    it('renders loading message when isLoading is true', () => {
      mockUseWorkflowExecutionDetails.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
      });

      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('Loading execution details...')).toBeInTheDocument();
    });

    it('does not render WorkflowPipelineMonitor when isLoading is true', () => {
      mockUseWorkflowExecutionDetails.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
      });

      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('workflowPipelineMonitor')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state message when data is undefined', () => {
      mockUseWorkflowExecutionDetails.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
      });

      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('No execution data available')).toBeInTheDocument();
    });

    it('renders empty state message when steps is undefined', () => {
      mockUseWorkflowExecutionDetails.mockReturnValue({
        data: { ...mockExecutionData, steps: undefined },
        error: undefined,
        isLoading: false,
      });

      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('No execution data available')).toBeInTheDocument();
    });

    it('renders empty state message when steps is empty array', () => {
      mockUseWorkflowExecutionDetails.mockReturnValue({
        data: { ...mockExecutionData, steps: [] },
        error: undefined,
        isLoading: false,
      });

      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('No execution data available')).toBeInTheDocument();
    });

    it('does not render WorkflowPipelineMonitor when data is empty', () => {
      mockUseWorkflowExecutionDetails.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
      });

      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('workflowPipelineMonitor')).not.toBeInTheDocument();
    });
  });

  describe('hook integration', () => {
    it('calls useWorkflowExecutionDetails with correct parameters', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(mockUseWorkflowExecutionDetails).toHaveBeenCalledWith({
        executionUuid: 'exec-uuid-789',
        http: mockHttp,
        stubData: {
          eventActions: undefined,
          generationStatus: undefined,
        },
        workflowExecutions: undefined,
        workflowId: 'workflow-123',
        workflowRunId: 'run-456',
      });
    });

    it('handles null workflowRunId', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} workflowRunId={null} />
        </TestProviders>
      );

      expect(mockUseWorkflowExecutionDetails).toHaveBeenCalledWith({
        executionUuid: 'exec-uuid-789',
        http: mockHttp,
        stubData: {
          eventActions: undefined,
          generationStatus: undefined,
        },
        workflowExecutions: undefined,
        workflowId: 'workflow-123',
        workflowRunId: null,
      });
    });

    it('handles undefined workflowRunId', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} workflowRunId={undefined} />
        </TestProviders>
      );

      expect(mockUseWorkflowExecutionDetails).toHaveBeenCalledWith({
        executionUuid: 'exec-uuid-789',
        http: mockHttp,
        stubData: {
          eventActions: undefined,
          generationStatus: undefined,
        },
        workflowExecutions: undefined,
        workflowId: 'workflow-123',
        workflowRunId: undefined,
      });
    });
  });

  describe('close functionality', () => {
    it('calls onClose when flyout is closed', async () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      const closeButton = screen.getByTestId('euiFlyoutCloseButton');
      await userEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('flyout size', () => {
    it('renders flyout with medium size', () => {
      const { container } = render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      const flyout = container.querySelector('[data-test-subj="workflowExecutionDetailsFlyout"]');

      expect(flyout).toBeInTheDocument();
    });
  });

  describe('LoadingCallout integration', () => {
    it('renders LoadingCallout with hideActions set to true', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      const loadingCallout = screen.getByTestId('loadingCallout');

      expect(loadingCallout).toBeInTheDocument();
      expect(loadingCallout).toHaveAttribute('data-hide-actions', 'true');
    });
  });

  describe('refresh button', () => {
    const mockOnRefresh = jest.fn();

    it('renders the Refresh button when generationStatus is succeeded and onRefresh is provided', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout
            {...defaultProps}
            generationStatus="succeeded"
            onRefresh={mockOnRefresh}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('flyoutRefreshButton')).toBeInTheDocument();
    });

    it('does NOT render the Refresh button when generationStatus is started', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout
            {...defaultProps}
            generationStatus="started"
            onRefresh={mockOnRefresh}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('flyoutRefreshButton')).not.toBeInTheDocument();
    });

    it('does NOT render the Refresh button when generationStatus is failed', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout
            {...defaultProps}
            generationStatus="failed"
            onRefresh={mockOnRefresh}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('flyoutRefreshButton')).not.toBeInTheDocument();
    });

    it('does NOT render the Refresh button when generationStatus is canceled', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout
            {...defaultProps}
            generationStatus="canceled"
            onRefresh={mockOnRefresh}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('flyoutRefreshButton')).not.toBeInTheDocument();
    });

    it('does NOT render the Refresh button when generationStatus is dismissed', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout
            {...defaultProps}
            generationStatus="dismissed"
            onRefresh={mockOnRefresh}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('flyoutRefreshButton')).not.toBeInTheDocument();
    });

    it('does NOT render the Refresh button when generationStatus is undefined', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} onRefresh={mockOnRefresh} />
        </TestProviders>
      );

      expect(screen.queryByTestId('flyoutRefreshButton')).not.toBeInTheDocument();
    });

    it('does NOT render the Refresh button when onRefresh is not provided', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="succeeded" />
        </TestProviders>
      );

      expect(screen.queryByTestId('flyoutRefreshButton')).not.toBeInTheDocument();
    });

    it('calls onRefresh and onClose when the Refresh button is clicked', async () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout
            {...defaultProps}
            generationStatus="succeeded"
            onRefresh={mockOnRefresh}
          />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('flyoutRefreshButton'));

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('renders the Refresh button with the correct label', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout
            {...defaultProps}
            generationStatus="succeeded"
            onRefresh={mockOnRefresh}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('flyoutRefreshButton')).toHaveTextContent('Refresh');
    });
  });

  describe('usePipelineData integration', () => {
    it('calls usePipelineData with isEnabled=true and polling when generationStatus is started', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="started" />
        </TestProviders>
      );

      expect(mockUsePipelineData).toHaveBeenCalledWith(
        expect.objectContaining({
          isEnabled: true,
          refetchIntervalMs: 5000,
        })
      );
    });

    it('calls usePipelineData with isEnabled=false when generationStatus is undefined', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus={undefined} />
        </TestProviders>
      );

      expect(mockUsePipelineData).toHaveBeenCalledWith(
        expect.objectContaining({
          isEnabled: false,
        })
      );
    });

    it('calls usePipelineData with isEnabled=true and no polling when generationStatus is succeeded', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="succeeded" />
        </TestProviders>
      );

      expect(mockUsePipelineData).toHaveBeenCalledWith(
        expect.objectContaining({
          isEnabled: true,
          refetchIntervalMs: 0,
        })
      );
    });

    it('passes correct workflowId to usePipelineData', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(mockUsePipelineData).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'workflow-123',
        })
      );
    });

    it('passes executionUuid as executionId to usePipelineData', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(mockUsePipelineData).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: 'exec-uuid-789',
        })
      );
    });

    it('passes http to usePipelineData', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(mockUsePipelineData).toHaveBeenCalledWith(
        expect.objectContaining({
          http: mockHttp,
        })
      );
    });
  });

  describe('pipeline data passing', () => {
    it('passes pipelineData to WorkflowPipelineMonitor when generation succeeded and data is available', () => {
      mockUsePipelineData.mockReturnValue({
        data: mockPipelineDataResponse,
        error: undefined,
        isError: false,
        isLoading: false,
      });

      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="succeeded" />
        </TestProviders>
      );

      const lastCall = MockWorkflowPipelineMonitor.mock.calls.at(-1)?.[0];

      expect(lastCall?.pipelineData).toEqual(mockPipelineDataResponse);
    });

    it('passes undefined pipelineData to WorkflowPipelineMonitor when pipeline data has not been fetched yet', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="started" />
        </TestProviders>
      );

      const lastCall = MockWorkflowPipelineMonitor.mock.calls.at(-1)?.[0];

      expect(lastCall?.pipelineData).toBeUndefined();
    });

    it('passes onViewData callback to WorkflowPipelineMonitor', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      const lastCall = MockWorkflowPipelineMonitor.mock.calls.at(-1)?.[0];

      expect(lastCall?.onViewData).toEqual(expect.any(Function));
    });
  });

  describe('FailureSection rendering', () => {
    it('renders FailureSection when generationStatus is failed', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="failed" />
        </TestProviders>
      );

      expect(screen.getByTestId('failureSection')).toBeInTheDocument();
    });

    it('renders FailureSection when generationStatus is canceled', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="canceled" />
        </TestProviders>
      );

      expect(screen.getByTestId('failureSection')).toBeInTheDocument();
    });

    it('renders FailureSection when generationStatus is dismissed', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="dismissed" />
        </TestProviders>
      );

      expect(screen.getByTestId('failureSection')).toBeInTheDocument();
    });

    it('does NOT render FailureSection when generationStatus is succeeded', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="succeeded" />
        </TestProviders>
      );

      expect(screen.queryByTestId('failureSection')).not.toBeInTheDocument();
    });

    it('renders FailureSection when a step has FAILED status even if generationStatus is not failed', () => {
      mockUseWorkflowExecutionDetails.mockReturnValue({
        data: {
          ...mockExecutionData,
          steps: [
            {
              ...mockStepExecutions[0],
              status: ExecutionStatus.FAILED,
              stepId: 'validate_discoveries',
            },
          ],
        },
        error: undefined,
        isLoading: false,
      });

      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="succeeded" />
        </TestProviders>
      );

      expect(screen.getByTestId('failureSection')).toBeInTheDocument();
    });

    it('does NOT render FailureSection when generationStatus is started', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="started" />
        </TestProviders>
      );

      expect(screen.queryByTestId('failureSection')).not.toBeInTheDocument();
    });

    it('does NOT render FailureSection when generationStatus is undefined', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('failureSection')).not.toBeInTheDocument();
    });

    it('does NOT render FailureSection when execution data is not available', () => {
      mockUseWorkflowExecutionDetails.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
      });

      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="failed" />
        </TestProviders>
      );

      expect(screen.queryByTestId('failureSection')).not.toBeInTheDocument();
    });
  });

  describe('prop forwarding to FailureSection', () => {
    const failedProps = {
      ...defaultProps,
      generationStatus: 'failed' as const,
    };

    beforeEach(() => {
      MockFailureSection.mockClear();
    });

    it('passes sourceMetadata to FailureSection', () => {
      const sourceMetadata = { rule_id: 'rule-1', rule_name: 'My Rule' };

      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...failedProps} sourceMetadata={sourceMetadata} />
        </TestProviders>
      );

      expect(MockFailureSection).toHaveBeenCalledWith(
        expect.objectContaining({ sourceMetadata }),
        expect.anything()
      );
    });

    it('passes averageSuccessfulDurationMs to FailureSection', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...failedProps} averageSuccessfulDurationMs={1500} />
        </TestProviders>
      );

      expect(MockFailureSection).toHaveBeenCalledWith(
        expect.objectContaining({ averageSuccessfulDurationMs: 1500 }),
        expect.anything()
      );
    });

    it('passes configuredMaxAlerts to FailureSection', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...failedProps} configuredMaxAlerts={200} />
        </TestProviders>
      );

      expect(MockFailureSection).toHaveBeenCalledWith(
        expect.objectContaining({ configuredMaxAlerts: 200 }),
        expect.anything()
      );
    });

    it('passes connectorActionTypeId to FailureSection', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...failedProps} connectorActionTypeId=".bedrock" />
        </TestProviders>
      );

      expect(MockFailureSection).toHaveBeenCalledWith(
        expect.objectContaining({ connectorActionTypeId: '.bedrock' }),
        expect.anything()
      );
    });

    it('passes connectorModel to FailureSection', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...failedProps} connectorModel="claude-3-5" />
        </TestProviders>
      );

      expect(MockFailureSection).toHaveBeenCalledWith(
        expect.objectContaining({ connectorModel: 'claude-3-5' }),
        expect.anything()
      );
    });

    it('passes dateRangeEnd to FailureSection', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout
            {...failedProps}
            dateRangeEnd="2025-01-15T10:00:00.000Z"
          />
        </TestProviders>
      );

      expect(MockFailureSection).toHaveBeenCalledWith(
        expect.objectContaining({ dateRangeEnd: '2025-01-15T10:00:00.000Z' }),
        expect.anything()
      );
    });

    it('passes dateRangeStart to FailureSection', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout
            {...failedProps}
            dateRangeStart="2025-01-14T10:00:00.000Z"
          />
        </TestProviders>
      );

      expect(MockFailureSection).toHaveBeenCalledWith(
        expect.objectContaining({ dateRangeStart: '2025-01-14T10:00:00.000Z' }),
        expect.anything()
      );
    });

    it('passes duplicatesDroppedCount to FailureSection', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...failedProps} duplicatesDroppedCount={5} />
        </TestProviders>
      );

      expect(MockFailureSection).toHaveBeenCalledWith(
        expect.objectContaining({ duplicatesDroppedCount: 5 }),
        expect.anything()
      );
    });

    it('passes generatedCount to FailureSection', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...failedProps} generatedCount={12} />
        </TestProviders>
      );

      expect(MockFailureSection).toHaveBeenCalledWith(
        expect.objectContaining({ generatedCount: 12 }),
        expect.anything()
      );
    });

    it('passes hallucinationsFilteredCount to FailureSection', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...failedProps} hallucinationsFilteredCount={4} />
        </TestProviders>
      );

      expect(MockFailureSection).toHaveBeenCalledWith(
        expect.objectContaining({ hallucinationsFilteredCount: 4 }),
        expect.anything()
      );
    });

    it('passes persistedCount to FailureSection', () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...failedProps} persistedCount={8} />
        </TestProviders>
      );

      expect(MockFailureSection).toHaveBeenCalledWith(
        expect.objectContaining({ persistedCount: 8 }),
        expect.anything()
      );
    });

    it('passes perWorkflowAlertRetrieval extracted from pipelineData to FailureSection', () => {
      mockUsePipelineData.mockReturnValue({
        data: {
          ...mockPipelineDataResponse,
          alert_retrieval: [
            {
              alerts: ['alert-1'],
              alerts_context_count: 5,
              extraction_strategy: 'default_esql' as const,
              workflow_run_id: 'run-abc',
            },
          ],
        },
        error: undefined,
        isError: false,
        isLoading: false,
      });

      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...failedProps} />
        </TestProviders>
      );

      expect(MockFailureSection).toHaveBeenCalledWith(
        expect.objectContaining({
          perWorkflowAlertRetrieval: expect.arrayContaining([
            expect.objectContaining({ alertsContextCount: 5, workflowRunId: 'run-abc' }),
          ]),
        }),
        expect.anything()
      );
    });
  });

  describe('StepDataModal integration', () => {
    beforeEach(() => {
      mockUsePipelineData.mockReturnValue({
        data: mockPipelineDataResponse,
        error: undefined,
        isError: false,
        isLoading: false,
      });
    });

    it('opens StepDataModal when retrieval Inspect is triggered', async () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="succeeded" />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('mockViewRetrieval'));

      expect(screen.getByTestId('stepDataModal')).toBeInTheDocument();
    });

    it('opens StepDataModal when generation Inspect is triggered', async () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="succeeded" />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('mockViewGeneration'));

      expect(screen.getByTestId('stepDataModal')).toBeInTheDocument();
    });

    it('opens StepDataModal when validation Inspect is triggered', async () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="succeeded" />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('mockViewValidation'));

      expect(screen.getByTestId('stepDataModal')).toBeInTheDocument();
    });

    it('shows retrieval data in StepDataModal with correct alert count', async () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="succeeded" />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('mockViewRetrieval'));

      expect(screen.getByTestId('stepDataModalDataCount')).toHaveTextContent('Count: 2');
    });

    it('shows generation data in StepDataModal with correct discovery count', async () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="succeeded" />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('mockViewGeneration'));

      expect(screen.getByTestId('stepDataModalDataCount')).toHaveTextContent('Count: 1');
    });

    it('shows validation data in StepDataModal with correct validated count', async () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="succeeded" />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('mockViewValidation'));

      expect(screen.getByTestId('stepDataModalDataCount')).toHaveTextContent('Count: 1');
    });

    it('closes StepDataModal when close button is clicked', async () => {
      render(
        <TestProviders>
          <WorkflowExecutionDetailsFlyout {...defaultProps} generationStatus="succeeded" />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('mockViewRetrieval'));

      expect(screen.getByTestId('stepDataModal')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('stepDataModalCloseButton'));

      expect(screen.queryByTestId('stepDataModal')).not.toBeInTheDocument();
    });
  });
});
