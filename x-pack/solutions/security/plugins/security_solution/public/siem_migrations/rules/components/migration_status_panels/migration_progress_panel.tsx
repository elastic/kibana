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
  EuiIcon,
  EuiSpacer,
  useEuiTheme,
  tint,
  EuiButtonEmpty,
} from '@elastic/eui';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { PanelText } from '../../../../common/components/panel_text';
import type { RuleMigrationStats } from '../../types';
import * as i18n from './translations';
import { RuleMigrationsReadMore } from './read_more';
import { useStopSiemMigration } from '../../../common/hooks/use_stop_siem_migration';
import { MigrationPanelTitle } from '../../../common/components/migration_panels/migration_title';

export interface MigrationProgressPanelProps {
  migrationStats: RuleMigrationStats;
}
export const MigrationProgressPanel = React.memo<MigrationProgressPanelProps>(
  ({ migrationStats }) => {
    const { euiTheme } = useEuiTheme();
    const { mutate: stopMigration, isLoading: isStopping } = useStopSiemMigration('rule');

    const onStopMigration = useCallback(() => {
      stopMigration({ migrationId: migrationStats.id });
    }, [migrationStats.id, stopMigration]);

    const { items } = migrationStats;
    const finishedCount = items.completed + items.failed;
    const progressValue = (finishedCount / items.total) * 100;

    const preparing = items.pending === items.total;

    return (
      <EuiPanel data-test-subj="migrationProgressPanel" hasShadow={false} hasBorder paddingSize="m">
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <MigrationPanelTitle migrationStats={migrationStats} migrationType="rule" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{i18n.RULE_MIGRATION_PROGRESS_DESCRIPTION(items.total)}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="stop"
              isLoading={isStopping}
              onClick={onStopMigration}
              data-test-subj="stopMigrationButton"
            >
              {isStopping
                ? i18n.RULE_MIGRATION_STOPPING_TRANSLATION_BUTTON
                : i18n.RULE_MIGRATION_STOP_TRANSLATION_BUTTON}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="row" justifyContent="flexStart" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type={AssistantIcon} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PanelText size="s" subdued data-test-subj="ruleMigrationDescription">
              {preparing ? i18n.RULE_MIGRATION_PREPARING : i18n.RULE_MIGRATION_TRANSLATING}
            </PanelText>
          </EuiFlexItem>
          {!isStopping && (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" data-test-subj="ruleMigrationSpinner" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {!preparing && (
          <>
            <EuiProgress
              value={progressValue}
              valueText={`${Math.floor(progressValue)}%`}
              max={100}
              color={tint(euiTheme.colors.success, 0.25)}
              data-test-subj="ruleMigrationProgressBar"
            />
            <EuiSpacer size="xs" />
            <RuleMigrationsReadMore />
          </>
        )}
      </EuiPanel>
    );
  }
);
MigrationProgressPanel.displayName = 'MigrationProgressPanel';
