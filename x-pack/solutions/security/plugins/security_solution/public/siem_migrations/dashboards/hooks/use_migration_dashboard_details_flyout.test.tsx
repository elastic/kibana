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
import { SiemMigrationStatus } from '../../../../common/siem_migrations/constants';
import type { DashboardMigrationDashboard } from '../../../../common/siem_migrations/model/dashboard_migration.gen';

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
        migrationDashboards: [migrationDashboardMock],
        getMigrationDashboardData,
      })
    );

    expect(result.current.migrationDashboardDetailsFlyout).toBeNull();
  });

  it('should open and close flyout', () => {
    const { result, rerender } = renderHook(() =>
      useMigrationDashboardDetailsFlyout({
        migrationDashboards: [migrationDashboardMock],
        getMigrationDashboardData,
      })
    );

    act(() => {
      result.current.openMigrationDashboardDetails(migrationDashboardMock);
    });

    rerender();

    expect(result.current.migrationDashboardDetailsFlyout).not.toBeNull();
    expect(
      (result.current.migrationDashboardDetailsFlyout as React.ReactElement).props
        .migrationDashboard
    ).toEqual(migrationDashboardMock);

    act(() => {
      result.current.closeMigrationDashboardDetails();
    });

    rerender();

    expect(result.current.migrationDashboardDetailsFlyout).toBeNull();
  });

  describe('dashboard navigation', () => {
    const completedDashboard = (id: string): DashboardMigrationDashboard =>
      getDashboardMigrationDashboardMock({ id });
    const failedDashboard = (id: string): DashboardMigrationDashboard =>
      getDashboardMigrationDashboardMock({ id, status: SiemMigrationStatus.FAILED });

    const getDashboardDataFor =
      (dashboards: DashboardMigrationDashboard[]) => (dashboardId: string) => ({
        migrationDashboard: dashboards.find((dashboard) => dashboard.id === dashboardId),
      });

    const renderNavigationHook = (dashboards: DashboardMigrationDashboard[]) =>
      renderHook(() =>
        useMigrationDashboardDetailsFlyout({
          migrationDashboards: dashboards,
          getMigrationDashboardData: getDashboardDataFor(dashboards),
        })
      );

    it('should navigate forward and backward between dashboards', () => {
      const dashboards = [completedDashboard('dash-1'), completedDashboard('dash-2')];
      const { result } = renderNavigationHook(dashboards);

      act(() => {
        result.current.openMigrationDashboardDetails(dashboards[0]);
      });

      expect(result.current.navigation).toEqual(
        expect.objectContaining({ hasPrevious: false, hasNext: true })
      );

      act(() => {
        result.current.navigation.goToNext();
      });

      expect(result.current.openedMigrationDashboardId).toBe('dash-2');

      act(() => {
        result.current.navigation.goToPrevious();
      });

      expect(result.current.openedMigrationDashboardId).toBe('dash-1');
    });

    it('should disable the previous arrow when only failed dashboards are before the opened one', () => {
      const dashboards = [failedDashboard('dash-f'), completedDashboard('dash-1')];
      const { result } = renderNavigationHook(dashboards);

      act(() => {
        result.current.openMigrationDashboardDetails(dashboards[1]);
      });

      expect(result.current.navigation).toEqual(
        expect.objectContaining({ hasPrevious: false, hasNext: false })
      );

      act(() => {
        result.current.navigation.goToPrevious();
      });

      expect(result.current.openedMigrationDashboardId).toBe('dash-1');
    });

    it('should disable the next arrow when only failed dashboards are after the opened one', () => {
      const dashboards = [completedDashboard('dash-1'), failedDashboard('dash-f')];
      const { result } = renderNavigationHook(dashboards);

      act(() => {
        result.current.openMigrationDashboardDetails(dashboards[0]);
      });

      expect(result.current.navigation).toEqual(
        expect.objectContaining({ hasPrevious: false, hasNext: false })
      );

      act(() => {
        result.current.navigation.goToNext();
      });

      expect(result.current.openedMigrationDashboardId).toBe('dash-1');
    });

    it('should skip a failed dashboard in the middle of the page', () => {
      const dashboards = [
        completedDashboard('dash-1'),
        failedDashboard('dash-f'),
        completedDashboard('dash-3'),
      ];
      const { result } = renderNavigationHook(dashboards);

      act(() => {
        result.current.openMigrationDashboardDetails(dashboards[0]);
      });
      act(() => {
        result.current.navigation.goToNext();
      });

      expect(result.current.openedMigrationDashboardId).toBe('dash-3');

      act(() => {
        result.current.navigation.goToPrevious();
      });

      expect(result.current.openedMigrationDashboardId).toBe('dash-1');
    });
  });
});
