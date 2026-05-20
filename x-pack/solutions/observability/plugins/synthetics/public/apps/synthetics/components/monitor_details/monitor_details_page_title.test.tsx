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
import { useGetUrlParams } from '../../hooks';

jest.mock('./hooks/use_selected_monitor', () => ({
  useSelectedMonitor: jest.fn(),
}));

jest.mock('../../hooks', () => ({
  useGetUrlParams: jest.fn(),
}));

jest.mock('./monitor_selector/monitor_selector', () => ({
  MonitorSelector: () => <div data-test-subj="monitorSelectorStub" />,
}));

const mockUseSelectedMonitor = useSelectedMonitor as jest.MockedFunction<typeof useSelectedMonitor>;
const mockUseGetUrlParams = useGetUrlParams as jest.MockedFunction<typeof useGetUrlParams>;

describe('MonitorDetailsPageTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectedMonitor.mockReturnValue({
      monitor: { name: 'My monitor' },
    } as ReturnType<typeof useSelectedMonitor>);
  });

  it('does not render the Remote badge for a local monitor', () => {
    mockUseGetUrlParams.mockReturnValue({ remoteName: undefined } as ReturnType<
      typeof useGetUrlParams
    >);

    render(<MonitorDetailsPageTitle />);

    expect(screen.getByText('My monitor')).toBeInTheDocument();
    expect(screen.queryByTestId('syntheticsRemoteBadge')).not.toBeInTheDocument();
  });

  it('renders the Remote badge when the URL has a `remoteName` param', () => {
    mockUseGetUrlParams.mockReturnValue({ remoteName: 'cluster-a' } as ReturnType<
      typeof useGetUrlParams
    >);

    render(<MonitorDetailsPageTitle />);

    expect(screen.getByText('My monitor')).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsRemoteBadge')).toBeInTheDocument();
  });
});
