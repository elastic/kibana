/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import type { WorkflowMigrationStats } from '../../types';
import * as i18n from './translations';
import { MigrationsLastError } from '../../../common/components/migration_panels/last_error';
import { MigrationPanelTitle } from '../../../common/components/migration_panels/migration_title';
import { MIGRATION_START_TRANSLATION_BUTTON } from '../../../common/components/start_translation_button/translations';
import { PanelText } from '../../../../common/components/panel_text';

export interface MigrationReadyPanelProps {
  migrationStats: WorkflowMigrationStats;
}

export const MigrationReadyPanel = React.memo<MigrationReadyPanelProps>(({ migrationStats }) => {
  const migrationPanelDescription = useMemo(() => {
    if (migrationStats.last_execution?.error) {
      return i18n.WORKFLOW_MIGRATION_ERROR_DESCRIPTION(migrationStats.items.total);
    }

    if (migrationStats.status === SiemMigrationTaskStatus.STOPPED) {
      return i18n.WORKFLOW_MIGRATION_STOPPED_DESCRIPTION(migrationStats.items.total);
    }
    return i18n.WORKFLOW_MIGRATION_READY_DESCRIPTION(migrationStats.items.total);
  }, [migrationStats.last_execution?.error, migrationStats.items.total, migrationStats.status]);

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m">
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
          {/* Starting a translation is not available yet, it is wired together with the start modal. */}
          <EuiButton
            data-test-subj="startMigrationButton"
            aria-label={MIGRATION_START_TRANSLATION_BUTTON}
            fill
            size="s"
          >
            {MIGRATION_START_TRANSLATION_BUTTON}
          </EuiButton>
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
  );
});
MigrationReadyPanel.displayName = 'MigrationReadyPanel';
