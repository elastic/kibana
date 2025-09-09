/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DashboardMigrationDashboard } from '../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { InstallTranslatedButton } from '../../../../common/components/bulk_actions';
import { useReprocessFailedButton } from './use_reprocess_failed_button';
import type { MigrationTranslationStats } from '../../../types';

export interface BulkActionsProps {
  isTableLoading: boolean;
  installTranslatedDashboards?: () => void;
  installSelectedDashboards?: () => void;
  reprocessFailedDashboards?: () => void;
  selectedDashboards: DashboardMigrationDashboard[];
  translationStats: MigrationTranslationStats;
}

/**
 * Collection of buttons to perform bulk actions on migration dashboards within the SIEM Dashboards Migrations table.
 */
export const BulkActions: React.FC<BulkActionsProps> = memo(
  ({
    isTableLoading,
    translationStats,
    selectedDashboards: selectedRules,
    installTranslatedDashboards,
    installSelectedDashboards,
    reprocessFailedDashboards,
  }) => {
    const numberOfFailedRules = translationStats.dashboards.failed;
    const numberOfTranslatedRules = translationStats.dashboards.success.installable;
    const showInstallSelectedRulesButton = numberOfTranslatedRules > 0;
    const showRetryFailedRulesButton = numberOfFailedRules > 0;
    const reprocessFailedDashboardsCallback = useCallback(() => {
      reprocessFailedDashboards?.();
    }, [reprocessFailedDashboards]);
    const installTranslatedDashboardsCallback = useCallback(() => {
      installTranslatedDashboards?.();
    }, [installTranslatedDashboards]);
    const installSelectedDashboardsCallback = useCallback(() => {
      installSelectedDashboards?.();
    }, [installSelectedDashboards]);
    const { reprocessButton: ReprocessFailedDashboardsButton } = useReprocessFailedButton();
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
        {showRetryFailedRulesButton && (
          <EuiFlexItem grow={false}>
            <ReprocessFailedDashboardsButton
              isDisabled={isTableLoading}
              isLoading={isTableLoading}
              numberOfFailedItems={numberOfFailedRules}
              onClick={reprocessFailedDashboardsCallback}
              selectedItems={selectedRules}
            />
          </EuiFlexItem>
        )}
        {showInstallSelectedRulesButton && (
          <EuiFlexItem grow={false}>
            <InstallTranslatedButton
              disableInstallTranslatedItemsButton={isTableLoading}
              installSelectedItem={installSelectedDashboardsCallback}
              installTranslatedItems={installTranslatedDashboardsCallback}
              isLoading={isTableLoading}
              numberOfTranslatedItems={numberOfTranslatedRules}
              selectedItems={selectedRules}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
BulkActions.displayName = 'BulkActions';
