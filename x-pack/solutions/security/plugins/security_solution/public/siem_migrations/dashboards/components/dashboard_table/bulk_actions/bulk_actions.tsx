/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { WithMissingPrivilegesTooltip } from '../../../../common/components/missing_privileges';
import type {
  DashboardMigrationDashboard,
  DashboardMigrationTranslationStats,
} from '../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import {
  InstallTranslatedButton,
  ReprocessFailedItemsButton,
} from '../../../../common/components/bulk_actions';

const ReprocessFailedDashboardsButton = WithMissingPrivilegesTooltip(
  ReprocessFailedItemsButton,
  'dashboard',
  'all'
);

export interface BulkActionsProps {
  isTableLoading: boolean;
  installTranslatedDashboards?: () => void;
  installSelectedDashboards?: () => void;
  reprocessFailedDashboards?: () => void;
  selectedDashboards: DashboardMigrationDashboard[];
  translationStats: DashboardMigrationTranslationStats;
}

/**
 * Collection of buttons to perform bulk actions on migration dashboards within the SIEM Dashboards Migrations table.
 */
export const BulkActions: React.FC<BulkActionsProps> = memo(
  ({
    isTableLoading,
    translationStats,
    selectedDashboards,
    installTranslatedDashboards,
    installSelectedDashboards,
    reprocessFailedDashboards,
  }) => {
    const numberOfFailedDashboards = translationStats.dashboards.failed;
    const numberOfTranslatedDashboards = translationStats.dashboards.success.installable;
    const showInstallSelectedDashboardsButton = numberOfTranslatedDashboards > 0;
    const showRetryFailedDashboardsButton = numberOfFailedDashboards > 0;
    const reprocessFailedDashboardsCallback = useCallback(() => {
      reprocessFailedDashboards?.();
    }, [reprocessFailedDashboards]);
    const installTranslatedDashboardsCallback = useCallback(() => {
      installTranslatedDashboards?.();
    }, [installTranslatedDashboards]);
    const installSelectedDashboardsCallback = useCallback(() => {
      installSelectedDashboards?.();
    }, [installSelectedDashboards]);
    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        wrap={true}
        data-test-subj="migrationsBulkActions"
      >
        {showRetryFailedDashboardsButton && (
          <EuiFlexItem grow={false}>
            <ReprocessFailedDashboardsButton
              isDisabled={isTableLoading}
              isLoading={isTableLoading}
              numberOfFailedItems={numberOfFailedDashboards}
              onClick={reprocessFailedDashboardsCallback}
              selectedItems={selectedDashboards}
            />
          </EuiFlexItem>
        )}
        {showInstallSelectedDashboardsButton && (
          <EuiFlexItem grow={false}>
            <InstallTranslatedButton
              disableInstallTranslatedItemsButton={isTableLoading}
              installSelectedItem={installSelectedDashboardsCallback}
              installTranslatedItems={installTranslatedDashboardsCallback}
              isLoading={isTableLoading}
              numberOfTranslatedItems={numberOfTranslatedDashboards}
              selectedItems={selectedDashboards}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
BulkActions.displayName = 'BulkActions';
