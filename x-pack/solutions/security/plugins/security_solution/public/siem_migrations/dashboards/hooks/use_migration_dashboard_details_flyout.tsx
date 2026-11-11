/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { DashboardMigrationDashboard } from '../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { FlyoutPrevNextNavigation } from '../../../common/flyout_prev_next_nav';
import { useFlyoutPrevNextNav } from '../../../common/flyout_prev_next_nav';
import { isMigrationItemNavigableWithFlyout } from '../../common/utils';
import { DashboardMigrationDetailsFlyout } from '../components/dashboard_details_flyout';

interface UseMigrationDashboardDetailsFlyoutParams {
  isLoading?: boolean;
  /**
   * Ordered dashboards of the currently loaded table page, used for prev/next
   * navigation. Failed dashboards have no details flyout and are skipped during
   * navigation.
   */
  migrationDashboards: DashboardMigrationDashboard[];
  getMigrationDashboardData: (dashboardId: string) =>
    | {
        migrationDashboard?: DashboardMigrationDashboard;
      }
    | undefined;
  dashboardActionsFactory?: (
    migrationDashboard: DashboardMigrationDashboard,
    closeFlyout: () => void
  ) => React.ReactNode;
}

interface UseMigrationDashboardDetailsFlyoutResult {
  migrationDashboardDetailsFlyout: React.ReactNode;
  openMigrationDashboardDetails: (dashboard: DashboardMigrationDashboard) => void;
  closeMigrationDashboardDetails: () => void;
  openedMigrationDashboardId?: string;
  navigation: FlyoutPrevNextNavigation;
}

export function useMigrationDashboardDetailsFlyout({
  isLoading,
  migrationDashboards,
  getMigrationDashboardData,
  dashboardActionsFactory,
}: UseMigrationDashboardDetailsFlyoutParams): UseMigrationDashboardDetailsFlyoutResult {
  const [migrationDashboardId, setMigrationDashboardId] = useState<string | undefined>();

  const migrationDashboardData = useMemo(() => {
    if (migrationDashboardId) {
      return getMigrationDashboardData(migrationDashboardId);
    }
  }, [getMigrationDashboardData, migrationDashboardId]);

  const openMigrationDashboardDetails = useCallback((dashboard: DashboardMigrationDashboard) => {
    setMigrationDashboardId(dashboard.id);
  }, []);
  const closeMigrationDashboardDetails = useCallback(() => setMigrationDashboardId(undefined), []);

  const navigation = useFlyoutPrevNextNav({
    items: migrationDashboards,
    openedItemId: migrationDashboardId,
    isNavigable: isMigrationItemNavigableWithFlyout,
    onNavigate: openMigrationDashboardDetails,
  });

  const dashboardActions = useMemo(
    () =>
      migrationDashboardData?.migrationDashboard &&
      dashboardActionsFactory?.(
        migrationDashboardData.migrationDashboard,
        closeMigrationDashboardDetails
      ),
    [migrationDashboardData, dashboardActionsFactory, closeMigrationDashboardDetails]
  );

  return useMemo(
    () => ({
      migrationDashboardDetailsFlyout: migrationDashboardData?.migrationDashboard ? (
        <DashboardMigrationDetailsFlyout
          migrationDashboard={migrationDashboardData.migrationDashboard}
          closeFlyout={closeMigrationDashboardDetails}
          isLoading={isLoading}
          dashboardActions={dashboardActions}
          navigation={navigation}
        />
      ) : null,
      openMigrationDashboardDetails,
      closeMigrationDashboardDetails,
      openedMigrationDashboardId: migrationDashboardData?.migrationDashboard
        ? migrationDashboardId
        : undefined,
      navigation,
    }),
    [
      migrationDashboardData,
      closeMigrationDashboardDetails,
      isLoading,
      dashboardActions,
      navigation,
      openMigrationDashboardDetails,
      migrationDashboardId,
    ]
  );
}
