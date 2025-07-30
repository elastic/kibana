/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiPanel,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { CenteredLoadingSpinner } from '../../../../common/components/centered_loading_spinner';
import { useKibana } from '../../../../common/lib/kibana/use_kibana';
import type { RuleMigrationResourceBase } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { useStartMigration } from '../../service/hooks/use_start_migration';
import type { RuleMigrationStats } from '../../types';
import * as i18n from './translations';
import { useGetMissingResources } from '../../service/hooks/use_get_missing_resources';
import { RuleMigrationsLastError } from './last_error';
import { MigrationPanelTitle } from './migration_panel_title';
import { PanelText } from '../../../../common/components/panel_text';
import { useMigrationDataInputContext } from '../../../common/components/migration_data_input_flyout_context';

export interface MigrationReadyPanelProps {
  migrationStats: RuleMigrationStats;
}

export const MigrationReadyPanel = React.memo<MigrationReadyPanelProps>(({ migrationStats }) => {
  const { openFlyout } = useMigrationDataInputContext();
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

  const isStopped = useMemo(
    () => migrationStats.status === SiemMigrationTaskStatus.STOPPED,
    [migrationStats.status]
  );

  const migrationPanelDescription = useMemo(() => {
    if (migrationStats.last_execution?.error) {
      return i18n.RULE_MIGRATION_ERROR_DESCRIPTION(migrationStats.rules.total);
    }

    if (isStopped) {
      return i18n.RULE_MIGRATION_STOPPED_DESCRIPTION(migrationStats.rules.total);
    }
    return i18n.RULE_MIGRATION_READY_DESCRIPTION(migrationStats.rules.total);
  }, [migrationStats.last_execution?.error, migrationStats.rules.total, isStopped]);

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m">
      <EuiFlexGroup direction="row" gutterSize="m" alignItems="flexEnd">
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <MigrationPanelTitle migrationStats={migrationStats} />
            </EuiFlexItem>
            <EuiFlexItem>
              <PanelText data-test-subj="ruleMigrationDescription" size="s" subdued>
                <span>{migrationPanelDescription}</span>
                {!isLoading && missingResources.length > 0 && (
                  <span> {i18n.RULE_MIGRATION_READY_MISSING_RESOURCES}</span>
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
                  data-test-subj="ruleMigrationMissingResourcesButton"
                  iconType="download"
                  iconSide="right"
                  onClick={onOpenFlyout}
                  size="s"
                >
                  {i18n.RULE_MIGRATION_UPLOAD_BUTTON}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <StartTranslationButton migrationId={migrationStats.id} isStopped={isStopped} />
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
      {migrationStats.last_execution?.error && (
        <>
          <EuiSpacer size="m" />
          <RuleMigrationsLastError message={migrationStats.last_execution.error} />
        </>
      )}
    </EuiPanel>
  );
});
MigrationReadyPanel.displayName = 'MigrationReadyPanel';

const StartTranslationButton = React.memo<{ migrationId: string; isStopped: boolean }>(
  ({ migrationId, isStopped }) => {
    const { startMigration, isLoading } = useStartMigration();
    const onStartMigration = useCallback(() => {
      startMigration(migrationId);
    }, [migrationId, startMigration]);

    const text = useMemo(() => {
      if (isStopped) {
        return isLoading
          ? i18n.RULE_MIGRATION_RESUMING_TRANSLATION_BUTTON
          : i18n.RULE_MIGRATION_RESUME_TRANSLATION_BUTTON;
      } else {
        return isLoading
          ? i18n.RULE_MIGRATION_STARTING_TRANSLATION_BUTTON
          : i18n.RULE_MIGRATION_START_TRANSLATION_BUTTON;
      }
    }, [isStopped, isLoading]);

    return (
      <EuiButton
        data-test-subj={'startMigrationButton'}
        fill={!isStopped}
        onClick={onStartMigration}
        isLoading={isLoading}
        size="s"
      >
        {text}
      </EuiButton>
    );
  }
);
StartTranslationButton.displayName = 'StartTranslationButton';
