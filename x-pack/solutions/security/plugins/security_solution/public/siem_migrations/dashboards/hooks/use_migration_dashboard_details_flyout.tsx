/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { DashboardMigrationDashboard } from '../../../../common/siem_migrations/model/dashboard_migration.gen';
import { DashboardMigrationDetailsFlyout } from '../components/dashboard_details_flyout';

interface UseMigrationDashboardDetailsFlyoutParams {
  isLoading?: boolean;
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

export function useMigrationDashboardDetailsFlyout({
  isLoading,
  getMigrationDashboardData,
  dashboardActionsFactory,
}: UseMigrationDashboardDetailsFlyoutParams) {
  const [migrationDashboardId, setMigrationDashboardId] = useState<string | undefined>(undefined);

  const migrationDashboardData = useMemo(() => {
    if (migrationDashboardId) {
      return getMigrationDashboardData(migrationDashboardId);
    }
  }, [getMigrationDashboardData, migrationDashboardId]);

  const openMigrationDashboardDetails = useCallback(
    (dashboard: DashboardMigrationDashboard) => {
      setMigrationDashboardId(dashboard.id);
    },
    [setMigrationDashboardId]
  );

  const closeMigrationDashboardDetails = useCallback(
    () => setMigrationDashboardId(undefined),
    [setMigrationDashboardId]
  );

  const dashboardActions = useCallback(
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
          dashboardActions={dashboardActions()}
        />
      ) : null,
      openMigrationDashboardDetails,
      closeMigrationDashboardDetails,
    }),
    [
      migrationDashboardData,
      closeMigrationDashboardDetails,
      isLoading,
      dashboardActions,
      openMigrationDashboardDetails,
    ]
  );
}
