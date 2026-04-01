/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';

import { WorkflowPipelineMonitor } from '.';
import { TestProviders } from '../../../../common/mock';
import type { PipelineDataResponse } from '../../hooks/use_pipeline_data';
import { useWorkflowEditorLink } from '../../use_workflow_editor_link';
import type { StepExecutionWithLink } from '../types';

jest.mock('../../use_workflow_editor_link');
jest.mock('../live_timer', () => ({
  LiveTimer: jest.fn(({ render: renderProp, startedAt }) => {
    // When using the render prop, invoke it with mock data
    if (renderProp != null) {
      return (
        <span data-test-subj="liveTimer" data-started-at={startedAt ?? ''}>
          {renderProp({ formattedDuration: '5s', liveTimeMs: 5000 })}
        </span>
      );
    }

    return <span data-test-subj="liveTimer" data-started-at={startedAt ?? ''} />;
  }),
}));

const mockUseWorkflowEditorLink = useWorkflowEditorLink as jest.Mock;

const createMockStep = (overrides: Partial<StepExecutionWithLink> = {}): StepExecutionWithLink => ({
  error: undefined,
  executionTimeMs: undefined,
  finishedAt: undefined,
  globalExecutionIndex: 0,
  id: 'step-1',
  input: undefined,
  output: undefined,
  scopeStack: [],
  startedAt: '2024-01-01T00:00:00.000Z',
  state: undefined,
  status: ExecutionStatus.PENDING,
  stepExecutionIndex: 0,
  stepId: 'test_step',
  stepType: 'test',
  topologicalIndex: 0,
  workflowDescription: undefined,
  workflowId: 'workflow-123',
  workflowName: undefined,
  workflowRunId: 'run-456',
  ...overrides,
});

