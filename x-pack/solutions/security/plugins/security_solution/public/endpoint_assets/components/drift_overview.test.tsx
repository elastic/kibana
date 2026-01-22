/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { DriftOverview } from './drift_overview';
import { TestProviders } from '../../common/mock';

const mockDriftSummaryData = {
  total_events: 5,
  events_by_category: {
    privileges: 1,
    persistence: 1,
    network: 1,
    software: 1,
    posture: 1,
  },
  events_by_severity: {
    critical: 1,
    high: 2,
    medium: 1,
    low: 1,
  },
  assets_with_changes: 2,
  top_changed_assets: [
    { host_id: 'host-1', host_name: 'test-host-1', event_count: 3 },
    { host_id: 'host-2', host_name: 'test-host-2', event_count: 2 },
  ],
  recent_changes: [
    {
      timestamp: '2024-01-14T10:00:00.000Z',
      host_id: 'host-1',
      host_name: 'test-host-1',
      category: 'privileges',
      action: 'added',
      item_name: 'admin_user',
      severity: 'high',
    },
  ],
  time_range: '24h',
};

const mockUseDriftSummary = jest.fn();

jest.mock('../hooks/use_drift_summary', () => ({
  useDriftSummary: () => mockUseDriftSummary(),
}));

describe('DriftOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading spinner when loading', () => {
    mockUseDriftSummary.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refresh: jest.fn(),
    });

    render(
      <TestProviders>
        <DriftOverview />
      </TestProviders>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error message when there is an error', () => {
    mockUseDriftSummary.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Test error'),
      refresh: jest.fn(),
    });

    render(
      <TestProviders>
        <DriftOverview />
      </TestProviders>
    );

    expect(screen.getByText('Error loading drift summary')).toBeInTheDocument();
  });

  it('renders empty state when no drift events', () => {
    mockUseDriftSummary.mockReturnValue({
      data: {
        ...mockDriftSummaryData,
        total_events: 0,
      },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(
      <TestProviders>
        <DriftOverview />
      </TestProviders>
    );

    expect(
      screen.getByText('No drift events detected in the selected time range')
    ).toBeInTheDocument();
  });

  it('renders drift statistics when data is available', () => {
    mockUseDriftSummary.mockReturnValue({
      data: mockDriftSummaryData,
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(
      <TestProviders>
        <DriftOverview />
      </TestProviders>
    );

    // Check stats are rendered
    expect(screen.getByText('5')).toBeInTheDocument(); // total events
    expect(screen.getByText('1')).toBeInTheDocument(); // critical count
    expect(screen.getByText('2')).toBeInTheDocument(); // assets changed or high count

    // Check category headers
    expect(screen.getByText('Events by Category')).toBeInTheDocument();
    expect(screen.getByText('Recent Changes')).toBeInTheDocument();
  });

  it('renders category breakdown', () => {
    mockUseDriftSummary.mockReturnValue({
      data: mockDriftSummaryData,
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(
      <TestProviders>
        <DriftOverview />
      </TestProviders>
    );

    // Check categories are shown
    expect(screen.getByText('Persistence')).toBeInTheDocument();
    expect(screen.getByText('Privileges')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Software')).toBeInTheDocument();
    expect(screen.getByText('Posture')).toBeInTheDocument();
  });

  it('renders recent changes table', () => {
    mockUseDriftSummary.mockReturnValue({
      data: mockDriftSummaryData,
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(
      <TestProviders>
        <DriftOverview />
      </TestProviders>
    );

    // Check table headers
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Change')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
  });
});
