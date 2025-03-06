/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiPanel } from '@elastic/eui';
import { CenteredLoadingSpinner } from '../../../../common/components/centered_loading_spinner';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type { RuleMigrationResourceBase } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { PanelText } from '../../../../common/components/panel_text';
import { useStartMigration } from '../../service/hooks/use_start_migration';
import type { RuleMigrationStats } from '../../types';
import { useRuleMigrationDataInputContext } from '../data_input_flyout/context';
import * as i18n from './translations';
import { useGetMissingResources } from '../../service/hooks/use_get_missing_resources';

export interface MigrationReadyPanelProps {
  migrationStats: RuleMigrationStats;
}
export const MigrationReadyPanel = React.memo<MigrationReadyPanelProps>(({ migrationStats }) => {
  const { openFlyout } = useRuleMigrationDataInputContext();
  const { telemetry } = useKibana().services.siemMigrations.rules;
  const [missingResources, setMissingResources] = React.useState<RuleMigrationResourceBase[]>([]);
  const { getMissingResources, isLoading } = useGetMissingResources(setMissingResources);

  useEffect(() => {
    getMissingResources(migrationStats.id);
  }, [getMissingResources, migrationStats.id]);

  const onOpenFlyout = useCallback<React.MouseEventHandler>(() => {
    openFlyout(migrationStats);
    telemetry.reportSetupMigrationOpenResources({
      migrationId: migrationStats.id,
      missingResourcesCount: missingResources.length,
    });
  }, [openFlyout, migrationStats, telemetry, missingResources.length]);

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m">
      <EuiFlexGroup direction="row" gutterSize="m" alignItems="flexEnd">
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <PanelText size="s" semiBold>
                <p>{i18n.RULE_MIGRATION_TITLE(migrationStats.number)}</p>
              </PanelText>
            </EuiFlexItem>
            <EuiFlexItem>
              <PanelText size="s" subdued>
                {i18n.RULE_MIGRATION_READY_DESCRIPTION(
                  migrationStats.rules.total,
                  !isLoading && missingResources.length > 0
                    ? i18n.RULE_MIGRATION_READY_MISSING_RESOURCES
                    : ''
                )}
              </PanelText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {isLoading ? (
          <CenteredLoadingSpinner />
        ) : (
          <EuiFlexItem grow={false}>
            {missingResources.length > 0 ? (
              <EuiButton fill iconType="download" iconSide="right" onClick={onOpenFlyout} size="s">
                {i18n.RULE_MIGRATION_UPLOAD_BUTTON}
              </EuiButton>
            ) : (
              <StartTranslationButton migrationId={migrationStats.id} />
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
});
MigrationReadyPanel.displayName = 'MigrationReadyPanel';

const StartTranslationButton = React.memo<{ migrationId: string }>(({ migrationId }) => {
  const { startMigration, isLoading } = useStartMigration();
  const onStartMigration = useCallback(() => {
    startMigration(migrationId);
  }, [migrationId, startMigration]);

  return (
    <EuiButton fill onClick={onStartMigration} isLoading={isLoading} size="s">
      {i18n.RULE_MIGRATION_START_TRANSLATION_BUTTON}
    </EuiButton>
  );
});
StartTranslationButton.displayName = 'StartTranslationButton';
