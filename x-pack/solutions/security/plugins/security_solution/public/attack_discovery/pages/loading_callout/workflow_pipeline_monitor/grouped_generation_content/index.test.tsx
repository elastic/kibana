/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';

import { GroupedGenerationContent } from '.';
import { TestProviders } from '../../../../../common/mock';
import type { StepExecutionWithLink } from '../../types';

jest.mock('../../../use_workflow_editor_link', () => ({
  useWorkflowEditorLink: jest.fn(() => ({ editorUrl: null, navigateToEditor: jest.fn() })),
}));

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

const gateStep = createMockStep({
  id: 'step-gate',
  pipelinePhase: 'generate_discoveries',
  stepId: 'gate',
  topologicalIndex: 0,
  workflowId: 'workflow-gate',
  workflowName: 'Security - Attack discovery - Skill',
  workflowRunId: 'run-gate',
});

const generationStep = createMockStep({
  id: 'step-gen',
  pipelinePhase: 'generate_discoveries',
  stepId: 'generate_discoveries',
  topologicalIndex: 1,
  workflowId: 'workflow-generation',
  workflowName: 'Attack discovery generation',
  workflowRunId: 'run-generation',
});

const defaultProps = {
  renderDiscoveryCountBadge: (_step: StepExecutionWithLink) => (
    <span data-test-subj="discoveryBadge">{'3 discoveries'}</span>
  ),
  renderGenerationInspectButton: (_step: StepExecutionWithLink) => (
    <button data-test-subj="inspectGeneration" type="button">
      {'Inspect'}
    </button>
  ),
  renderWorkflowAlertsCountBadge: (runId?: string) => (
    <span data-test-subj={`alertsBadge-${runId ?? 'unknown'}`}>{'0 alerts'}</span>
  ),
  renderWorkflowInspectButton: (runId: string | undefined) => (
    <button data-test-subj={`inspectGate-${runId ?? 'unknown'}`} type="button">
      {'Inspect'}
    </button>
  ),
  subSteps: [gateStep, generationStep],
};

describe('GroupedGenerationContent', () => {
  it('renders the gate workflow name', () => {
    render(
      <TestProviders>
        <GroupedGenerationContent {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText('Security - Attack discovery - Skill')).toBeInTheDocument();
  });

  it('renders the generation workflow name', () => {
    render(
      <TestProviders>
        <GroupedGenerationContent {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText('Attack discovery generation')).toBeInTheDocument();
  });

  it('renders the alerts count badge for the gate workflow', () => {
    render(
      <TestProviders>
        <GroupedGenerationContent {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('alertsBadge-run-gate')).toBeInTheDocument();
  });

  it('renders the discovery count badge for the generation workflow', () => {
    render(
      <TestProviders>
        <GroupedGenerationContent {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('discoveryBadge')).toBeInTheDocument();
  });

  it('renders the gate inspect button (alert-retrieval style)', () => {
    render(
      <TestProviders>
        <GroupedGenerationContent {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('inspectGate-run-gate')).toBeInTheDocument();
  });

  it('renders the generation inspect button', () => {
    render(
      <TestProviders>
        <GroupedGenerationContent {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('inspectGeneration')).toBeInTheDocument();
  });

  it('does not render a discovery badge for the gate workflow', () => {
    render(
      <TestProviders>
        <GroupedGenerationContent {...defaultProps} subSteps={[gateStep]} />
      </TestProviders>
    );

    expect(screen.queryByTestId('discoveryBadge')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertsBadge-run-gate')).toBeInTheDocument();
  });

  it('renders the gate before the generation workflow', () => {
    render(
      <TestProviders>
        <GroupedGenerationContent {...defaultProps} />
      </TestProviders>
    );

    const names = screen.getAllByTestId('stepWorkflowName').map((el) => el.textContent);

    expect(names).toEqual(['Security - Attack discovery - Skill', 'Attack discovery generation']);
  });
});
