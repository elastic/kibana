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
import { StartTranslationButton } from '../../../common/components/start_translation_button';
import { useMigrationDataInputContext } from '../../../common/components/migration_data_input_flyout_context';
import { useStartDashboardsMigrationModal } from '../../hooks/use_start_dashboard_migration_modal';
import { useStartMigration } from '../../logic/use_start_migration';
import type { MigrationSettingsBase } from '../../../common/types';

export interface MigrationReadyPanelProps {
  migrationStats: DashboardMigrationStats;
}

export const MigrationReadyPanel = React.memo<MigrationReadyPanelProps>(({ migrationStats }) => {
  const migrationId = migrationStats.id;
  const [missingResources, setMissingResources] = React.useState<SiemMigrationResourceBase[]>([]);
  const { getMissingResources, isLoading } = useGetMissingResources(
    'dashboard',
    setMissingResources
  );
  const { openFlyout } = useMigrationDataInputContext();

  useEffect(() => {
    getMissingResources(migrationId);
  }, [getMissingResources, migrationId]);

  const onOpenFlyout = useCallback<React.MouseEventHandler>(() => {
    openFlyout(migrationStats);
  }, [migrationStats, openFlyout]);

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

  const { startMigration, isLoading: isStarting } = useStartMigration();
  const onStartMigrationWithSettings = useCallback(
    (settings: MigrationSettingsBase) => {
      startMigration(migrationId, undefined, settings);
    },
    [migrationId, startMigration]
  );
  const { modal: startMigrationModal, showModal: showStartMigrationModal } =
    useStartDashboardsMigrationModal({
      type: 'start',
      migrationStats,
      onStartMigrationWithSettings,
    });

  return (
    <>
      {startMigrationModal}

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
                    aria-label={i18n.DASHBOARD_MIGRATION_UPLOAD_MISSING_RESOURCES_TITLE}
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
                  startMigration={isStopped ? startMigration : showStartMigrationModal}
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
    </>
  );
});
MigrationReadyPanel.displayName = 'MigrationReadyPanel';
