/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiPanel, EuiSpacer } from '@elastic/eui';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { CenteredLoadingSpinner } from '../../../../common/components/centered_loading_spinner';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type { RuleMigrationResourceBase } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { useStartMigration } from '../../service/hooks/use_start_migration';
import type { RuleMigrationStats } from '../../types';
import { useRuleMigrationDataInputContext } from '../data_input_flyout/context';
import * as i18n from './translations';
import { useGetMissingResources } from '../../service/hooks/use_get_missing_resources';
import { RuleMigrationsLastError } from './last_error';
import { MigrationName } from './migration_name';
import { PanelText } from '../../../../common/components/panel_text';

export interface MigrationReadyPanelProps {
  migrationStats: RuleMigrationStats;
}

const EMPTY_MISSING_RESOURCES: RuleMigrationResourceBase[] = [];

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

  const isAborted = useMemo(
    () => migrationStats.status === SiemMigrationTaskStatus.ABORTED,
    [migrationStats.status]
  );

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m">
      <EuiFlexGroup direction="row" gutterSize="m" alignItems="flexEnd">
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <MigrationName
              migrationStats={migrationStats}
              isLoading={isLoading}
              missingResources={EMPTY_MISSING_RESOURCES}
            />
            <EuiFlexItem>
              <PanelText data-test-subj="ruleMigrationDescription" size="s" subdued>
                <span>{i18n.RULE_MIGRATION_READY_DESCRIPTION(migrationStats.rules.total)}</span>
                <span>
                  {!isLoading && missingResources.length > 0
                    ? ` ${i18n.RULE_MIGRATION_READY_MISSING_RESOURCES}`
                    : ''}
                </span>
              </PanelText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {isLoading ? (
          <CenteredLoadingSpinner />
        ) : (
          <EuiFlexItem grow={false}>
            {missingResources.length > 0 ? (
              <EuiButton
                data-test-subj="ruleMigrationMissingResourcesButton"
                fill
                iconType="download"
                iconSide="right"
                onClick={onOpenFlyout}
                size="s"
              >
                {i18n.RULE_MIGRATION_UPLOAD_BUTTON}
              </EuiButton>
            ) : (
              <StartTranslationButton migrationId={migrationStats.id} isAborted={isAborted} />
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {migrationStats.last_error && (
        <>
          <EuiSpacer size="m" />
          <RuleMigrationsLastError message={migrationStats.last_error} />
        </>
      )}
    </EuiPanel>
  );
});
MigrationReadyPanel.displayName = 'MigrationReadyPanel';

const StartTranslationButton = React.memo<{ migrationId: string; isAborted: boolean }>(
  ({ migrationId, isAborted }) => {
    const { startMigration, isLoading } = useStartMigration();
    const onStartMigration = useCallback(() => {
      startMigration(migrationId);
    }, [migrationId, startMigration]);

    return (
      <EuiButton
        data-test-subj={'startMigrationButton'}
        fill
        onClick={onStartMigration}
        isLoading={isLoading}
        size="s"
      >
        {isAborted
          ? i18n.RULE_MIGRATION_RESTART_TRANSLATION_BUTTON
          : i18n.RULE_MIGRATION_START_TRANSLATION_BUTTON}
      </EuiButton>
    );
  }
);
StartTranslationButton.displayName = 'StartTranslationButton';
