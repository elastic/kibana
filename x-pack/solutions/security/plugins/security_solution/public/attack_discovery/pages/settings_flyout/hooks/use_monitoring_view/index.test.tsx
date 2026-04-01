/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { useMonitoringView } from '.';
import { TestProviders } from '../../../../../common/mock';
import type { ActionTriggeredGenerationsResponse } from '../../monitoring/types';
import { useActionTriggeredGenerations } from '../../monitoring/use_action_triggered_generations';

jest.mock('../../monitoring/use_action_triggered_generations');

const mockRefetch = jest.fn();
const mockUseActionTriggeredGenerations = useActionTriggeredGenerations as jest.Mock;

const mockData: ActionTriggeredGenerationsResponse = {
  data: [
    {
      connector_id: 'connector-1',
      execution_uuid: 'exec-uuid-1',
      source_metadata: {
        action_execution_uuid: 'action-1',
        rule_id: 'rule-1',
        rule_name: 'Test Rule',
      },
      status: 'succeeded',
      timestamp: '2026-03-09T12:00:00.000Z',
    },
  ],
  total: 1,
};

const mockPaginatedData: ActionTriggeredGenerationsResponse = {
  data: Array.from({ length: 20 }, (_, i) => ({
    connector_id: `connector-${i}`,
    execution_uuid: `exec-uuid-${i}`,
    source_metadata: {
      action_execution_uuid: `action-${i}`,
      rule_id: `rule-${i}`,
      rule_name: `Test Rule ${i}`,
    },
    status: 'succeeded' as const,
    timestamp: '2026-03-09T12:00:00.000Z',
  })),
  total: 50,
};

const TestComponent: React.FC = () => {
  const { monitoringView } = useMonitoringView();
  return <>{monitoringView}</>;
};

const getLastHookCall = () =>
  mockUseActionTriggeredGenerations.mock.calls[
    mockUseActionTriggeredGenerations.mock.calls.length - 1
  ][0];

describe('useMonitoringView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseActionTriggeredGenerations.mockReturnValue({
      data: mockData,
      isError: false,
      isLoading: false,
      refetch: mockRefetch,
    });
  });

  it('renders SearchAndFilter in the monitoring view', () => {
    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    expect(screen.getByTestId('monitoringSearchAndFilterQuery')).toBeInTheDocument();
  });

  it('passes default start and end to the hook', () => {
    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    expect(mockUseActionTriggeredGenerations).toHaveBeenCalledWith(
      expect.objectContaining({
        end: 'now',
        start: 'now-24h',
      })
    );
  });

  it('does not pass search to the hook initially', () => {
    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    expect(getLastHookCall().search).toBeUndefined();
  });

  it('does not pass status to the hook initially', () => {
    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    expect(getLastHookCall().status).toBeUndefined();
  });

  it('passes search to the hook when search is submitted via Enter', () => {
    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    const input = screen
      .getByTestId('monitoringSearchAndFilterQuery')
      .querySelector('input[type="search"]');

    if (input) {
      fireEvent.change(input, { target: { value: 'test query' } });
      fireEvent.keyDown(screen.getByTestId('monitoringSearchAndFilterQuery'), { key: 'Enter' });
    }

    expect(getLastHookCall().search).toBe('test query');
  });

  it('passes status to the hook when status filter changes', () => {
    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('monitoringStatusFilterButton'));
    fireEvent.click(screen.getByText('Running'));

    expect(getLastHookCall().status).toEqual(['running']);
  });

  it('passes updated start and end to the hook when date range changes', () => {
    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('superDatePickerToggleQuickMenuButton'));
    fireEvent.click(screen.getByTestId('superDatePickerCommonlyUsed_Last_7 days'));

    expect(getLastHookCall().start).toBe('now-7d');
    expect(getLastHookCall().end).toBe('now');
  });

  it('resets page to 0 when search changes', () => {
    mockUseActionTriggeredGenerations.mockReturnValue({
      data: mockPaginatedData,
      isError: false,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('pagination-button-1'));

    expect(getLastHookCall().from).toBe(20);

    const input = screen
      .getByTestId('monitoringSearchAndFilterQuery')
      .querySelector('input[type="search"]');

    if (input) {
      fireEvent.change(input, { target: { value: 'reset test' } });
      fireEvent.keyDown(screen.getByTestId('monitoringSearchAndFilterQuery'), { key: 'Enter' });
    }

    expect(getLastHookCall().from).toBe(0);
  });

  it('resets page to 0 when status filter changes', () => {
    mockUseActionTriggeredGenerations.mockReturnValue({
      data: mockPaginatedData,
      isError: false,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('pagination-button-1'));

    expect(getLastHookCall().from).toBe(20);

    fireEvent.click(screen.getByTestId('monitoringStatusFilterButton'));
    fireEvent.click(screen.getByText('Failed'));

    expect(getLastHookCall().from).toBe(0);
  });

  it('resets page to 0 when date range changes', () => {
    mockUseActionTriggeredGenerations.mockReturnValue({
      data: mockPaginatedData,
      isError: false,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('pagination-button-1'));

    expect(getLastHookCall().from).toBe(20);

    fireEvent.click(screen.getByTestId('superDatePickerToggleQuickMenuButton'));
    fireEvent.click(screen.getByTestId('superDatePickerCommonlyUsed_Last_7 days'));

    expect(getLastHookCall().from).toBe(0);
  });

  it('calls refetch when refresh is triggered', () => {
    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('superDatePickerApplyTimeButton'));

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders the loading spinner when loading', () => {
    mockUseActionTriggeredGenerations.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
      refetch: mockRefetch,
    });

    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    expect(screen.getByTestId('monitoringLoadingSpinner')).toBeInTheDocument();
  });

  it('renders SearchAndFilter when loading', () => {
    mockUseActionTriggeredGenerations.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
      refetch: mockRefetch,
    });

    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    expect(screen.getByTestId('monitoringSearchAndFilterQuery')).toBeInTheDocument();
  });

  it('renders the error callout when an error occurs', () => {
    mockUseActionTriggeredGenerations.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    expect(screen.getByTestId('monitoringError')).toBeInTheDocument();
  });

  it('renders SearchAndFilter when an error occurs', () => {
    mockUseActionTriggeredGenerations.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    expect(screen.getByTestId('monitoringSearchAndFilterQuery')).toBeInTheDocument();
  });

  it('renders the empty page when no data is available', () => {
    mockUseActionTriggeredGenerations.mockReturnValue({
      data: { data: [], total: 0 },
      isError: false,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    expect(screen.getByTestId('monitoringEmptyPage')).toBeInTheDocument();
  });

  it('renders SearchAndFilter when no data is available', () => {
    mockUseActionTriggeredGenerations.mockReturnValue({
      data: { data: [], total: 0 },
      isError: false,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    expect(screen.getByTestId('monitoringSearchAndFilterQuery')).toBeInTheDocument();
  });

  it('renders the table when data is available', () => {
    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    expect(screen.getByTestId('actionTriggeredRunsTable')).toBeInTheDocument();
  });
});
