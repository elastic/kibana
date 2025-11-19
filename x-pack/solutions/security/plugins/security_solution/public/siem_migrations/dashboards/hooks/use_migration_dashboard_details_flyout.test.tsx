/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useMigrationDashboardDetailsFlyout } from './use_migration_dashboard_details_flyout';
import { type DashboardMigrationDashboardDetailsFlyoutProps } from '../components/dashboard_details_flyout';
import { getDashboardMigrationDashboardMock } from '../../../../common/siem_migrations/model/__mocks__';

jest.mock('../components/dashboard_details_flyout', () => ({
  DashboardMigrationDetailsFlyout: (props: DashboardMigrationDashboardDetailsFlyoutProps) => (
    <div data-test-subj="dashboard-details-flyout" {...props} />
  ),
}));

const migrationDashboardMock = getDashboardMigrationDashboardMock();
const getMigrationDashboardData = jest.fn().mockReturnValue({
  migrationDashboard: migrationDashboardMock,
});

describe('useMigrationDashboardDetailsFlyout', () => {
  it('should not render flyout initially', () => {
    const { result } = renderHook(() =>
      useMigrationDashboardDetailsFlyout({
        getMigrationDashboardData,
      })
    );

    expect(result.current.migrationDashboardDetailsFlyout).toBeNull();
  });

  it('should open and close flyout', () => {
    const { result, rerender } = renderHook(() =>
      useMigrationDashboardDetailsFlyout({
        getMigrationDashboardData,
      })
    );

    act(() => {
      result.current.openMigrationDashboardDetails(migrationDashboardMock);
    });

    rerender();

    expect(result.current.migrationDashboardDetailsFlyout).not.toBeNull();
    expect(result.current.migrationDashboardDetailsFlyout?.props.migrationDashboard).toEqual(
      migrationDashboardMock
    );

    act(() => {
      result.current.closeMigrationDashboardDetails();
    });

    rerender();

    expect(result.current.migrationDashboardDetailsFlyout).toBeNull();
  });
});
