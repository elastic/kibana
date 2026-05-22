/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';

import { ScheduleExecutionLogs } from '.';
import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';
import { useGetAttackDiscoveryGenerations } from '../../../../use_get_attack_discovery_generations';

jest.mock('../../../../use_get_attack_discovery_generations');

const mockUseGetAttackDiscoveryGenerations =
  useGetAttackDiscoveryGenerations as jest.MockedFunction<typeof useGetAttackDiscoveryGenerations>;

const mockGeneration = {
  connector_id: 'connector-1',
  discoveries: 3,
  execution_uuid: 'exec-uuid-1',
  loading_message: 'Analyzing alerts...',
  source_metadata: {
    action_execution_uuid: 'action-exec-1',
    rule_id: mockAttackDiscoverySchedule.id,
    rule_name: mockAttackDiscoverySchedule.name,
  },
  start: '2026-04-07T12:00:00.000Z',
  status: 'succeeded' as const,
};

const mockWorkflowGeneration = {
  ...mockGeneration,
  execution_uuid: 'exec-uuid-workflow',
  workflow_id: 'workflow-id-1',
  workflow_run_id: 'workflow-run-id-1',
};

const renderComponent = async ({
  schedule = mockAttackDiscoverySchedule,
}: {
  schedule?: typeof mockAttackDiscoverySchedule;
} = {}) => {
  await act(() => {
    render(
      <TestProviders>
        <ScheduleExecutionLogs schedule={schedule} />
      </TestProviders>
    );
  });
};

describe('ScheduleExecutionLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGetAttackDiscoveryGenerations.mockReturnValue({
      cancelRequest: jest.fn(),
      data: { generations: [mockGeneration] },
      error: undefined,
      isLoading: false,
      refetch: jest.fn(),
      status: 'success',
    });
  });

  it('renders the execution logs title', async () => {
    await renderComponent();

    expect(screen.getByTestId('executionLogsTitle')).toBeInTheDocument();
  });

  it('renders the execution event logs container', async () => {
    await renderComponent();

    expect(screen.getByTestId('executionEventLogs')).toBeInTheDocument();
  });

  it('renders the schedule execution logs table', async () => {
    await renderComponent();

    expect(screen.getByTestId('scheduleExecutionLogsTable')).toBeInTheDocument();
  });

  it('only shows rows matching the schedule id', async () => {
    const otherGeneration = {
      ...mockWorkflowGeneration,
      execution_uuid: 'other-exec',
      source_metadata: {
        ...mockGeneration.source_metadata,
        rule_id: 'other-schedule-id',
      },
    };

    mockUseGetAttackDiscoveryGenerations.mockReturnValue({
      cancelRequest: jest.fn(),
      data: { generations: [mockWorkflowGeneration, otherGeneration] },
      error: undefined,
      isLoading: false,
      refetch: jest.fn(),
      status: 'success',
    });

    await renderComponent();

    // Only the run matching the schedule id should produce an inspect button
    expect(
      screen.getByTestId(`inspect-${mockWorkflowGeneration.execution_uuid}`)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(`inspect-${otherGeneration.execution_uuid}`)
    ).not.toBeInTheDocument();
  });

  it('shows the Inspect button for workflow-based generations', async () => {
    mockUseGetAttackDiscoveryGenerations.mockReturnValue({
      cancelRequest: jest.fn(),
      data: { generations: [mockWorkflowGeneration] },
      error: undefined,
      isLoading: false,
      refetch: jest.fn(),
      status: 'success',
    });

    await renderComponent();

    expect(
      screen.getByTestId(`inspect-${mockWorkflowGeneration.execution_uuid}`)
    ).toBeInTheDocument();
  });

  it('hides the Inspect button for legacy generations without workflow data', async () => {
    await renderComponent();

    expect(
      screen.queryByTestId(`inspect-${mockGeneration.execution_uuid}`)
    ).not.toBeInTheDocument();
  });

  it('does not render the workflow execution details flyout when no item is selected', async () => {
    await renderComponent();

    expect(screen.queryByTestId('workflowExecutionDetailsFlyout')).not.toBeInTheDocument();
  });
});
