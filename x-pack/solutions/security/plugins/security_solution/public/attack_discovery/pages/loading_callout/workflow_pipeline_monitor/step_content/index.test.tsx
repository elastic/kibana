/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';

import { StepContent } from '.';
import { TestProviders } from '../../../../../common/mock';
import { useWorkflowEditorLink } from '../../../use_workflow_editor_link';
import type { StepExecutionWithLink } from '../../types';

jest.mock('../../../use_workflow_editor_link');
jest.mock('../../live_timer', () => ({
  LiveTimer: jest.fn(({ render: renderProp, startedAt }) => {
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
  status: ExecutionStatus.COMPLETED,
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

describe('StepContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: 'http://localhost:5601/app/workflows/workflow-123',
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });
  });

  it('renders workflow name as a link when editorUrl is available', () => {
    const step = createMockStep({ workflowName: 'My Workflow' });

    render(
      <TestProviders>
        <StepContent
          executionTimeMs={step.executionTimeMs}
          finishedAt={step.finishedAt}
          startedAt={step.startedAt}
          status={step.status}
          step={step}
        />
      </TestProviders>
    );

    const nameElement = screen.getByTestId('stepWorkflowName');

    expect(nameElement.tagName).toBe('A');
    expect(nameElement).toHaveTextContent('My Workflow');
  });

  it('renders workflow name as plain text when editorUrl is null', () => {
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: null,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });

    const step = createMockStep({ workflowName: 'My Workflow' });

    render(
      <TestProviders>
        <StepContent
          executionTimeMs={step.executionTimeMs}
          finishedAt={step.finishedAt}
          startedAt={step.startedAt}
          status={step.status}
          step={step}
        />
      </TestProviders>
    );

    const nameElement = screen.getByTestId('stepWorkflowName');

    expect(nameElement.tagName).toBe('SPAN');
  });

  it('renders workflow description in a collapsible accordion', () => {
    const step = createMockStep({ workflowDescription: 'Retrieves alerts' });

    render(
      <TestProviders>
        <StepContent
          executionTimeMs={step.executionTimeMs}
          finishedAt={step.finishedAt}
          startedAt={step.startedAt}
          status={step.status}
          step={step}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('stepWorkflowDescription')).toHaveTextContent('Retrieves alerts');
  });

  it('expands the description accordion when clicked', () => {
    const step = createMockStep({ workflowDescription: 'Retrieves alerts' });

    render(
      <TestProviders>
        <StepContent
          executionTimeMs={step.executionTimeMs}
          finishedAt={step.finishedAt}
          startedAt={step.startedAt}
          status={step.status}
          step={step}
        />
      </TestProviders>
    );

    const accordionButton = document.querySelector('.euiAccordion__button');

    fireEvent.click(accordionButton!);

    expect(screen.getByTestId('stepWorkflowDescription')).toHaveTextContent('Retrieves alerts');
  });

  it('renders LiveTimer for running steps', () => {
    const step = createMockStep({ status: ExecutionStatus.RUNNING });

    render(
      <TestProviders>
        <StepContent
          executionTimeMs={undefined}
          finishedAt={undefined}
          startedAt={step.startedAt}
          status={ExecutionStatus.RUNNING}
          step={step}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('liveTimer')).toBeInTheDocument();
  });

  it('renders formatted duration for completed steps with executionTimeMs', () => {
    const step = createMockStep({
      executionTimeMs: 2500,
      finishedAt: '2024-01-01T00:00:02.500Z',
      status: ExecutionStatus.COMPLETED,
    });

    render(
      <TestProviders>
        <StepContent
          executionTimeMs={2500}
          finishedAt={step.finishedAt}
          startedAt={step.startedAt}
          status={ExecutionStatus.COMPLETED}
          step={step}
        />
      </TestProviders>
    );

    expect(screen.getByText('2s')).toBeInTheDocument();
  });

  it('does not render metadata section when workflowName and workflowDescription are undefined', () => {
    const step = createMockStep();

    render(
      <TestProviders>
        <StepContent
          executionTimeMs={undefined}
          finishedAt={undefined}
          startedAt={step.startedAt}
          status={ExecutionStatus.PENDING}
          step={step}
        />
      </TestProviders>
    );

    expect(screen.queryByTestId('stepWorkflowName')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stepWorkflowDescription')).not.toBeInTheDocument();
  });

  it('renders alertsCountBadge when provided', () => {
    const step = createMockStep({
      executionTimeMs: 100,
      finishedAt: '2024-01-01T00:00:00.100Z',
      status: ExecutionStatus.COMPLETED,
    });

    render(
      <TestProviders>
        <StepContent
          alertsCountBadge={<span data-test-subj="testAlertsBadge">{'75 alerts'}</span>}
          executionTimeMs={100}
          finishedAt={step.finishedAt}
          startedAt={step.startedAt}
          status={ExecutionStatus.COMPLETED}
          step={step}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('testAlertsBadge')).toHaveTextContent('75 alerts');
  });

  it('does not render alertsCountBadge when not provided', () => {
    const step = createMockStep({
      executionTimeMs: 100,
      finishedAt: '2024-01-01T00:00:00.100Z',
      status: ExecutionStatus.COMPLETED,
    });

    render(
      <TestProviders>
        <StepContent
          executionTimeMs={100}
          finishedAt={step.finishedAt}
          startedAt={step.startedAt}
          status={ExecutionStatus.COMPLETED}
          step={step}
        />
      </TestProviders>
    );

    expect(screen.queryByTestId('testAlertsBadge')).not.toBeInTheDocument();
  });
});
