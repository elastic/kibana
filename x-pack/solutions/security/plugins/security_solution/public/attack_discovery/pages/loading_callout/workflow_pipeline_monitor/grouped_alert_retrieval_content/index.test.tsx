/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';

import { GroupedAlertRetrievalContent } from '.';
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

describe('GroupedAlertRetrievalContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: 'http://localhost:5601/app/workflows/workflow-123',
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });
  });

  it('renders workflow name once for multi-step same-workflow groups', () => {
    const subSteps = [
      createMockStep({
        id: 's1',
        workflowId: 'wf-a',
        workflowName: 'Agent Builder',
      }),
      createMockStep({
        id: 's2',
        workflowId: 'wf-a',
        workflowName: 'Agent Builder',
      }),
    ];

    render(
      <TestProviders>
        <GroupedAlertRetrievalContent subSteps={subSteps} />
      </TestProviders>
    );

    const nameElements = screen.getAllByTestId('stepWorkflowName');

    expect(nameElements).toHaveLength(1);
  });

  it('renders separate entries for different workflows', () => {
    const subSteps = [
      createMockStep({
        id: 's1',
        workflowId: 'wf-a',
        workflowName: 'Default',
      }),
      createMockStep({
        id: 's2',
        workflowId: 'wf-b',
        workflowName: 'Custom',
      }),
    ];

    render(
      <TestProviders>
        <GroupedAlertRetrievalContent subSteps={subSteps} />
      </TestProviders>
    );

    const nameElements = screen.getAllByTestId('stepWorkflowName');

    expect(nameElements).toHaveLength(2);
  });

  it('renders combined inspect button when provided', () => {
    const subSteps = [createMockStep()];

    render(
      <TestProviders>
        <GroupedAlertRetrievalContent
          combinedInspectButton={
            <button data-test-subj="inspectCombinedAlerts" type="button">
              {'Inspect combined'}
            </button>
          }
          subSteps={subSteps}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('inspectCombinedAlerts')).toBeInTheDocument();
  });

  it('renders combined time with "total" label', () => {
    const subSteps = [createMockStep()];

    render(
      <TestProviders>
        <GroupedAlertRetrievalContent
          combinedInspectButton={<button type="button">{'Inspect'}</button>}
          combinedTimeMs={5000}
          subSteps={subSteps}
        />
      </TestProviders>
    );

    expect(screen.getByText(/total/i)).toBeInTheDocument();
  });

  it('renders combinedAlertsCountBadge when provided', () => {
    const subSteps = [createMockStep()];

    render(
      <TestProviders>
        <GroupedAlertRetrievalContent
          combinedAlertsCountBadge={<span data-test-subj="combinedAlertsBadge">{'75 alerts'}</span>}
          combinedInspectButton={<button type="button">{'Inspect'}</button>}
          combinedTimeMs={5000}
          subSteps={subSteps}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('combinedAlertsBadge')).toHaveTextContent('75 alerts');
  });

  it('does not render combinedAlertsCountBadge when not provided', () => {
    const subSteps = [createMockStep()];

    render(
      <TestProviders>
        <GroupedAlertRetrievalContent
          combinedInspectButton={<button type="button">{'Inspect'}</button>}
          combinedTimeMs={5000}
          subSteps={subSteps}
        />
      </TestProviders>
    );

    expect(screen.queryByTestId('combinedAlertsBadge')).not.toBeInTheDocument();
  });
});
