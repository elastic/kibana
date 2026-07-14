/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { ExecutionStatus } from '@kbn/workflows';

import { WorkflowStepLink } from '.';
import type { StepExecutionWithLink } from '../types';
import { TestProviders } from '../../../../common/mock';
import { useWorkflowEditorLink } from '../../use_workflow_editor_link';

jest.mock('../../use_workflow_editor_link');

const mockUseWorkflowEditorLink = useWorkflowEditorLink as jest.Mock;

const createMockStep = (overrides: Partial<StepExecutionWithLink> = {}): StepExecutionWithLink => ({
  globalExecutionIndex: 0,
  id: 'step-exec-1',
  scopeStack: [],
  startedAt: '2024-01-01T00:00:00.000Z',
  status: ExecutionStatus.COMPLETED,
  stepExecutionIndex: 0,
  stepId: 'test-step',
  topologicalIndex: 0,
  workflowId: 'workflow-123',
  workflowRunId: 'run-456',
  ...overrides,
});

describe('WorkflowStepLink', () => {
  const defaultProps = {
    step: createMockStep(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: 'http://localhost:5601/app/workflows/workflow-123',
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });
  });

  it('renders the link when editorUrl is available', () => {
    render(
      <TestProviders>
        <WorkflowStepLink {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('workflowStepLink')).toBeInTheDocument();
  });

  it('renders a navigable link with the correct href', () => {
    render(
      <TestProviders>
        <WorkflowStepLink {...defaultProps} />
      </TestProviders>
    );

    const link = screen.getByTestId('workflowStepLink');

    expect(link).toHaveAttribute('href', 'http://localhost:5601/app/workflows/workflow-123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders nothing when IDs are missing', () => {
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: null,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });

    render(
      <TestProviders>
        <WorkflowStepLink
          {...defaultProps}
          step={createMockStep({
            workflowId: undefined,
            workflowRunId: undefined,
          })}
        />
      </TestProviders>
    );

    expect(screen.queryByTestId('workflowStepLink')).not.toBeInTheDocument();
  });

  it('calls useWorkflowEditorLink with missing IDs', () => {
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: null,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });

    render(
      <TestProviders>
        <WorkflowStepLink
          {...defaultProps}
          step={createMockStep({
            workflowId: undefined,
            workflowRunId: undefined,
          })}
        />
      </TestProviders>
    );

    expect(mockUseWorkflowEditorLink).toHaveBeenCalledWith({
      workflowId: undefined,
      workflowRunId: undefined,
    });
  });

  it('renders with correct button text', () => {
    render(
      <TestProviders>
        <WorkflowStepLink {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText('View in Workflows')).toBeInTheDocument();
  });

  it('renders popout icon', () => {
    render(
      <TestProviders>
        <WorkflowStepLink {...defaultProps} />
      </TestProviders>
    );

    const link = screen.getByTestId('workflowStepLink');

    expect(link.querySelector('[data-euiicon-type="popout"]')).toBeInTheDocument();
  });

  it('passes correct workflowId and workflowRunId from step to hook', () => {
    const step = createMockStep({
      workflowId: 'custom-workflow-id',
      workflowRunId: 'custom-run-id',
    });

    render(
      <TestProviders>
        <WorkflowStepLink step={step} />
      </TestProviders>
    );

    expect(mockUseWorkflowEditorLink).toHaveBeenCalledWith({
      workflowId: 'custom-workflow-id',
      workflowRunId: 'custom-run-id',
    });
  });

  it('renders nothing when editorUrl is empty string', () => {
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: '',
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });

    render(
      <TestProviders>
        <WorkflowStepLink {...defaultProps} />
      </TestProviders>
    );

    expect(screen.queryByTestId('workflowStepLink')).not.toBeInTheDocument();
  });
});
