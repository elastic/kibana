/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import type { WorkflowMigrationStats } from '../../types';
import * as i18n from './translations';
import { MigrationsLastError } from '../../../common/components/migration_panels/last_error';
import { MigrationPanelTitle } from '../../../common/components/migration_panels/migration_title';
import { PanelText } from '../../../../common/components/panel_text';
import { StartTranslationButton } from '../../../common/components/start_translation_button';
import { useStartWorkflowsMigrationModal } from '../../hooks/use_start_workflow_migration_modal';
import { useStartMigration } from '../../logic/use_start_migration';
import type { MigrationSettingsBase } from '../../../common/types';

export interface MigrationReadyPanelProps {
  migrationStats: WorkflowMigrationStats;
}

export const MigrationReadyPanel = React.memo<MigrationReadyPanelProps>(({ migrationStats }) => {
  const isStopped = useMemo(
    () => migrationStats.status === SiemMigrationTaskStatus.STOPPED,
    [migrationStats.status]
  );

  const migrationPanelDescription = useMemo(() => {
    if (migrationStats.last_execution?.error) {
      return i18n.WORKFLOW_MIGRATION_ERROR_DESCRIPTION(migrationStats.items.total);
    }

    if (isStopped) {
      return i18n.WORKFLOW_MIGRATION_STOPPED_DESCRIPTION(migrationStats.items.total);
    }
    return i18n.WORKFLOW_MIGRATION_READY_DESCRIPTION(migrationStats.items.total);
  }, [migrationStats.last_execution?.error, migrationStats.items.total, isStopped]);

  const { startMigration, isLoading: isStarting } = useStartMigration();
  const onStartMigrationWithSettings = useCallback(
    (settings: MigrationSettingsBase) => {
      startMigration(migrationStats, settings);
    },
    [migrationStats, startMigration]
  );
  const { modal: startMigrationModal, showModal: showStartMigrationModal } =
    useStartWorkflowsMigrationModal({
      type: 'start',
      migrationStats,
      onStartMigrationWithSettings,
    });

  return (
    <>
      {startMigrationModal}

      <EuiPanel hasShadow={false} hasBorder paddingSize="m" data-test-subj="workflowMigrationReadyPanel">
        <EuiFlexGroup direction="row" gutterSize="m" alignItems="flexEnd">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <MigrationPanelTitle migrationStats={migrationStats} migrationType="workflow" />
              </EuiFlexItem>
              <EuiFlexItem>
                <PanelText data-test-subj="workflowMigrationDescription" size="s" subdued>
                  <span>{migrationPanelDescription}</span>
                </PanelText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StartTranslationButton
              migrationStats={migrationStats}
              isStopped={isStopped}
              startMigration={
                isStopped
                  ? () => startMigration(migrationStats)
                  : showStartMigrationModal
              }
              isStarting={isStarting}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {migrationStats.last_execution?.error && (
          <>
            <EuiSpacer size="m" />
            <MigrationsLastError
              message={migrationStats.last_execution.error}
              migrationType="workflow"
            />
          </>
        )}
      </EuiPanel>
    </>
  );
});
MigrationReadyPanel.displayName = 'MigrationReadyPanel';
