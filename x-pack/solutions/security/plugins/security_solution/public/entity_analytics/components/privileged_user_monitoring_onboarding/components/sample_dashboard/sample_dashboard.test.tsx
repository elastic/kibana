/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders the EuiSelect with stack by options', () => {
    render(<PrivilegedUserMonitoringSampleDashboard />, { wrapper: TestProviders });
    expect(screen.getByText('Stack by')).toBeInTheDocument();
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
  });

  it('calls setSelectedStackByOption when EuiSelect changes', () => {
    render(<PrivilegedUserMonitoringSampleDashboard />, { wrapper: TestProviders });
    const select = screen.getByRole<HTMLInputElement>('combobox');
    const options = screen.getAllByRole('option');

    // Simulate changing the select value to the second option
    const secondOption = options[1];
    fireEvent.change(select, { target: { value: secondOption.getAttribute('value') } });
    // The component should re-render with the new stackByField
    expect(screen.getByRole<HTMLInputElement>('combobox').value).toBe(
      options[1].getAttribute('value')
    );
  });
});
