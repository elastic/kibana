/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiPanel, EuiProgress } from '@elastic/eui';
import type { RuleMigrationStats } from '../../../../../../../siem_migrations/rules/types';
import * as i18n from '../translations';
import { TITLE_CLASS_NAME } from '../start_migration_card.styles';

export interface MigrationProgressPanelProps {
  migrationStats: RuleMigrationStats;
}
export const MigrationProgressPanel = React.memo<MigrationProgressPanelProps>(
  ({ migrationStats }) => {
    const progressValue = useMemo(() => {
      const finished = migrationStats.rules.completed + migrationStats.rules.failed;
      return (finished / migrationStats.rules.total) * 100;
    }, [migrationStats.rules]);

    return (
      <EuiPanel hasShadow={false} hasBorder paddingSize="m">
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiText size="s" className={TITLE_CLASS_NAME}>
              <p>{i18n.START_MIGRATION_CARD_MIGRATION_TITLE(migrationStats.number)}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p>{i18n.START_MIGRATION_CARD_PROGRESS_DESCRIPTION}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiProgress value={progressValue} max={100} color="success" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
MigrationProgressPanel.displayName = 'MigrationProgressPanel';
