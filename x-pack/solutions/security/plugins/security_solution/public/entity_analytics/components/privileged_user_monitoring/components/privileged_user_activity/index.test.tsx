/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserActivityPrivilegedUsersPanel } from '.';
import { TestProviders } from '../../../../../common/mock';
import { act } from 'react-dom/test-utils';

jest.mock('../../../../../common/containers/use_global_time', () => ({
  useGlobalTime: () => ({
    from: '2023-01-01T00:00:00.000Z',
    to: '2023-01-02T00:00:00.000Z',
  }),
}));

jest.mock(
  '../../../privileged_user_monitoring_onboarding/components/esql_dashboard_panel/esql_dashboard_panel',
  () => ({
    EsqlDashboardPanel: () => <div data-test-subj="esql-dashboard-panel" />,
  })
);

jest.mock('../../../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));

jest.mock('../../queries/helpers', () => {
  const originalModule = jest.requireActual('../../queries/helpers');
  return {
    ...originalModule,
    removeInvalidForkBranchesFromESQL: jest.fn((fields, esql) => esql),
  };
});

const mockedDataViewSpec = {
  title: 'test-*',
  fields: {},
};

describe('UserActivityPrivilegedUsersPanel', () => {
  it('renders panel title', () => {
    render(<UserActivityPrivilegedUsersPanel dataViewSpec={mockedDataViewSpec} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Privileged user activity')).toBeInTheDocument();
  });

  it('renders the toggle button group', () => {
    render(<UserActivityPrivilegedUsersPanel dataViewSpec={mockedDataViewSpec} />, {
      wrapper: TestProviders,
    });
    expect(
      screen.getByRole('group', { name: /Select a visualization to display/i })
    ).toBeInTheDocument();
  });

  it('renders the stack by select with options', () => {
    render(<UserActivityPrivilegedUsersPanel dataViewSpec={mockedDataViewSpec} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Stack by')).toBeInTheDocument();
    const privUserButton = screen.getByText('Privileged user');

    act(() => {
      privUserButton.click();
    });

    expect(screen.getByRole('option', { name: 'Privileged user' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Target user' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Granted right' })).toBeInTheDocument();
  });

  it('renders the EsqlDashboardPanel', () => {
    render(<UserActivityPrivilegedUsersPanel dataViewSpec={mockedDataViewSpec} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('esql-dashboard-panel')).toBeInTheDocument();
  });

  it('changes stack by option when select changes', () => {
    render(<UserActivityPrivilegedUsersPanel dataViewSpec={mockedDataViewSpec} />, {
      wrapper: TestProviders,
    });
    expect(screen.getByDisplayValue('privileged_user')).toBeInTheDocument(); // Assert that input value before change

    act(() => {
      screen.getByText('Privileged user').click(); // click to open the select
    });

    act(() => {
      screen.getByRole('option', { name: 'Target user' }).click(); // select "Target user"
    });

    expect(screen.getByDisplayValue('target_user')).toBeInTheDocument(); // Assert that input value after change
  });

  it('renders the "View all events by privileged users" link', () => {
    render(<UserActivityPrivilegedUsersPanel dataViewSpec={mockedDataViewSpec} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('View all events')).toBeInTheDocument();
  });
});
