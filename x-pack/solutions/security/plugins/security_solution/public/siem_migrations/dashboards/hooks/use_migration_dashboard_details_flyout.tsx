/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { DashboardMigrationDashboard } from '../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { MigrationFlyoutNavigation } from '../../common/components/details_flyout';
import { DashboardMigrationDetailsFlyout } from '../components/dashboard_details_flyout';

interface UseMigrationDashboardDetailsFlyoutParams {
  isLoading?: boolean;
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
  navigation: MigrationFlyoutNavigation;
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

  const openMigrationDashboardDetails = useCallback(
    (dashboard: DashboardMigrationDashboard) => {
      setMigrationDashboardId(dashboard.id);
    },
    []
  );
  const closeMigrationDashboardDetails = useCallback(() => setMigrationDashboardId(undefined), []);

  const openedDashboardIndex = useMemo(
    () =>
      migrationDashboardId
        ? migrationDashboards.findIndex((d) => d.id === migrationDashboardId)
        : -1,
    [migrationDashboards, migrationDashboardId]
  );

  const goToPrevious = useCallback(() => {
    const prev = migrationDashboards[openedDashboardIndex - 1];
    if (openedDashboardIndex > 0 && prev) {
      setMigrationDashboardId(prev.id);
    }
  }, [migrationDashboards, openedDashboardIndex]);

  const goToNext = useCallback(() => {
    const next = migrationDashboards[openedDashboardIndex + 1];
    if (openedDashboardIndex !== -1 && next) {
      setMigrationDashboardId(next.id);
    }
  }, [migrationDashboards, openedDashboardIndex]);

  const navigation = useMemo<MigrationFlyoutNavigation>(
    () => ({
      hasPrevious: openedDashboardIndex > 0,
      hasNext:
        openedDashboardIndex !== -1 && openedDashboardIndex < migrationDashboards.length - 1,
      goToPrevious,
      goToNext,
    }),
    [openedDashboardIndex, migrationDashboards.length, goToPrevious, goToNext]
  );

  const dashboardActions = useMemo(
    () =>
      migrationDashboardData?.migrationDashboard &&
      dashboardActionsFactory?.(
        migrationDashboardData.migrationDashboard,
        closeMigrationDashboardDetails
      ),
    [migrationDashboardData, dashboardActionsFactory, closeMigrationDashboardDetails]
  );

  return {
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
  };
}
