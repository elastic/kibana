/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ScheduleExecutionLogs } from '.';
import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';
import { useGetAttackDiscoveryGenerations } from '../../../../use_get_attack_discovery_generations';
import { useGetScheduleExecutionLogs } from './use_get_schedule_execution_logs';

jest.mock('../../../../use_get_attack_discovery_generations');
jest.mock('./use_get_schedule_execution_logs');

const mockUseGetAttackDiscoveryGenerations =
  useGetAttackDiscoveryGenerations as jest.MockedFunction<typeof useGetAttackDiscoveryGenerations>;

const mockUseGetScheduleExecutionLogs = useGetScheduleExecutionLogs as jest.MockedFunction<
  typeof useGetScheduleExecutionLogs
>;

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

const buildExecutionLog = (id: string, status: string) => ({
  id,
  status,
  timestamp: '2026-04-07T12:00:00.000Z',
});

const mockExecutionLogsReturn = (
  data: Array<ReturnType<typeof buildExecutionLog>>
): ReturnType<typeof useGetScheduleExecutionLogs> => ({
  data: data as unknown as ReturnType<typeof useGetScheduleExecutionLogs>['data'],
  error: undefined,
  isLoading: false,
  refetch: jest.fn(),
  status: 'success',
});

const mockGenerationsReturn = (
  generations: Array<typeof mockGeneration | typeof mockWorkflowGeneration>
): ReturnType<typeof useGetAttackDiscoveryGenerations> => ({
  cancelRequest: jest.fn(),
  data: { generations },
  error: undefined,
  isLoading: false,
  refetch: jest.fn(),
  status: 'success',
});

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

    mockUseGetScheduleExecutionLogs.mockReturnValue(
      mockExecutionLogsReturn([buildExecutionLog('exec-uuid-1', 'success')])
    );

    mockUseGetAttackDiscoveryGenerations.mockReturnValue(mockGenerationsReturn([mockGeneration]));
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

  it('renders the date range picker', async () => {
    await renderComponent();

    expect(screen.getByTestId('scheduleExecutionLogsDatePicker')).toBeInTheDocument();
  });

  it('requests execution logs for the last 24 hours by default', async () => {
    await renderComponent();

    expect(mockUseGetScheduleExecutionLogs).toHaveBeenCalledWith(
      expect.objectContaining({ dateEnd: 'now', dateStart: 'now-24h' })
    );
  });

  it('requests generations for the last 24 hours by default', async () => {
    await renderComponent();

    expect(mockUseGetAttackDiscoveryGenerations).toHaveBeenCalledWith(
      expect.objectContaining({ end: 'now', start: 'now-24h' })
    );
  });

  it('renders a row for a failed run that produced no generation', async () => {
    mockUseGetScheduleExecutionLogs.mockReturnValue(
      mockExecutionLogsReturn([buildExecutionLog('exec-failed', 'failure')])
    );
    mockUseGetAttackDiscoveryGenerations.mockReturnValue(mockGenerationsReturn([]));

    await renderComponent();

    expect(screen.getByText('failure')).toBeInTheDocument();
  });

  it('hides the Inspect button for a run that produced no generation', async () => {
    mockUseGetScheduleExecutionLogs.mockReturnValue(
      mockExecutionLogsReturn([buildExecutionLog('exec-failed', 'failure')])
    );
    mockUseGetAttackDiscoveryGenerations.mockReturnValue(mockGenerationsReturn([]));

    await renderComponent();

    expect(screen.queryByTestId('inspect-exec-failed')).not.toBeInTheDocument();
  });

  it('hides the Inspect button for a run whose generation has no workflow data', async () => {
    await renderComponent();

    expect(screen.queryByTestId('inspect-exec-uuid-1')).not.toBeInTheDocument();
  });

  it('shows the Inspect button for a run with a matching workflow generation', async () => {
    mockUseGetScheduleExecutionLogs.mockReturnValue(
      mockExecutionLogsReturn([buildExecutionLog('exec-uuid-workflow', 'success')])
    );
    mockUseGetAttackDiscoveryGenerations.mockReturnValue(
      mockGenerationsReturn([mockWorkflowGeneration])
    );

    await renderComponent();

    expect(screen.getByTestId('inspect-exec-uuid-workflow')).toBeInTheDocument();
  });

  it('does not render the workflow execution details flyout when no item is selected', async () => {
    await renderComponent();

    expect(screen.queryByTestId('workflowExecutionDetailsFlyout')).not.toBeInTheDocument();
  });

  it('opens the workflow execution details flyout when the Inspect button is clicked', async () => {
    mockUseGetScheduleExecutionLogs.mockReturnValue(
      mockExecutionLogsReturn([buildExecutionLog('exec-uuid-workflow', 'success')])
    );
    mockUseGetAttackDiscoveryGenerations.mockReturnValue(
      mockGenerationsReturn([mockWorkflowGeneration])
    );

    await renderComponent();

    fireEvent.click(screen.getByTestId('inspect-exec-uuid-workflow'));

    await waitFor(() => {
      expect(screen.getByTestId('workflowExecutionDetailsFlyout')).toBeInTheDocument();
    });
  });
});
