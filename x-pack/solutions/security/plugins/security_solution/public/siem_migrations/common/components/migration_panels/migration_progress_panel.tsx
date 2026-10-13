/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiPanel,
  EuiProgress,
  EuiLoadingSpinner,
  EuiSpacer,
  useEuiTheme,
  EuiButtonEmpty,
} from '@elastic/eui';
import { PanelText } from '../../../../common/components/panel_text';
import { useStopSiemMigration } from '../../hooks/use_stop_siem_migration';
import type { MigrationTaskStats } from '../../../../../common/siem_migrations/model/common.gen';
import type { MigrationType } from '../../../../../common/siem_migrations/types';
import { MigrationPanelTitle } from './migration_title';
import { MigrationsReadMore } from './read_more';
import {
  MIGRATION_PROGRESS_DESCRIPTION,
  MIGRATION_PREPARING,
  MIGRATION_TRANSLATING,
  MIGRATION_STOP_BUTTON,
  MIGRATION_STOPPING_BUTTON,
} from './translations';

export interface MigrationProgressPanelProps {
  migrationStats: MigrationTaskStats;
  migrationType: MigrationType;
}

export const MigrationProgressPanel = React.memo(function MigrationProgressPanel({
  migrationStats,
  migrationType,
}: MigrationProgressPanelProps) {
  const { euiTheme } = useEuiTheme();
  const { mutate: stopMigration, isLoading: isStopping } = useStopSiemMigration(migrationType);

  const onStopMigration = useCallback(() => {
    stopMigration({ migrationId: migrationStats.id, vendor: migrationStats.vendor });
  }, [migrationStats, stopMigration]);

  const { items } = migrationStats;
  const finishedCount = items.completed + items.failed;
  const progressValue = (finishedCount / items.total) * 100;

  const preparing = items.pending === items.total;

  // Create dynamic data-test-subj attributes for testing compatibility
  const panelTestId = `${migrationType}MigrationProgressPanel`;
  const descriptionTestId = `${migrationType}MigrationDescription`;
  const spinnerTestId = `${migrationType}MigrationSpinner`;
  const progressBarTestId = `${migrationType}MigrationProgressBar`;

  return (
    <EuiPanel
      data-test-subj={panelTestId}
      hasShadow={false}
      hasBorder
      paddingSize="m"
      css={{
        backgroundColor: euiTheme.colors.backgroundBasePrimary,
        borderColor: euiTheme.colors.borderBasePrimary,
      }}
    >
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <MigrationPanelTitle migrationStats={migrationStats} migrationType={migrationType} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                flush="both"
                isLoading={isStopping}
                onClick={onStopMigration}
                data-test-subj="stopMigrationButton"
              >
                {isStopping ? MIGRATION_STOPPING_BUTTON : MIGRATION_STOP_BUTTON}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="row" alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <PanelText size="s" subdued data-test-subj={descriptionTestId}>
                    {preparing ? MIGRATION_PREPARING : MIGRATION_TRANSLATING}
                  </PanelText>
                </EuiFlexItem>
                {!isStopping && (
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="s" data-test-subj={spinnerTestId} />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s">{MIGRATION_PROGRESS_DESCRIPTION(items.total)}</EuiText>
      {!preparing && (
        <>
          <EuiSpacer size="m" />
          <EuiProgress
            value={progressValue}
            max={100}
            color="success"
            data-test-subj={progressBarTestId}
          />
        </>
      )}
      <EuiSpacer size="s" />
      <MigrationsReadMore migrationType={migrationType} />
    </EuiPanel>
  );
});
