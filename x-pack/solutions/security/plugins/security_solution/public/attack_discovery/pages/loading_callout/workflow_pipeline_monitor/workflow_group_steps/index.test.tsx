/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';

import { WorkflowGroupSteps } from '.';
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

describe('WorkflowGroupSteps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: 'http://localhost:5601/app/workflows/workflow-123',
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });
  });

  it('renders workflow name once for a group of steps', () => {
    const steps = [
      createMockStep({ id: 's1', workflowName: 'Agent Builder' }),
      createMockStep({ id: 's2', workflowName: 'Agent Builder' }),
    ];

    render(
      <TestProviders>
        <WorkflowGroupSteps steps={steps} />
      </TestProviders>
    );

    const nameElements = screen.getAllByTestId('stepWorkflowName');

    expect(nameElements).toHaveLength(1);
    expect(nameElements[0]).toHaveTextContent('Agent Builder');
  });

  it('renders combined execution time across all steps', () => {
    const steps = [
      createMockStep({ executionTimeMs: 1000, id: 's1' }),
      createMockStep({ executionTimeMs: 2000, id: 's2' }),
    ];

    render(
      <TestProviders>
        <WorkflowGroupSteps steps={steps} />
      </TestProviders>
    );

    expect(screen.getByText('3s')).toBeInTheDocument();
  });

  it('renders LiveTimer when composite status is RUNNING', () => {
    const steps = [
      createMockStep({ id: 's1', status: ExecutionStatus.COMPLETED }),
      createMockStep({ id: 's2', status: ExecutionStatus.RUNNING }),
    ];

    render(
      <TestProviders>
        <WorkflowGroupSteps steps={steps} />
      </TestProviders>
    );

    expect(screen.getByTestId('liveTimer')).toBeInTheDocument();
  });

  it('renders inspect button when provided', () => {
    const steps = [createMockStep()];

    render(
      <TestProviders>
        <WorkflowGroupSteps
          inspectButton={
            <button type="button" data-test-subj="testInspect">
              {'Inspect'}
            </button>
          }
          steps={steps}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('testInspect')).toBeInTheDocument();
  });
});
