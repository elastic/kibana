/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { PrivilegedUserMonitoringSampleDashboard } from './sample_dashboard';
import { TestProviders } from '../../../../../common/mock';

jest.mock('../esql_dashboard_panel/esql_dashboard_panel', () => ({
  EsqlDashboardPanel: jest.fn(({ title }) => (
    <div data-test-subj="esql-dashboard-panel">{title}</div>
  )),
}));

describe('PrivilegedUserMonitoringSampleDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the panel and header', () => {
    render(<PrivilegedUserMonitoringSampleDashboard />, { wrapper: TestProviders });
    expect(screen.getByTestId('privMonSampleDashboard')).toBeInTheDocument();
    expect(screen.getByTestId('esql-dashboard-panel')).toBeInTheDocument();
  });

  it('renders the EuiSuperSelect with selected option', () => {
    render(<PrivilegedUserMonitoringSampleDashboard />, { wrapper: TestProviders });
    expect(screen.getByText('Privileged user')).toBeInTheDocument();
  });

  it('calls setSelectedStackByOption when EuiSelect changes', () => {
    render(<PrivilegedUserMonitoringSampleDashboard />, { wrapper: TestProviders });

    // Asset the initial state
    expect(screen.getByDisplayValue('privileged_user')).toBeInTheDocument();

    // Open the select dropdown
    act(() => {
      screen.getByText('Privileged user').click(); // click to open the select
    });

    // Simulate changing the select value to the second option
    act(() => {
      screen.getByRole('option', { name: 'Target user' }).click();
    });

    // The component should re-render with the new stackByField
    expect(screen.getByDisplayValue('target_user')).toBeInTheDocument();
  });
});
