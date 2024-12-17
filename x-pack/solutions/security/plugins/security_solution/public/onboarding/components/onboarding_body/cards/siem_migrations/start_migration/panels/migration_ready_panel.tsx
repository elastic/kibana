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
  EuiButton,
  EuiButtonEmpty,
  EuiPanel,
} from '@elastic/eui';
import { useStartMigration } from '../../../../../../../siem_migrations/rules/service/hooks/use_start_migration';
import type { RuleMigrationStats } from '../../../../../../../siem_migrations/rules/types';
import * as i18n from '../translations';
import { useStartMigrationContext } from '../context';
import { TITLE_CLASS_NAME } from '../start_migration_card.styles';

export interface MigrationReadyPanelProps {
  migrationStats: RuleMigrationStats;
}
export const MigrationReadyPanel = React.memo<MigrationReadyPanelProps>(({ migrationStats }) => {
  const { openFlyout } = useStartMigrationContext();
  const onOpenFlyout = useCallback<React.MouseEventHandler>(() => {
    openFlyout(migrationStats);
  }, [openFlyout, migrationStats]);

  const { startMigration, isLoading } = useStartMigration();
  const onStartMigration = useCallback(() => {
    startMigration(migrationStats.id);
  }, [migrationStats.id, startMigration]);

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m">
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="s" className={TITLE_CLASS_NAME}>
                <p>{i18n.START_MIGRATION_CARD_MIGRATION_TITLE(migrationStats.number)}</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <p>{i18n.START_MIGRATION_CARD_MIGRATION_READY_DESCRIPTION}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onStartMigration} isLoading={isLoading}>
            {i18n.START_MIGRATION_CARD_TRANSLATE_BUTTON}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="download" iconSide="right" onClick={onOpenFlyout}>
            {i18n.START_MIGRATION_CARD_UPLOAD_MACROS_BUTTON}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});
MigrationReadyPanel.displayName = 'MigrationReadyPanel';