describe('WorkflowPipelineMonitor', () => {
  const mockNavigateToEditor = jest.fn();

  const mockStepExecutions: StepExecutionWithLink[] = [
    createMockStep({
      executionTimeMs: 1500,
      finishedAt: '2024-01-01T00:00:01.500Z',
      globalExecutionIndex: 0,
      id: 'step-1',
      status: ExecutionStatus.COMPLETED,
      stepId: 'retrieve_alerts',
      stepType: 'alert_retrieval',
      topologicalIndex: 0,
    }),
    createMockStep({
      // Note: executionTimeMs is undefined for running steps (calculated on finish)
      executionTimeMs: undefined,
      globalExecutionIndex: 1,
      id: 'step-2',
      startedAt: '2024-01-01T00:00:01.500Z',
      status: ExecutionStatus.RUNNING,
      stepId: 'generate_discoveries',
      stepType: 'generate',
      topologicalIndex: 1,
    }),
    createMockStep({
      globalExecutionIndex: 2,
      id: 'step-3',
      startedAt: '',
      status: ExecutionStatus.PENDING,
      stepId: 'validate_discoveries',
      stepType: 'validation',
      topologicalIndex: 2,
    }),
  ];

  const defaultProps = {
    stepExecutions: mockStepExecutions,
    workflowId: 'workflow-123',
    workflowRunId: 'run-456',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: 'http://localhost:5601/app/workflows/workflow-123',
      navigateToEditor: mockNavigateToEditor,
      resolvedWorkflowId: null,
    });
  });

  describe('rendering', () => {
    it('renders the component', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('workflowPipelineMonitor')).toBeInTheDocument();
    });

    it('does not render a redundant heading (flyout title provides context)', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByText('Workflow Execution')).not.toBeInTheDocument();
    });

    it('does not render the Open in Editor button', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('openInEditorButton')).not.toBeInTheDocument();
    });

    it('renders all steps using EuiSteps with display names matching the settings flyout', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('Alert retrieval')).toBeInTheDocument();
      expect(screen.getByText('Generation')).toBeInTheDocument();
      expect(screen.getByText('Validation')).toBeInTheDocument();
    });

    it('renders no steps message when stepExecutions is empty', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={[]} />
        </TestProviders>
      );

      expect(screen.getByText('No workflow steps available')).toBeInTheDocument();
    });
  });

  describe('step ordering', () => {
    it('renders steps in topological order', () => {
      const unorderedSteps: StepExecutionWithLink[] = [
        { ...mockStepExecutions[2], topologicalIndex: 2 },
        { ...mockStepExecutions[0], topologicalIndex: 0 },
        { ...mockStepExecutions[1], topologicalIndex: 1 },
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={unorderedSteps} />
        </TestProviders>
      );

      const stepTitles = document.querySelectorAll('.euiStep__title');

      expect(stepTitles[0]).toHaveTextContent('Alert retrieval');
      expect(stepTitles[1]).toHaveTextContent('Generation');
      expect(stepTitles[2]).toHaveTextContent('Validation');
    });
  });

  describe('step execution times', () => {
    it('renders execution time for completed steps', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('1s')).toBeInTheDocument();
    });

    it('renders LiveTimer for running steps with clock icon and formatted duration', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('liveTimer')).toBeInTheDocument();

      // The render prop produces a clock icon and formatted duration text
      expect(screen.getByText('5s')).toBeInTheDocument();
    });

    it('passes startedAt to LiveTimer for running steps', () => {
      const startedAt = '2024-01-01T00:00:01.500Z';

      const steps = [
        createMockStep({
          executionTimeMs: undefined, // Not set for running steps
          startedAt,
          status: ExecutionStatus.RUNNING,
          stepId: 'running_step',
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      const liveTimer = screen.getByTestId('liveTimer');

      // LiveTimer receives startedAt directly; it calculates elapsed time internally
      expect(liveTimer.getAttribute('data-started-at')).toBe(startedAt);
    });

    it('passes empty startedAt to LiveTimer when startedAt is empty', () => {
      const steps = [
        createMockStep({
          executionTimeMs: undefined,
          startedAt: '',
          status: ExecutionStatus.RUNNING,
          stepId: 'running_step',
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      const liveTimer = screen.getByTestId('liveTimer');

      expect(liveTimer.getAttribute('data-started-at')).toBe('');
    });
  });

  describe('editor link integration', () => {
    it('calls useWorkflowEditorLink with correct parameters', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} />
        </TestProviders>
      );

      expect(mockUseWorkflowEditorLink).toHaveBeenCalledWith({
        workflowId: 'workflow-123',
        workflowRunId: 'run-456',
      });
    });

    it('does not render Open in Editor button', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('openInEditorButton')).not.toBeInTheDocument();
    });

    it('handles null workflowId', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} workflowId={null} />
        </TestProviders>
      );

      expect(mockUseWorkflowEditorLink).toHaveBeenCalledWith({
        workflowId: null,
        workflowRunId: 'run-456',
      });
    });

    it('handles undefined workflowRunId', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} workflowRunId={undefined} />
        </TestProviders>
      );

      expect(mockUseWorkflowEditorLink).toHaveBeenCalledWith({
        workflowId: 'workflow-123',
        workflowRunId: undefined,
      });
    });
  });

  describe('status mappings', () => {
    // Note: EuiSteps uses CSS-in-JS with dynamic class names, so we test status behavior
    // indirectly by checking for the presence of status-specific visual elements.

    it('renders step with PENDING status (shows step number)', () => {
      const steps = [createMockStep({ status: ExecutionStatus.PENDING })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // PENDING maps to 'incomplete' which displays a step number
      const stepNumber = document.querySelector('.euiStepNumber');

      expect(stepNumber).toBeInTheDocument();
    });

    it('renders step with RUNNING status (shows loading spinner)', () => {
      const steps = [createMockStep({ status: ExecutionStatus.RUNNING })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // RUNNING maps to 'loading' which renders a spinner/loading indicator
      const loadingSpinner = document.querySelector('.euiLoadingSpinner');

      expect(loadingSpinner).toBeInTheDocument();
    });

    it('renders step with RUNNING status with pulsing title animation', () => {
      const steps = [createMockStep({ status: ExecutionStatus.RUNNING, stepId: 'running_step' })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // RUNNING step title should be wrapped in a span with animation styles
      const stepTitle = document.querySelector('.euiStep__title');
      const animatedSpan = stepTitle?.querySelector('span');

      expect(animatedSpan).toBeInTheDocument();
      expect(animatedSpan).toHaveTextContent('Running Step');
    });

    it('renders step with non-RUNNING status without pulsing title wrapper', () => {
      const steps = [
        createMockStep({ status: ExecutionStatus.COMPLETED, stepId: 'completed_step' }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // Non-RUNNING step title should NOT be wrapped in a span
      const stepTitle = document.querySelector('.euiStep__title');
      const animatedSpan = stepTitle?.querySelector('span');

      expect(animatedSpan).not.toBeInTheDocument();
      expect(stepTitle).toHaveTextContent('Completed Step');
    });

    it('renders pulsing title ONLY for the RUNNING step in a multi-step pipeline', () => {
      const steps = [
        createMockStep({
          status: ExecutionStatus.COMPLETED,
          stepId: 'first_step',
          topologicalIndex: 0,
        }),
        createMockStep({
          status: ExecutionStatus.RUNNING,
          stepId: 'second_step',
          topologicalIndex: 1,
        }),
        createMockStep({
          status: ExecutionStatus.PENDING,
          stepId: 'third_step',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      const stepTitles = document.querySelectorAll('.euiStep__title');

      expect(stepTitles).toHaveLength(3);

      // First step (COMPLETED) should NOT have pulsing span
      const firstStepSpan = stepTitles[0].querySelector('span');

      expect(firstStepSpan).not.toBeInTheDocument();
      expect(stepTitles[0]).toHaveTextContent('First Step');

      // Second step (RUNNING) SHOULD have pulsing span
      const secondStepSpan = stepTitles[1].querySelector('span');

      expect(secondStepSpan).toBeInTheDocument();
      expect(secondStepSpan).toHaveTextContent('Second Step');

      // Third step (PENDING) should NOT have pulsing span
      const thirdStepSpan = stepTitles[2].querySelector('span');

      expect(thirdStepSpan).not.toBeInTheDocument();
      expect(stepTitles[2]).toHaveTextContent('Third Step');
    });

    it('renders no pulsing titles when no step is RUNNING', () => {
      const steps = [
        createMockStep({
          status: ExecutionStatus.COMPLETED,
          stepId: 'first_step',
          topologicalIndex: 0,
        }),
        createMockStep({
          status: ExecutionStatus.COMPLETED,
          stepId: 'second_step',
          topologicalIndex: 1,
        }),
        createMockStep({
          status: ExecutionStatus.PENDING,
          stepId: 'third_step',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      const stepTitles = document.querySelectorAll('.euiStep__title');

      expect(stepTitles).toHaveLength(3);

      // No step should have a pulsing span wrapper
      stepTitles.forEach((title) => {
        const span = title.querySelector('span');

        expect(span).not.toBeInTheDocument();
      });
    });

    it('renders step with COMPLETED status (shows checkmark icon)', () => {
      const steps = [createMockStep({ status: ExecutionStatus.COMPLETED })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // COMPLETED maps to 'complete' which shows a check icon
      const checkIcon = document.querySelector('[data-euiicon-type="check"]');

      expect(checkIcon).toBeInTheDocument();
    });

    it('renders step with FAILED status (shows cross/danger icon)', () => {
      const steps = [createMockStep({ status: ExecutionStatus.FAILED })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // FAILED maps to 'danger' which shows a cross icon
      const crossIcon = document.querySelector('[data-euiicon-type="cross"]');

      expect(crossIcon).toBeInTheDocument();
    });

    it('renders step with TIMED_OUT status (shows cross/danger icon)', () => {
      const steps = [createMockStep({ status: ExecutionStatus.TIMED_OUT })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // TIMED_OUT maps to 'danger' which shows a cross icon
      const crossIcon = document.querySelector('[data-euiicon-type="cross"]');

      expect(crossIcon).toBeInTheDocument();
    });

    it('renders step with CANCELLED status without loading spinner', () => {
      const steps = [createMockStep({ status: ExecutionStatus.CANCELLED })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // CANCELLED maps to 'disabled' - should not show loading spinner
      const loadingSpinner = document.querySelector('.euiLoadingSpinner');

      expect(loadingSpinner).not.toBeInTheDocument();
      // Should still render the step
      expect(screen.getByText('Test Step')).toBeInTheDocument();
    });

    it('renders step with SKIPPED status without loading spinner', () => {
      const steps = [createMockStep({ status: ExecutionStatus.SKIPPED })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // SKIPPED maps to 'disabled' - should not show loading spinner
      const loadingSpinner = document.querySelector('.euiLoadingSpinner');

      expect(loadingSpinner).not.toBeInTheDocument();
      // Should still render the step
      expect(screen.getByText('Test Step')).toBeInTheDocument();
    });

    it('renders step with WAITING status (shows step number)', () => {
      const steps = [createMockStep({ status: ExecutionStatus.WAITING })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // WAITING maps to 'incomplete' which displays a step number
      const stepNumber = document.querySelector('.euiStepNumber');

      expect(stepNumber).toBeInTheDocument();
    });

    it('renders step with WAITING_FOR_INPUT status (shows step number)', () => {
      const steps = [createMockStep({ status: ExecutionStatus.WAITING_FOR_INPUT })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // WAITING_FOR_INPUT maps to 'incomplete' which displays a step number
      const stepNumber = document.querySelector('.euiStepNumber');

      expect(stepNumber).toBeInTheDocument();
    });
  });

  describe('step name formatting', () => {
    it('displays "Alert retrieval" for the retrieve_alerts step ID', () => {
      const steps = [createMockStep({ stepId: 'retrieve_alerts' })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      expect(screen.getByText('Alert retrieval')).toBeInTheDocument();
    });

    it('displays "Generation" for the generate_discoveries step ID', () => {
      const steps = [createMockStep({ stepId: 'generate_discoveries' })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      expect(screen.getByText('Generation')).toBeInTheDocument();
    });

    it('displays "Validation" for the validate_discoveries step ID', () => {
      const steps = [createMockStep({ stepId: 'validate_discoveries' })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      expect(screen.getByText('Validation')).toBeInTheDocument();
    });

    it('falls back to title case for unknown step IDs with underscores', () => {
      const steps = [createMockStep({ stepId: 'retrieve_security_alerts' })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      expect(screen.getByText('Retrieve Security Alerts')).toBeInTheDocument();
    });

    it('falls back to title case for unknown single word step IDs', () => {
      const steps = [createMockStep({ stepId: 'analyze' })];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      expect(screen.getByText('Analyze')).toBeInTheDocument();
    });
  });

  describe('workflow metadata', () => {
    it('renders workflow name as a link with bold text when editorUrl is available', () => {
      const steps = [
        createMockStep({
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          workflowName: 'ESQL Example Alert Retrieval',
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      const nameElement = screen.getByTestId('stepWorkflowName');

      expect(nameElement).toHaveTextContent('ESQL Example Alert Retrieval');

      // Should render as an EuiLink (anchor element) since editorUrl is available
      expect(nameElement.tagName).toBe('A');
      expect(nameElement).toHaveAttribute('href');
      expect(nameElement).toHaveAttribute('target', '_blank');

      // Workflow name should be rendered with bold font weight
      const strongElement = nameElement.querySelector('strong');

      expect(strongElement).toBeInTheDocument();
      expect(strongElement).toHaveTextContent('ESQL Example Alert Retrieval');
    });

    it('renders workflow name as plain text when editorUrl is not available', () => {
      mockUseWorkflowEditorLink.mockReturnValue({
        editorUrl: null,
        navigateToEditor: jest.fn(),
        resolvedWorkflowId: null,
      });

      const steps = [
        createMockStep({
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          workflowName: 'ESQL Example Alert Retrieval',
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      const nameElement = screen.getByTestId('stepWorkflowName');

      expect(nameElement).toHaveTextContent('ESQL Example Alert Retrieval');

      // Should render as a span (not a link) since editorUrl is null
      expect(nameElement.tagName).toBe('SPAN');
      expect(nameElement).not.toHaveAttribute('href');

      // Still has bold text
      const strongElement = nameElement.querySelector('strong');

      expect(strongElement).toBeInTheDocument();
    });

    it('renders workflow description in a collapsible accordion', () => {
      const steps = [
        createMockStep({
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          workflowDescription: 'Retrieves alerts using ES|QL queries',
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      const descriptionElement = screen.getByTestId('stepWorkflowDescription');

      expect(descriptionElement).toHaveTextContent('Retrieves alerts using ES|QL queries');

      // Description is inside an accordion (collapsed by default)
      const accordion = document.querySelector('.euiAccordion');

      expect(accordion).toBeInTheDocument();
    });

    it('expands the description accordion when clicked', () => {
      const steps = [
        createMockStep({
          id: 'expand-test-step',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          workflowDescription: 'Retrieves alerts using ES|QL queries',
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // The accordion should be closed initially
      const accordionButton = document.querySelector('.euiAccordion__button');

      expect(accordionButton).toBeInTheDocument();

      // Click to expand
      fireEvent.click(accordionButton!);

      // Description should still be visible (text is in buttonContent, not children)
      expect(screen.getByTestId('stepWorkflowDescription')).toHaveTextContent(
        'Retrieves alerts using ES|QL queries'
      );
    });

    it('renders both workflow name and description when both are available', () => {
      const steps = [
        createMockStep({
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          workflowDescription: 'Retrieves alerts using ES|QL queries',
          workflowName: 'ESQL Example Alert Retrieval',
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      expect(screen.getByTestId('stepWorkflowName')).toHaveTextContent(
        'ESQL Example Alert Retrieval'
      );
      expect(screen.getByTestId('stepWorkflowDescription')).toHaveTextContent(
        'Retrieves alerts using ES|QL queries'
      );
    });

    it('does not render workflow name when it is undefined', () => {
      const steps = [
        createMockStep({
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          workflowName: undefined,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('stepWorkflowName')).not.toBeInTheDocument();
    });

    it('does not render workflow description when it is undefined', () => {
      const steps = [
        createMockStep({
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          workflowDescription: undefined,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('stepWorkflowDescription')).not.toBeInTheDocument();
    });

    it('renders workflow name for running steps', () => {
      const steps = [
        createMockStep({
          startedAt: '2024-01-01T00:00:00.000Z',
          status: ExecutionStatus.RUNNING,
          stepId: 'generate_discoveries',
          workflowName: 'Attack discovery generation',
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      expect(screen.getByTestId('stepWorkflowName')).toHaveTextContent(
        'Attack discovery generation'
      );
    });
  });

  describe('grouped alert retrieval (multi-step workflow deduplication)', () => {
    it('renders workflow name ONCE when multiple alert retrieval steps come from the same workflow', () => {
      // Simulate a multi-step custom workflow (e.g., Agent Builder with ask_agent + followup)
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 93,
          finishedAt: '2024-01-01T00:00:00.093Z',
          id: 'step-ask',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.FAILED,
          stepId: 'ask_agent_for_alerts',
          topologicalIndex: 0,
          workflowDescription: 'Test workflow that uses the Agent Builder',
          workflowId: 'workflow-agent-builder',
          workflowName: 'Agent Builder Alert Retrieval',
          workflowRunId: 'run-abc',
        }),
        createMockStep({
          executionTimeMs: 57,
          finishedAt: '2024-01-01T00:00:00.150Z',
          id: 'step-followup',
          pipelinePhase: 'retrieve_alerts',
          startedAt: '2024-01-01T00:00:00.093Z',
          status: ExecutionStatus.FAILED,
          stepId: 'followup_if_needed',
          topologicalIndex: 1,
          workflowDescription: 'Test workflow that uses the Agent Builder',
          workflowId: 'workflow-agent-builder',
          workflowName: 'Agent Builder Alert Retrieval',
          workflowRunId: 'run-abc',
        }),
        createMockStep({
          id: 'step-gen',
          status: ExecutionStatus.PENDING,
          stepId: 'generate_discoveries',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // The workflow name should appear exactly once (grouped), not twice
      const nameElements = screen.getAllByTestId('stepWorkflowName');

      expect(nameElements).toHaveLength(1);
      expect(nameElements[0]).toHaveTextContent('Agent Builder Alert Retrieval');
    });

    it('renders workflow description ONCE when multiple alert retrieval steps come from the same workflow', () => {
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 93,
          finishedAt: '2024-01-01T00:00:00.093Z',
          id: 'step-ask',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.FAILED,
          stepId: 'ask_agent_for_alerts',
          topologicalIndex: 0,
          workflowDescription: 'Uses the Agent Builder converse API',
          workflowId: 'workflow-agent-builder',
          workflowName: 'Agent Builder Alert Retrieval',
          workflowRunId: 'run-abc',
        }),
        createMockStep({
          executionTimeMs: 57,
          finishedAt: '2024-01-01T00:00:00.150Z',
          id: 'step-followup',
          pipelinePhase: 'retrieve_alerts',
          startedAt: '2024-01-01T00:00:00.093Z',
          status: ExecutionStatus.FAILED,
          stepId: 'followup_if_needed',
          topologicalIndex: 1,
          workflowDescription: 'Uses the Agent Builder converse API',
          workflowId: 'workflow-agent-builder',
          workflowName: 'Agent Builder Alert Retrieval',
          workflowRunId: 'run-abc',
        }),
        createMockStep({
          id: 'step-gen',
          status: ExecutionStatus.PENDING,
          stepId: 'generate_discoveries',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // The workflow description should appear exactly once (grouped), not twice
      const descriptionElements = screen.getAllByTestId('stepWorkflowDescription');

      expect(descriptionElements).toHaveLength(1);
      expect(descriptionElements[0]).toHaveTextContent('Uses the Agent Builder converse API');
    });

    it('renders separate entries for steps from different workflows', () => {
      // Simulate legacy + custom workflow (different workflowIds)
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 500,
          finishedAt: '2024-01-01T00:00:00.500Z',
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowName: 'Default Alert Retrieval',
          workflowRunId: 'run-legacy',
        }),
        createMockStep({
          executionTimeMs: 200,
          finishedAt: '2024-01-01T00:00:00.700Z',
          id: 'step-custom',
          pipelinePhase: 'retrieve_alerts',
          startedAt: '2024-01-01T00:00:00.500Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'query_alerts',
          topologicalIndex: 1,
          workflowId: 'workflow-custom',
          workflowName: 'Custom ESQL Retrieval',
          workflowRunId: 'run-custom',
        }),
        createMockStep({
          id: 'step-gen',
          status: ExecutionStatus.PENDING,
          stepId: 'generate_discoveries',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // Each workflow should appear as a separate entry
      const nameElements = screen.getAllByTestId('stepWorkflowName');

      expect(nameElements).toHaveLength(2);
      expect(nameElements[0]).toHaveTextContent('Default Alert Retrieval');
      expect(nameElements[1]).toHaveTextContent('Custom ESQL Retrieval');
    });

    it('renders mixed: one single-step workflow and one multi-step workflow', () => {
      // Legacy (1 step) + Agent Builder (2 steps from same workflow)
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 500,
          finishedAt: '2024-01-01T00:00:00.500Z',
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowName: 'Default Alert Retrieval',
          workflowRunId: 'run-legacy',
        }),
        createMockStep({
          executionTimeMs: 93,
          finishedAt: '2024-01-01T00:00:00.593Z',
          id: 'step-ask',
          pipelinePhase: 'retrieve_alerts',
          startedAt: '2024-01-01T00:00:00.500Z',
          status: ExecutionStatus.FAILED,
          stepId: 'ask_agent_for_alerts',
          topologicalIndex: 1,
          workflowId: 'workflow-agent-builder',
          workflowName: 'Agent Builder Alert Retrieval',
          workflowRunId: 'run-agent',
        }),
        createMockStep({
          executionTimeMs: 57,
          finishedAt: '2024-01-01T00:00:00.650Z',
          id: 'step-followup',
          pipelinePhase: 'retrieve_alerts',
          startedAt: '2024-01-01T00:00:00.593Z',
          status: ExecutionStatus.FAILED,
          stepId: 'followup_if_needed',
          topologicalIndex: 2,
          workflowId: 'workflow-agent-builder',
          workflowName: 'Agent Builder Alert Retrieval',
          workflowRunId: 'run-agent',
        }),
        createMockStep({
          id: 'step-gen',
          status: ExecutionStatus.PENDING,
          stepId: 'generate_discoveries',
          topologicalIndex: 3,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // Should have exactly 2 workflow name entries:
      // - Legacy (single step, rendered via StepContent)
      // - Agent Builder (multi-step, rendered via WorkflowGroupSteps - name shown once)
      const nameElements = screen.getAllByTestId('stepWorkflowName');

      expect(nameElements).toHaveLength(2);
      expect(nameElements[0]).toHaveTextContent('Default Alert Retrieval');
      expect(nameElements[1]).toHaveTextContent('Agent Builder Alert Retrieval');
    });

    it('displays "Alert retrieval" as the title for a single alert retrieval step with a custom stepId', () => {
      // When only one custom alert retrieval workflow runs (e.g., Agent Builder),
      // its stepId is something like "ask_agent_for_alerts", but the UI should
      // always display "Alert retrieval" as the canonical pipeline phase name.
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 25000,
          finishedAt: '2024-01-01T00:00:25.000Z',
          id: 'step-agent',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'ask_agent_for_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-agent-builder',
          workflowName: 'Agent Builder Alert Retrieval (Test)',
          workflowRunId: 'run-agent',
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '2024-01-01T00:00:25.100Z',
          status: ExecutionStatus.RUNNING,
          stepId: 'generate_discoveries',
          topologicalIndex: 1,
        }),
        createMockStep({
          id: 'step-validate',
          startedAt: '',
          status: ExecutionStatus.PENDING,
          stepId: 'validate_discoveries',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      const stepTitles = document.querySelectorAll('.euiStep__title');

      // Should show "Alert retrieval", NOT "Ask Agent For Alerts"
      expect(stepTitles[0]).toHaveTextContent('Alert retrieval');
      expect(stepTitles[1]).toHaveTextContent('Generation');
      expect(stepTitles[2]).toHaveTextContent('Validation');
    });

    it('displays "Alert retrieval" as the title for a single alert retrieval step with stepId "retrieve_alerts"', () => {
      // The legacy workflow has stepId === 'retrieve_alerts' which matches
      // STEP_DISPLAY_NAMES directly. This test verifies backward compatibility.
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 108,
          finishedAt: '2024-01-01T00:00:00.108Z',
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowName: 'Default Alert Retrieval',
          workflowRunId: 'run-legacy',
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '2024-01-01T00:00:00.200Z',
          status: ExecutionStatus.RUNNING,
          stepId: 'generate_discoveries',
          topologicalIndex: 1,
        }),
        createMockStep({
          id: 'step-validate',
          startedAt: '',
          status: ExecutionStatus.PENDING,
          stepId: 'validate_discoveries',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      const stepTitles = document.querySelectorAll('.euiStep__title');

      expect(stepTitles[0]).toHaveTextContent('Alert retrieval');
      expect(stepTitles[1]).toHaveTextContent('Generation');
      expect(stepTitles[2]).toHaveTextContent('Validation');
    });

    it('uses "Alert retrieval" as the grouped parent title when there are multiple alert retrieval sub-steps', () => {
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
        }),
        createMockStep({
          id: 'step-custom',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'query_alerts',
          topologicalIndex: 1,
          workflowId: 'workflow-custom',
        }),
        createMockStep({
          id: 'step-gen',
          status: ExecutionStatus.PENDING,
          stepId: 'generate_discoveries',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // The parent step title should be "Alert retrieval"
      const stepTitles = document.querySelectorAll('.euiStep__title');

      expect(stepTitles[0]).toHaveTextContent('Alert retrieval');
      expect(stepTitles[1]).toHaveTextContent('Generation');
    });
  });

  describe('alert retrieval completion gating on generation start', () => {
    it('shows alert retrieval as RUNNING (not COMPLETED) when all sub-steps are complete but generation is still PENDING', () => {
      // Simulates the intermediate state where 2 of 3 alert retrieval workflows
      // have completed, but we don't know if more are coming because generation
      // hasn't started yet.
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 108,
          finishedAt: '2024-01-01T00:00:00.108Z',
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowName: 'Default Alert Retrieval',
          workflowRunId: 'run-legacy',
        }),
        createMockStep({
          executionTimeMs: 29000,
          finishedAt: '2024-01-01T00:00:29.108Z',
          id: 'step-agent',
          pipelinePhase: 'retrieve_alerts',
          startedAt: '2024-01-01T00:00:00.108Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'ask_agent_for_alerts',
          topologicalIndex: 1,
          workflowId: 'workflow-agent-builder',
          workflowName: 'Agent Builder Alert Retrieval (Test)',
          workflowRunId: 'run-agent',
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '',
          status: ExecutionStatus.PENDING,
          stepId: 'generate_discoveries',
          topologicalIndex: 2,
        }),
        createMockStep({
          id: 'step-validate',
          startedAt: '',
          status: ExecutionStatus.PENDING,
          stepId: 'validate_discoveries',
          topologicalIndex: 3,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // Alert retrieval should show loading spinner (RUNNING), not checkmark (COMPLETED)
      const loadingSpinner = document.querySelector('.euiLoadingSpinner');

      expect(loadingSpinner).toBeInTheDocument();

      // Should NOT show a checkmark for alert retrieval
      const checkIcons = document.querySelectorAll('[data-euiicon-type="check"]');

      expect(checkIcons).toHaveLength(0);
    });

    it('shows alert retrieval as COMPLETED when generation has started (non-PENDING status)', () => {
      // Once generation starts, we know all alert retrievals are done
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 108,
          finishedAt: '2024-01-01T00:00:00.108Z',
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowName: 'Default Alert Retrieval',
          workflowRunId: 'run-legacy',
        }),
        createMockStep({
          executionTimeMs: 29000,
          finishedAt: '2024-01-01T00:00:29.108Z',
          id: 'step-agent',
          pipelinePhase: 'retrieve_alerts',
          startedAt: '2024-01-01T00:00:00.108Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'ask_agent_for_alerts',
          topologicalIndex: 1,
          workflowId: 'workflow-agent-builder',
          workflowName: 'Agent Builder Alert Retrieval (Test)',
          workflowRunId: 'run-agent',
        }),
        createMockStep({
          executionTimeMs: 49,
          finishedAt: '2024-01-01T00:00:29.157Z',
          id: 'step-esql',
          pipelinePhase: 'retrieve_alerts',
          startedAt: '2024-01-01T00:00:29.108Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'query_alerts',
          topologicalIndex: 2,
          workflowId: 'workflow-esql',
          workflowName: 'ES|QL Example Alert Retrieval',
          workflowRunId: 'run-esql',
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '2024-01-01T00:00:29.200Z',
          status: ExecutionStatus.RUNNING,
          stepId: 'generate_discoveries',
          topologicalIndex: 3,
          workflowName: 'Attack discovery generation',
        }),
        createMockStep({
          id: 'step-validate',
          startedAt: '',
          status: ExecutionStatus.PENDING,
          stepId: 'validate_discoveries',
          topologicalIndex: 4,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // Alert retrieval should show checkmark (COMPLETED) since generation has started
      const checkIcons = document.querySelectorAll('[data-euiicon-type="check"]');

      expect(checkIcons.length).toBeGreaterThanOrEqual(1);
    });

    it('shows single alert retrieval step as RUNNING when generation is still PENDING', () => {
      // Even a single alert retrieval step should wait for generation to confirm completion
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 108,
          finishedAt: '2024-01-01T00:00:00.108Z',
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowName: 'Default Alert Retrieval',
          workflowRunId: 'run-legacy',
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '',
          status: ExecutionStatus.PENDING,
          stepId: 'generate_discoveries',
          topologicalIndex: 1,
        }),
        createMockStep({
          id: 'step-validate',
          startedAt: '',
          status: ExecutionStatus.PENDING,
          stepId: 'validate_discoveries',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // Should show loading spinner for alert retrieval, not checkmark
      const loadingSpinner = document.querySelector('.euiLoadingSpinner');

      expect(loadingSpinner).toBeInTheDocument();

      const checkIcons = document.querySelectorAll('[data-euiicon-type="check"]');

      expect(checkIcons).toHaveLength(0);
    });

    it('shows alert retrieval as RUNNING (pulsing title) when sub-steps are complete but generation is PENDING', () => {
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 108,
          finishedAt: '2024-01-01T00:00:00.108Z',
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowRunId: 'run-legacy',
        }),
        createMockStep({
          executionTimeMs: 200,
          finishedAt: '2024-01-01T00:00:00.308Z',
          id: 'step-custom',
          pipelinePhase: 'retrieve_alerts',
          startedAt: '2024-01-01T00:00:00.108Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'query_alerts',
          topologicalIndex: 1,
          workflowId: 'workflow-custom',
          workflowRunId: 'run-custom',
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '',
          status: ExecutionStatus.PENDING,
          stepId: 'generate_discoveries',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // The "Alert retrieval" title should have the pulsing animation span (RUNNING state)
      const stepTitles = document.querySelectorAll('.euiStep__title');
      const alertRetrievalTitle = stepTitles[0];
      const animatedSpan = alertRetrievalTitle?.querySelector('span');

      expect(animatedSpan).toBeInTheDocument();
      expect(animatedSpan).toHaveTextContent('Alert retrieval');
    });

    it('does NOT override alert retrieval status when it is RUNNING (some sub-steps still running)', () => {
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 108,
          finishedAt: '2024-01-01T00:00:00.108Z',
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowRunId: 'run-legacy',
        }),
        createMockStep({
          id: 'step-agent',
          pipelinePhase: 'retrieve_alerts',
          startedAt: '2024-01-01T00:00:00.108Z',
          status: ExecutionStatus.RUNNING,
          stepId: 'ask_agent_for_alerts',
          topologicalIndex: 1,
          workflowId: 'workflow-agent-builder',
          workflowRunId: 'run-agent',
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '',
          status: ExecutionStatus.PENDING,
          stepId: 'generate_discoveries',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // Alert retrieval is already RUNNING (because agent builder is running),
      // so the override should NOT change it — it should remain RUNNING
      const loadingSpinner = document.querySelector('.euiLoadingSpinner');

      expect(loadingSpinner).toBeInTheDocument();
    });

    it('does NOT override alert retrieval FAILED status even when generation is PENDING', () => {
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 108,
          finishedAt: '2024-01-01T00:00:00.108Z',
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.FAILED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowRunId: 'run-legacy',
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '',
          status: ExecutionStatus.PENDING,
          stepId: 'generate_discoveries',
          topologicalIndex: 1,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // FAILED status should NOT be overridden — should show cross icon
      const crossIcon = document.querySelector('[data-euiicon-type="cross"]');

      expect(crossIcon).toBeInTheDocument();
    });
  });

  describe('step ordering with N alert retrieval workflows', () => {
    it('renders steps in correct order (Alert retrieval → Generation → Validation) with 3 alert retrieval sub-steps', () => {
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 108,
          finishedAt: '2024-01-01T00:00:00.108Z',
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowName: 'Default Alert Retrieval',
          workflowRunId: 'run-legacy',
        }),
        createMockStep({
          executionTimeMs: 29000,
          finishedAt: '2024-01-01T00:00:29.108Z',
          id: 'step-agent',
          pipelinePhase: 'retrieve_alerts',
          startedAt: '2024-01-01T00:00:00.108Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'ask_agent_for_alerts',
          topologicalIndex: 1000,
          workflowId: 'workflow-agent-builder',
          workflowName: 'Agent Builder Alert Retrieval (Test)',
          workflowRunId: 'run-agent',
        }),
        createMockStep({
          executionTimeMs: 49,
          finishedAt: '2024-01-01T00:00:29.157Z',
          id: 'step-esql',
          pipelinePhase: 'retrieve_alerts',
          startedAt: '2024-01-01T00:00:29.108Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'query_alerts',
          topologicalIndex: 2000,
          workflowId: 'workflow-esql',
          workflowName: 'ES|QL Example Alert Retrieval',
          workflowRunId: 'run-esql',
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '2024-01-01T00:00:29.200Z',
          status: ExecutionStatus.RUNNING,
          stepId: 'generate_discoveries',
          topologicalIndex: 3000,
          workflowName: 'Attack discovery generation',
        }),
        createMockStep({
          id: 'step-validate',
          startedAt: '',
          status: ExecutionStatus.PENDING,
          stepId: 'validate_discoveries',
          topologicalIndex: 4000,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      const stepTitles = document.querySelectorAll('.euiStep__title');

      expect(stepTitles).toHaveLength(3);
      expect(stepTitles[0]).toHaveTextContent('Alert retrieval');
      expect(stepTitles[1]).toHaveTextContent('Generation');
      expect(stepTitles[2]).toHaveTextContent('Validation');
    });

    it('never renders Validation before Generation regardless of topologicalIndex values', () => {
      // This test simulates the bug scenario where validation placeholder (2000)
      // would appear before generation (3000) due to N=3 alert retrieval executions
      const steps: StepExecutionWithLink[] = [
        createMockStep({
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
        }),
        createMockStep({
          id: 'step-agent',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'ask_agent',
          topologicalIndex: 1000,
          workflowId: 'workflow-agent',
        }),
        createMockStep({
          id: 'step-esql',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'query_alerts',
          topologicalIndex: 2000,
          workflowId: 'workflow-esql',
        }),
        // Even if validation has a lower topologicalIndex than generation
        // (which was the bug), the component should render them in the
        // canonical order: generation before validation
        createMockStep({
          id: 'step-validate',
          startedAt: '',
          status: ExecutionStatus.PENDING,
          stepId: 'validate_discoveries',
          topologicalIndex: 2000,
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '2024-01-01T00:00:30Z',
          status: ExecutionStatus.RUNNING,
          stepId: 'generate_discoveries',
          topologicalIndex: 3000,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      const stepTitles = document.querySelectorAll('.euiStep__title');

      expect(stepTitles).toHaveLength(3);
      expect(stepTitles[0]).toHaveTextContent('Alert retrieval');
      // Generation must come before Validation regardless of index ordering
      expect(stepTitles[1]).toHaveTextContent('Generation');
      expect(stepTitles[2]).toHaveTextContent('Validation');
    });
  });

  describe('persistence step filtering', () => {
    it('does NOT render persist_discoveries as a separate pipeline phase', () => {
      const stepsWithPersistence: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 100,
          finishedAt: '2024-01-01T00:00:00.100Z',
          id: 'step-retrieval',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
        }),
        createMockStep({
          executionTimeMs: 2000,
          finishedAt: '2024-01-01T00:00:02.100Z',
          id: 'step-gen',
          startedAt: '2024-01-01T00:00:00.100Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'generate_discoveries',
          topologicalIndex: 1,
        }),
        createMockStep({
          executionTimeMs: 500,
          finishedAt: '2024-01-01T00:00:02.600Z',
          id: 'step-val',
          startedAt: '2024-01-01T00:00:02.100Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'validate_discoveries',
          topologicalIndex: 2,
        }),
        createMockStep({
          executionTimeMs: 250,
          finishedAt: '2024-01-01T00:00:02.850Z',
          id: 'step-persist',
          startedAt: '2024-01-01T00:00:02.600Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'persist_discoveries',
          topologicalIndex: 3,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={stepsWithPersistence} />
        </TestProviders>
      );

      const stepTitles = document.querySelectorAll('.euiStep__title');

      expect(stepTitles).toHaveLength(3);
      expect(stepTitles[0]).toHaveTextContent('Alert retrieval');
      expect(stepTitles[1]).toHaveTextContent('Generation');
      expect(stepTitles[2]).toHaveTextContent('Validation');
    });

    it('does NOT render steps with pipelinePhase persist_discoveries', () => {
      const stepsWithPersistencePhase: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 100,
          finishedAt: '2024-01-01T00:00:00.100Z',
          id: 'step-retrieval',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
        }),
        createMockStep({
          executionTimeMs: 2000,
          finishedAt: '2024-01-01T00:00:02.100Z',
          id: 'step-gen',
          startedAt: '2024-01-01T00:00:00.100Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'generate_discoveries',
          topologicalIndex: 1,
        }),
        createMockStep({
          executionTimeMs: 500,
          finishedAt: '2024-01-01T00:00:02.600Z',
          id: 'step-val',
          startedAt: '2024-01-01T00:00:02.100Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'validate_discoveries',
          topologicalIndex: 2,
        }),
        createMockStep({
          executionTimeMs: 250,
          finishedAt: '2024-01-01T00:00:02.850Z',
          id: 'step-persist-phase',
          pipelinePhase: 'persist_discoveries',
          startedAt: '2024-01-01T00:00:02.600Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'custom_persist',
          topologicalIndex: 3,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={stepsWithPersistencePhase} />
        </TestProviders>
      );

      const stepTitles = document.querySelectorAll('.euiStep__title');

      expect(stepTitles).toHaveLength(3);
      expect(stepTitles[0]).toHaveTextContent('Alert retrieval');
      expect(stepTitles[1]).toHaveTextContent('Generation');
      expect(stepTitles[2]).toHaveTextContent('Validation');
    });
  });

  describe('execution time display', () => {
    it('renders clock icon next to completed step execution time', () => {
      const steps = [
        createMockStep({
          executionTimeMs: 2500,
          status: ExecutionStatus.COMPLETED,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // Clock icon should appear next to the duration text for completed steps
      const clockIcon = document.querySelector('[data-euiicon-type="clock"]');

      expect(clockIcon).toBeInTheDocument();
      expect(screen.getByText('2s')).toBeInTheDocument();
    });

    it('renders execution time for completed steps with positive duration', () => {
      const steps = [
        createMockStep({
          executionTimeMs: 2500,
          status: ExecutionStatus.COMPLETED,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      expect(screen.getByText('2s')).toBeInTheDocument();
    });

    it('does not render execution time when executionTimeMs is zero', () => {
      const steps = [
        createMockStep({
          executionTimeMs: 0,
          status: ExecutionStatus.COMPLETED,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      expect(screen.queryByText('0ms')).not.toBeInTheDocument();
    });

    it('does not render execution time when executionTimeMs is null', () => {
      const steps = [
        createMockStep({
          executionTimeMs: undefined,
          status: ExecutionStatus.COMPLETED,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={steps} />
        </TestProviders>
      );

      // Should not have any time display (no 's' or 'ms' text outside of LiveTimer)
      const stepElement = document.querySelector('.euiStep__content');

      expect(stepElement?.textContent).not.toMatch(/\d+s|\d+ms/);
    });
  });

  describe('discovery count badges', () => {
    const pipelineDataWithDiscoveries: PipelineDataResponse = {
      alert_retrieval: null,
      combined_alerts: null,
      generation: {
        attack_discoveries: [
          {
            alert_ids: ['a1'],
            details_markdown: 'd1',
            summary_markdown: 's1',
            title: 'Discovery 1',
          },
          {
            alert_ids: ['a2'],
            details_markdown: 'd2',
            summary_markdown: 's2',
            title: 'Discovery 2',
          },
          {
            alert_ids: ['a3'],
            details_markdown: 'd3',
            summary_markdown: 's3',
            title: 'Discovery 3',
          },
        ],
        execution_uuid: 'exec-uuid',
        replacements: {},
      },
      validated_discoveries: [{ title: 'V1' }, { title: 'V2' }],
    };

    const completedSteps: StepExecutionWithLink[] = [
      createMockStep({
        executionTimeMs: 100,
        finishedAt: '2024-01-01T00:00:00.100Z',
        id: 'step-retrieval',
        status: ExecutionStatus.COMPLETED,
        stepId: 'retrieve_alerts',
        topologicalIndex: 0,
      }),
      createMockStep({
        executionTimeMs: 2000,
        finishedAt: '2024-01-01T00:00:02.100Z',
        id: 'step-gen',
        startedAt: '2024-01-01T00:00:00.100Z',
        status: ExecutionStatus.COMPLETED,
        stepId: 'generate_discoveries',
        topologicalIndex: 1,
      }),
      createMockStep({
        executionTimeMs: 500,
        finishedAt: '2024-01-01T00:00:02.600Z',
        id: 'step-val',
        startedAt: '2024-01-01T00:00:02.100Z',
        status: ExecutionStatus.COMPLETED,
        stepId: 'validate_discoveries',
        topologicalIndex: 2,
      }),
    ];

    it('renders a discovery count badge on the generation step when pipeline data has discoveries', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            pipelineData={pipelineDataWithDiscoveries}
            stepExecutions={completedSteps}
          />
        </TestProviders>
      );

      const badge = screen.getByTestId('generationDiscoveriesBadge');

      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('3 discoveries');
    });

    it('renders a discovery count badge on the validation step when pipeline data has validated discoveries', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            pipelineData={pipelineDataWithDiscoveries}
            stepExecutions={completedSteps}
          />
        </TestProviders>
      );

      const badge = screen.getByTestId('validationDiscoveriesBadge');

      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('2 discoveries');
    });

    it('does NOT render discovery badges when pipelineData is undefined', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={completedSteps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('generationDiscoveriesBadge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('validationDiscoveriesBadge')).not.toBeInTheDocument();
    });

    it('does NOT render generation badge when generation data is null', () => {
      const noGeneration: PipelineDataResponse = {
        ...pipelineDataWithDiscoveries,
        generation: null,
      };

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            pipelineData={noGeneration}
            stepExecutions={completedSteps}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('generationDiscoveriesBadge')).not.toBeInTheDocument();
    });

    it('renders "0 discoveries" when attack_discoveries is empty', () => {
      const emptyGeneration: PipelineDataResponse = {
        ...pipelineDataWithDiscoveries,
        generation: {
          attack_discoveries: [],
          execution_uuid: 'exec-uuid',
          replacements: {},
        },
      };

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            pipelineData={emptyGeneration}
            stepExecutions={completedSteps}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('generationDiscoveriesBadge')).toHaveTextContent('0 discoveries');
    });

    it('does NOT render validation badge when validated_discoveries is null', () => {
      const noValidation: PipelineDataResponse = {
        ...pipelineDataWithDiscoveries,
        validated_discoveries: null,
      };

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            pipelineData={noValidation}
            stepExecutions={completedSteps}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('validationDiscoveriesBadge')).not.toBeInTheDocument();
    });

    it('renders "1 discovery" (singular) for a single discovery', () => {
      const singleDiscovery: PipelineDataResponse = {
        ...pipelineDataWithDiscoveries,
        generation: {
          attack_discoveries: [
            {
              alert_ids: ['a1'],
              details_markdown: 'd1',
              summary_markdown: 's1',
              title: 'Only Discovery',
            },
          ],
          execution_uuid: 'exec-uuid',
          replacements: {},
        },
      };

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            pipelineData={singleDiscovery}
            stepExecutions={completedSteps}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('generationDiscoveriesBadge')).toHaveTextContent('1 discovery');
    });

    it('renders "0 discoveries" on validation when validated_discoveries is empty', () => {
      const emptyValidation: PipelineDataResponse = {
        ...pipelineDataWithDiscoveries,
        validated_discoveries: [],
      };

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            pipelineData={emptyValidation}
            stepExecutions={completedSteps}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('validationDiscoveriesBadge')).toHaveTextContent('0 discoveries');
    });
  });

  describe('inline inspect buttons', () => {
    const mockPipelineData: PipelineDataResponse = {
      alert_retrieval: [
        {
          alerts: ['alert-1', 'alert-2'],
          alerts_context_count: 2,
          extraction_strategy: 'default_esql',
          workflow_run_id: 'run-456',
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

    const allStepsCompleted: StepExecutionWithLink[] = [
      createMockStep({
        executionTimeMs: 1500,
        finishedAt: '2024-01-01T00:00:01.500Z',
        id: 'step-1',
        status: ExecutionStatus.COMPLETED,
        stepId: 'retrieve_alerts',
        topologicalIndex: 0,
      }),
      createMockStep({
        executionTimeMs: 2000,
        finishedAt: '2024-01-01T00:00:03.500Z',
        id: 'step-2',
        startedAt: '2024-01-01T00:00:01.500Z',
        status: ExecutionStatus.COMPLETED,
        stepId: 'generate_discoveries',
        topologicalIndex: 1,
      }),
      createMockStep({
        executionTimeMs: 500,
        finishedAt: '2024-01-01T00:00:04.000Z',
        id: 'step-3',
        startedAt: '2024-01-01T00:00:03.500Z',
        status: ExecutionStatus.COMPLETED,
        stepId: 'validate_discoveries',
        topologicalIndex: 2,
      }),
    ];

    it('renders inspect buttons for all three phases when pipelineData is provided', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            onViewData={jest.fn()}
            pipelineData={mockPipelineData}
            stepExecutions={allStepsCompleted}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('inspectAlertRetrieval')).toBeInTheDocument();
      expect(screen.getByTestId('inspectGeneration')).toBeInTheDocument();
      expect(screen.getByTestId('inspectValidation')).toBeInTheDocument();
    });

    it('does NOT render inspect buttons when pipelineData is undefined', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor {...defaultProps} stepExecutions={allStepsCompleted} />
        </TestProviders>
      );

      expect(screen.queryByTestId('inspectAlertRetrieval')).not.toBeInTheDocument();
      expect(screen.queryByTestId('inspectGeneration')).not.toBeInTheDocument();
      expect(screen.queryByTestId('inspectValidation')).not.toBeInTheDocument();
    });

    it('does NOT render inspect buttons when onViewData is undefined', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            pipelineData={mockPipelineData}
            stepExecutions={allStepsCompleted}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('inspectAlertRetrieval')).not.toBeInTheDocument();
      expect(screen.queryByTestId('inspectGeneration')).not.toBeInTheDocument();
      expect(screen.queryByTestId('inspectValidation')).not.toBeInTheDocument();
    });

    it('calls onViewData with "retrieval" and metadata when alert retrieval Inspect is clicked', async () => {
      const mockOnViewData = jest.fn();

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            onViewData={mockOnViewData}
            pipelineData={mockPipelineData}
            stepExecutions={allStepsCompleted}
          />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('inspectAlertRetrieval'));

      expect(mockOnViewData).toHaveBeenCalledWith('retrieval', {
        workflowId: 'workflow-123',
        workflowName: undefined,
        workflowRunId: 'run-456',
      });
    });

    it('calls onViewData with "generation" and metadata when generation Inspect is clicked', async () => {
      const mockOnViewData = jest.fn();

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            onViewData={mockOnViewData}
            pipelineData={mockPipelineData}
            stepExecutions={allStepsCompleted}
          />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('inspectGeneration'));

      expect(mockOnViewData).toHaveBeenCalledWith('generation', {
        workflowId: 'workflow-123',
        workflowName: undefined,
        workflowRunId: 'run-456',
      });
    });

    it('calls onViewData with "validation" and metadata when validation Inspect is clicked', async () => {
      const mockOnViewData = jest.fn();

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            onViewData={mockOnViewData}
            pipelineData={mockPipelineData}
            stepExecutions={allStepsCompleted}
          />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('inspectValidation'));

      expect(mockOnViewData).toHaveBeenCalledWith('validation', {
        workflowId: 'workflow-123',
        workflowName: undefined,
        workflowRunId: 'run-456',
      });
    });

    it('does NOT render alert retrieval inspect button when combined_alerts is null', () => {
      const partialPipelineData: PipelineDataResponse = {
        ...mockPipelineData,
        combined_alerts: null,
      };

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            onViewData={jest.fn()}
            pipelineData={partialPipelineData}
            stepExecutions={allStepsCompleted}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('inspectAlertRetrieval')).not.toBeInTheDocument();
      expect(screen.getByTestId('inspectGeneration')).toBeInTheDocument();
    });

    it('renders validation inspect button when validated_discoveries is null but generation is available (fallback)', () => {
      const partialPipelineData: PipelineDataResponse = {
        ...mockPipelineData,
        validated_discoveries: null,
      };

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            onViewData={jest.fn()}
            pipelineData={partialPipelineData}
            stepExecutions={allStepsCompleted}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('inspectValidation')).toBeInTheDocument();
      expect(screen.getByTestId('inspectGeneration')).toBeInTheDocument();
    });

    it('does NOT render validation inspect button when both validated_discoveries and generation are null', () => {
      const partialPipelineData: PipelineDataResponse = {
        ...mockPipelineData,
        generation: null,
        validated_discoveries: null,
      };

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            onViewData={jest.fn()}
            pipelineData={partialPipelineData}
            stepExecutions={allStepsCompleted}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('inspectValidation')).not.toBeInTheDocument();
    });

    it('renders per-workflow inspect buttons for grouped alert retrieval steps', () => {
      const multiRetrievalPipelineData: PipelineDataResponse = {
        ...mockPipelineData,
        alert_retrieval: [
          {
            alerts: ['alert-1'],
            alerts_context_count: 1,
            extraction_strategy: 'default_esql',
            workflow_run_id: 'run-legacy',
          },
          {
            alerts: ['alert-2'],
            alerts_context_count: 1,
            extraction_strategy: 'custom_workflow',
            workflow_run_id: 'run-custom',
          },
        ],
      };

      const groupedSteps: StepExecutionWithLink[] = [
        createMockStep({
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowRunId: 'run-legacy',
        }),
        createMockStep({
          id: 'step-custom',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'query_alerts',
          topologicalIndex: 1,
          workflowId: 'workflow-custom',
          workflowRunId: 'run-custom',
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '2024-01-01T00:00:01Z',
          status: ExecutionStatus.RUNNING,
          stepId: 'generate_discoveries',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            onViewData={jest.fn()}
            pipelineData={multiRetrievalPipelineData}
            stepExecutions={groupedSteps}
          />
        </TestProviders>
      );

      // Each workflow group gets its own inspect button, keyed by workflowRunId
      expect(screen.getByTestId('inspectAlertRetrieval-run-legacy')).toBeInTheDocument();
      expect(screen.getByTestId('inspectAlertRetrieval-run-custom')).toBeInTheDocument();
    });

    it('calls onViewData with "retrieval:<workflowRunId>" when per-workflow inspect buttons are clicked', async () => {
      const mockOnViewData = jest.fn();

      const multiRetrievalPipelineData: PipelineDataResponse = {
        ...mockPipelineData,
        alert_retrieval: [
          {
            alerts: ['alert-1'],
            alerts_context_count: 1,
            extraction_strategy: 'default_esql',
            workflow_run_id: 'run-legacy',
          },
          {
            alerts: ['alert-2'],
            alerts_context_count: 1,
            extraction_strategy: 'custom_workflow',
            workflow_run_id: 'run-custom',
          },
        ],
      };

      const groupedSteps: StepExecutionWithLink[] = [
        createMockStep({
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowRunId: 'run-legacy',
        }),
        createMockStep({
          id: 'step-custom',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'query_alerts',
          topologicalIndex: 1,
          workflowId: 'workflow-custom',
          workflowRunId: 'run-custom',
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '2024-01-01T00:00:01Z',
          status: ExecutionStatus.RUNNING,
          stepId: 'generate_discoveries',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            onViewData={mockOnViewData}
            pipelineData={multiRetrievalPipelineData}
            stepExecutions={groupedSteps}
          />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('inspectAlertRetrieval-run-legacy'));

      expect(mockOnViewData).toHaveBeenCalledWith('retrieval:run-legacy', {
        workflowId: 'workflow-legacy',
        workflowName: undefined,
        workflowRunId: 'run-legacy',
      });

      mockOnViewData.mockClear();

      await userEvent.click(screen.getByTestId('inspectAlertRetrieval-run-custom'));

      expect(mockOnViewData).toHaveBeenCalledWith('retrieval:run-custom', {
        workflowId: 'workflow-custom',
        workflowName: undefined,
        workflowRunId: 'run-custom',
      });
    });

    describe('combined alerts inspect button', () => {
      const multiRetrievalPipelineData: PipelineDataResponse = {
        alert_retrieval: [
          {
            alerts: ['alert-1'],
            alerts_context_count: 1,
            extraction_strategy: 'default_esql',
          },
          {
            alerts: ['alert-2'],
            alerts_context_count: 1,
            extraction_strategy: 'custom_workflow',
          },
        ],
        combined_alerts: {
          alerts: ['alert-1', 'alert-2'],
          alerts_context_count: 2,
        },
        generation: {
          attack_discoveries: [],
          execution_uuid: 'exec-uuid',
          replacements: {},
        },
        validated_discoveries: null,
      };

      const completedMultiRetrievalWithGenerationStarted: StepExecutionWithLink[] = [
        createMockStep({
          executionTimeMs: 500,
          finishedAt: '2024-01-01T00:00:00.500Z',
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowName: 'Default Alert Retrieval',
          workflowRunId: 'run-legacy',
        }),
        createMockStep({
          executionTimeMs: 200,
          finishedAt: '2024-01-01T00:00:00.700Z',
          id: 'step-custom',
          pipelinePhase: 'retrieve_alerts',
          startedAt: '2024-01-01T00:00:00.500Z',
          status: ExecutionStatus.COMPLETED,
          stepId: 'query_alerts',
          topologicalIndex: 1,
          workflowId: 'workflow-custom',
          workflowName: 'Custom ESQL Retrieval',
          workflowRunId: 'run-custom',
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '2024-01-01T00:00:00.800Z',
          status: ExecutionStatus.RUNNING,
          stepId: 'generate_discoveries',
          topologicalIndex: 2,
        }),
        createMockStep({
          id: 'step-validate',
          startedAt: '',
          status: ExecutionStatus.PENDING,
          stepId: 'validate_discoveries',
          topologicalIndex: 3,
        }),
      ];

      it('renders "Inspect combined alerts" button when generation has started and multiple workflows executed', () => {
        render(
          <TestProviders>
            <WorkflowPipelineMonitor
              {...defaultProps}
              onViewData={jest.fn()}
              pipelineData={multiRetrievalPipelineData}
              stepExecutions={completedMultiRetrievalWithGenerationStarted}
            />
          </TestProviders>
        );

        expect(screen.getByTestId('inspectCombinedAlerts')).toBeInTheDocument();
        expect(screen.getByText('Inspect combined alerts')).toBeInTheDocument();
      });

      it('does NOT render "Inspect combined alerts" when generation has NOT started (still PENDING)', () => {
        const stepsWithPendingGeneration: StepExecutionWithLink[] = [
          createMockStep({
            executionTimeMs: 500,
            finishedAt: '2024-01-01T00:00:00.500Z',
            id: 'step-legacy',
            pipelinePhase: 'retrieve_alerts',
            status: ExecutionStatus.COMPLETED,
            stepId: 'retrieve_alerts',
            topologicalIndex: 0,
            workflowId: 'workflow-legacy',
            workflowName: 'Default Alert Retrieval',
            workflowRunId: 'run-legacy',
          }),
          createMockStep({
            executionTimeMs: 200,
            finishedAt: '2024-01-01T00:00:00.700Z',
            id: 'step-custom',
            pipelinePhase: 'retrieve_alerts',
            startedAt: '2024-01-01T00:00:00.500Z',
            status: ExecutionStatus.COMPLETED,
            stepId: 'query_alerts',
            topologicalIndex: 1,
            workflowId: 'workflow-custom',
            workflowName: 'Custom ESQL Retrieval',
            workflowRunId: 'run-custom',
          }),
          createMockStep({
            id: 'step-gen',
            startedAt: '',
            status: ExecutionStatus.PENDING,
            stepId: 'generate_discoveries',
            topologicalIndex: 2,
          }),
        ];

        render(
          <TestProviders>
            <WorkflowPipelineMonitor
              {...defaultProps}
              onViewData={jest.fn()}
              pipelineData={multiRetrievalPipelineData}
              stepExecutions={stepsWithPendingGeneration}
            />
          </TestProviders>
        );

        expect(screen.queryByTestId('inspectCombinedAlerts')).not.toBeInTheDocument();
      });

      it('does NOT render "Inspect combined alerts" when only a single alert retrieval workflow executed', () => {
        const singleRetrievalWithGenerationStarted: StepExecutionWithLink[] = [
          createMockStep({
            executionTimeMs: 500,
            finishedAt: '2024-01-01T00:00:00.500Z',
            id: 'step-legacy',
            pipelinePhase: 'retrieve_alerts',
            status: ExecutionStatus.COMPLETED,
            stepId: 'retrieve_alerts',
            topologicalIndex: 0,
            workflowId: 'workflow-legacy',
            workflowName: 'Default Alert Retrieval',
            workflowRunId: 'run-legacy',
          }),
          createMockStep({
            id: 'step-gen',
            startedAt: '2024-01-01T00:00:00.600Z',
            status: ExecutionStatus.RUNNING,
            stepId: 'generate_discoveries',
            topologicalIndex: 1,
          }),
        ];

        render(
          <TestProviders>
            <WorkflowPipelineMonitor
              {...defaultProps}
              onViewData={jest.fn()}
              pipelineData={multiRetrievalPipelineData}
              stepExecutions={singleRetrievalWithGenerationStarted}
            />
          </TestProviders>
        );

        expect(screen.queryByTestId('inspectCombinedAlerts')).not.toBeInTheDocument();
      });

      it('does NOT render "Inspect combined alerts" when multiple steps come from the SAME workflow', () => {
        const sameWorkflowMultiStep: StepExecutionWithLink[] = [
          createMockStep({
            executionTimeMs: 93,
            finishedAt: '2024-01-01T00:00:00.093Z',
            id: 'step-ask',
            pipelinePhase: 'retrieve_alerts',
            status: ExecutionStatus.COMPLETED,
            stepId: 'ask_agent_for_alerts',
            topologicalIndex: 0,
            workflowId: 'workflow-agent-builder',
            workflowName: 'Agent Builder Alert Retrieval',
            workflowRunId: 'run-abc',
          }),
          createMockStep({
            executionTimeMs: 57,
            finishedAt: '2024-01-01T00:00:00.150Z',
            id: 'step-followup',
            pipelinePhase: 'retrieve_alerts',
            startedAt: '2024-01-01T00:00:00.093Z',
            status: ExecutionStatus.COMPLETED,
            stepId: 'followup_if_needed',
            topologicalIndex: 1,
            workflowId: 'workflow-agent-builder',
            workflowName: 'Agent Builder Alert Retrieval',
            workflowRunId: 'run-abc',
          }),
          createMockStep({
            id: 'step-gen',
            startedAt: '2024-01-01T00:00:00.200Z',
            status: ExecutionStatus.RUNNING,
            stepId: 'generate_discoveries',
            topologicalIndex: 2,
          }),
        ];

        render(
          <TestProviders>
            <WorkflowPipelineMonitor
              {...defaultProps}
              onViewData={jest.fn()}
              pipelineData={multiRetrievalPipelineData}
              stepExecutions={sameWorkflowMultiStep}
            />
          </TestProviders>
        );

        expect(screen.queryByTestId('inspectCombinedAlerts')).not.toBeInTheDocument();
      });

      it('calls onViewData with "combined_retrieval" when the combined inspect button is clicked', async () => {
        const mockOnViewData = jest.fn();

        render(
          <TestProviders>
            <WorkflowPipelineMonitor
              {...defaultProps}
              onViewData={mockOnViewData}
              pipelineData={multiRetrievalPipelineData}
              stepExecutions={completedMultiRetrievalWithGenerationStarted}
            />
          </TestProviders>
        );

        await userEvent.click(screen.getByTestId('inspectCombinedAlerts'));

        expect(mockOnViewData).toHaveBeenCalledWith('combined_retrieval');
      });

      it('renders total time next to the combined inspect button', () => {
        render(
          <TestProviders>
            <WorkflowPipelineMonitor
              {...defaultProps}
              onViewData={jest.fn()}
              pipelineData={multiRetrievalPipelineData}
              stepExecutions={completedMultiRetrievalWithGenerationStarted}
            />
          </TestProviders>
        );

        expect(screen.getByText(/total/i)).toBeInTheDocument();
      });

      it('does NOT render "Inspect combined alerts" when combined_alerts is null', () => {
        const pipelineDataNoCombined: PipelineDataResponse = {
          ...multiRetrievalPipelineData,
          combined_alerts: null,
        };

        render(
          <TestProviders>
            <WorkflowPipelineMonitor
              {...defaultProps}
              onViewData={jest.fn()}
              pipelineData={pipelineDataNoCombined}
              stepExecutions={completedMultiRetrievalWithGenerationStarted}
            />
          </TestProviders>
        );

        expect(screen.queryByTestId('inspectCombinedAlerts')).not.toBeInTheDocument();
      });
    });

    it('does NOT render per-workflow inspect button when no alert_retrieval entry matches that workflowRunId', () => {
      // Pipeline data has 1 alert_retrieval entry (run-456) but there are 2 workflow groups
      // (run-456 matches, run-custom does not)
      const groupedSteps: StepExecutionWithLink[] = [
        createMockStep({
          id: 'step-legacy',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          topologicalIndex: 0,
          workflowId: 'workflow-legacy',
          workflowRunId: 'run-456',
        }),
        createMockStep({
          id: 'step-custom',
          pipelinePhase: 'retrieve_alerts',
          status: ExecutionStatus.COMPLETED,
          stepId: 'query_alerts',
          topologicalIndex: 1,
          workflowId: 'workflow-custom',
          workflowRunId: 'run-custom',
        }),
        createMockStep({
          id: 'step-gen',
          startedAt: '2024-01-01T00:00:01Z',
          status: ExecutionStatus.RUNNING,
          stepId: 'generate_discoveries',
          topologicalIndex: 2,
        }),
      ];

      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            onViewData={jest.fn()}
            pipelineData={mockPipelineData}
            stepExecutions={groupedSteps}
          />
        </TestProviders>
      );

      // First workflow has a matching alert_retrieval entry (workflow_run_id: 'run-456')
      expect(screen.getByTestId('inspectAlertRetrieval-run-456')).toBeInTheDocument();
      // Second workflow does NOT have a matching entry
      expect(screen.queryByTestId('inspectAlertRetrieval-run-custom')).not.toBeInTheDocument();
    });

    it('renders all inspect buttons with "Inspect" label text', () => {
      render(
        <TestProviders>
          <WorkflowPipelineMonitor
            {...defaultProps}
            onViewData={jest.fn()}
            pipelineData={mockPipelineData}
            stepExecutions={allStepsCompleted}
          />
        </TestProviders>
      );

      const inspectButtons = screen.getAllByText('Inspect');

      expect(inspectButtons).toHaveLength(3);
    });
  });
});
