/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import type { SiemMigrationResourceBase } from '../../../../../common/siem_migrations/model/common.gen';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { CenteredLoadingSpinner } from '../../../../common/components/centered_loading_spinner';
import type { DashboardMigrationStats } from '../../types';
import * as i18n from './translations';
import { MigrationsLastError } from '../../../common/components/migration_panels/last_error';
import { MigrationPanelTitle } from '../../../common/components/migration_panels/migration_title';
import { PanelText } from '../../../../common/components/panel_text';
import { useGetMissingResources } from '../../../common/hooks/use_get_missing_resources';
import { useStartMigration } from '../../logic/use_start_migration';
import { StartTranslationButton } from '../../../common/components/start_translation_button';

export interface MigrationReadyPanelProps {
  migrationStats: DashboardMigrationStats;
}

export const MigrationReadyPanel = React.memo<MigrationReadyPanelProps>(({ migrationStats }) => {
  const [missingResources, setMissingResources] = React.useState<SiemMigrationResourceBase[]>([]);
  const { getMissingResources, isLoading } = useGetMissingResources(
    'dashboard',
    setMissingResources
  );
  const { startMigration, isLoading: isStarting } = useStartMigration();

  useEffect(() => {
    getMissingResources(migrationStats.id);
  }, [getMissingResources, migrationStats.id]);

  const onOpenFlyout = useCallback<React.MouseEventHandler>(() => {
    // @TODO: openFlyout  here
  }, []);

  const isStopped = useMemo(
    () => migrationStats.status === SiemMigrationTaskStatus.STOPPED,
    [migrationStats.status]
  );

  const migrationPanelDescription = useMemo(() => {
    if (migrationStats.last_execution?.error) {
      return i18n.DASHBOARD_MIGRATION_ERROR_DESCRIPTION(migrationStats.items.total);
    }

    if (isStopped) {
      return i18n.DASHBOARD_MIGRATION_STOPPED_DESCRIPTION(migrationStats.items.total);
    }
    return i18n.DASHBOARD_MIGRATION_READY_DESCRIPTION(migrationStats.items.total);
  }, [migrationStats.last_execution?.error, migrationStats.items.total, isStopped]);

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m">
      <EuiFlexGroup direction="row" gutterSize="m" alignItems="flexEnd">
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <MigrationPanelTitle migrationStats={migrationStats} migrationType="dashboard" />
            </EuiFlexItem>
            <EuiFlexItem>
              <PanelText data-test-subj="dashboardMigrationDescription" size="s" subdued>
                <span>{migrationPanelDescription}</span>
                {!isLoading && missingResources.length > 0 && (
                  <span> {i18n.DASHBOARD_MIGRATION_READY_MISSING_RESOURCES}</span>
                )}
              </PanelText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {isLoading ? (
          <CenteredLoadingSpinner />
        ) : (
          <>
            {missingResources.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="dashboardMigrationMissingResourcesButton"
                  iconType="download"
                  iconSide="right"
                  onClick={onOpenFlyout}
                  size="s"
                >
                  {i18n.DASHBOARD_MIGRATION_UPLOAD_BUTTON}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <StartTranslationButton
                migrationId={migrationStats.id}
                isStopped={isStopped}
                startMigration={startMigration}
                isStarting={isStarting}
              />
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
      {migrationStats.last_execution?.error && (
        <>
          <EuiSpacer size="m" />
          <MigrationsLastError
            message={migrationStats.last_execution.error}
            migrationType="dashboard"
          />
        </>
      )}
    </EuiPanel>
  );
});
MigrationReadyPanel.displayName = 'MigrationReadyPanel';
