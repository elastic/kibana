/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MonitorDetailsPageTitle } from './monitor_details_page_title';
import { useSelectedMonitor } from './hooks/use_selected_monitor';

jest.mock('./hooks/use_selected_monitor', () => ({
  useSelectedMonitor: jest.fn(),
}));

jest.mock('./monitor_selector/monitor_selector', () => ({
  MonitorSelector: () => <div data-test-subj="monitorSelectorStub" />,
}));

const mockUseSelectedMonitor = useSelectedMonitor as jest.MockedFunction<typeof useSelectedMonitor>;

describe('MonitorDetailsPageTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders only the monitor name and no Remote badge for a local monitor', () => {
    mockUseSelectedMonitor.mockReturnValue({
      monitor: { name: 'My monitor' },
    } as ReturnType<typeof useSelectedMonitor>);

    render(<MonitorDetailsPageTitle />);

    expect(screen.getByText('My monitor')).toBeInTheDocument();
    expect(screen.queryByTestId('syntheticsRemoteBadge')).not.toBeInTheDocument();
  });

  it('renders the Remote badge when the selected monitor exposes a `remote` field', () => {
    mockUseSelectedMonitor.mockReturnValue({
      monitor: {
        name: 'My remote monitor',
        remote: { remoteName: 'cluster-a' },
      },
    } as ReturnType<typeof useSelectedMonitor>);

    render(<MonitorDetailsPageTitle />);

    expect(screen.getByText('My remote monitor')).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsRemoteBadge')).toBeInTheDocument();
  });

  it('does not render the Remote badge while the monitor is still loading', () => {
    mockUseSelectedMonitor.mockReturnValue({
      monitor: null,
    } as ReturnType<typeof useSelectedMonitor>);

    render(<MonitorDetailsPageTitle />);

    expect(screen.queryByTestId('syntheticsRemoteBadge')).not.toBeInTheDocument();
  });
});
