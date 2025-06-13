/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
} from '@elastic/eui';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { PanelText } from '../../../../common/components/panel_text';
import type { RuleMigrationStats } from '../../types';
import * as i18n from './translations';
import { RuleMigrationsReadMore } from './read_more';
import { MigrationName } from './migration_name';
import type { RuleMigrationResourceBase } from '../../../../../common/siem_migrations/model/rule_migration.gen';

export interface MigrationProgressPanelProps {
  migrationStats: RuleMigrationStats;
}

const EMPTY_MISSING_RESOURCES: RuleMigrationResourceBase[] = [];

export const MigrationProgressPanel = React.memo<MigrationProgressPanelProps>(
  ({ migrationStats }) => {
    const { euiTheme } = useEuiTheme();
    const finishedCount = migrationStats.rules.completed + migrationStats.rules.failed;
    const progressValue = (finishedCount / migrationStats.rules.total) * 100;

    const preparing = migrationStats.rules.pending === migrationStats.rules.total;

    return (
      <EuiPanel data-test-subj="migrationProgressPanel" hasShadow={false} hasBorder paddingSize="m">
        <EuiFlexGroup direction="column" gutterSize="xs">
          <MigrationName
            migrationStats={migrationStats}
            isLoading={false}
            missingResources={EMPTY_MISSING_RESOURCES}
          />
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              {i18n.RULE_MIGRATION_PROGRESS_DESCRIPTION(migrationStats.rules.total)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="row" justifyContent="flexStart" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type={AssistantIcon} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PanelText size="s" subdued>
              {preparing ? i18n.RULE_MIGRATION_PREPARING : i18n.RULE_MIGRATION_TRANSLATING}
            </PanelText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
        </EuiFlexGroup>
        {!preparing && (
          <>
            <EuiProgress
              value={progressValue}
              valueText={`${Math.floor(progressValue)}%`}
              max={100}
              color={tint(euiTheme.colors.success, 0.25)}
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
