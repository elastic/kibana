/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MonitorMaintenanceWindows } from './monitor_maintenance_windows';

const mockUseMaintenanceWindows = jest.fn();

jest.mock('../../monitor_add_edit/fields/maintenance_windows/use_maintenance_windows', () => ({
  useMaintenanceWindows: () => mockUseMaintenanceWindows(),
}));

jest.mock(
  '../../monitor_add_edit/fields/maintenance_windows/create_maintenance_windows_btn',
  () => ({
    MaintenanceWindowsLink: ({ id, label }: { id?: string; label?: string }) => (
      <a data-test-subj={`mwLink-${id}`}>{label}</a>
    ),
  })
);

describe('MonitorMaintenanceWindows', () => {
  beforeEach(() => {
    mockUseMaintenanceWindows.mockReset();
  });

  it('resolves maintenance window ids to their titles', () => {
    mockUseMaintenanceWindows.mockReturnValue({
      isLoading: false,
      data: {
        data: [
          { id: 'mw-1', title: 'Weekend window' },
          { id: 'mw-2', title: 'Nightly window' },
        ],
      },
    });

    render(<MonitorMaintenanceWindows monitorMWs={['mw-1', 'mw-2']} />);

    expect(screen.getByTestId('mwLink-mw-1')).toHaveTextContent('Weekend window');
    expect(screen.getByTestId('mwLink-mw-2')).toHaveTextContent('Nightly window');
  });

  it('falls back to the id when the window title cannot be resolved', () => {
    mockUseMaintenanceWindows.mockReturnValue({
      isLoading: false,
      data: { data: [] },
    });

    render(<MonitorMaintenanceWindows monitorMWs={['mw-missing']} />);

    expect(screen.getByTestId('mwLink-mw-missing')).toHaveTextContent('mw-missing');
  });

  it('shows a loading skeleton while windows are loading', () => {
    mockUseMaintenanceWindows.mockReturnValue({ isLoading: true, data: undefined });

    const { container } = render(<MonitorMaintenanceWindows monitorMWs={['mw-1']} />);

    expect(container.querySelector('.euiSkeletonText')).toBeInTheDocument();
    expect(screen.queryByTestId('mwLink-mw-1')).not.toBeInTheDocument();
  });
});
