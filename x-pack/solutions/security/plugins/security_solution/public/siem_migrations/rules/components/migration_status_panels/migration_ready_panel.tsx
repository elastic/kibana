/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { useKibana } from '../../../../common/lib/kibana/use_kibana';
import type { RuleMigrationSettings, RuleMigrationStats } from '../../types';
import {
  useMigrationDataInputContext,
  MigrationsLastError,
  MigrationPanelTitle,
} from '../../../common/components';
import * as i18n from './translations';
import { PanelText } from '../../../../common/components/panel_text';
import { useGetMissingResources } from '../../../common/hooks/use_get_missing_resources';
import { StartTranslationButton } from '../../../common/components/start_translation_button';
import { useStartRulesMigrationModal } from '../../hooks/use_start_rules_migration_modal';
import { useStartMigration } from '../../logic/use_start_migration';
import { MigrationSource } from '../../../common/types';
import { useMissingResources } from '../../../common/hooks/use_missing_resources';

export interface MigrationReadyPanelProps {
  migrationStats: RuleMigrationStats;
}

const RULE_MIGRATION_READY_MISSING_RESOURCES_DESCRIPTION: Record<MigrationSource, string> = {
  [MigrationSource.SPLUNK]: i18n.RULE_MIGRATION_READY_MISSING_RESOURCES_SPLUNK,
  [MigrationSource.QRADAR]: i18n.RULE_MIGRATION_READY_MISSING_RESOURCES_QRADAR,
};

export const MigrationReadyPanel = React.memo<MigrationReadyPanelProps>(({ migrationStats }) => {
  const { openFlyout, isFlyoutOpen } = useMigrationDataInputContext();
  const [flyoutMigrationId, setFlyoutMigrationId] = useState<string | undefined>();
  const handleMissingResourcesIndexed = useCallback(() => {
    setFlyoutMigrationId(undefined);
  }, []);
  const { telemetry } = useKibana().services.siemMigrations.rules;
  const { missingResourceCount, onMissingResourcesFetched } = useMissingResources({
    migrationSource: migrationStats.vendor,
    handleMissingResourcesIndexed,
  });
  const { getMissingResources, isLoading: isLoadingMissingResources } = useGetMissingResources(
    'rule',
    onMissingResourcesFetched
  );

  useEffect(() => {
    getMissingResources(migrationStats.id);
  }, [getMissingResources, migrationStats.id]);

  // Check for missing resources when the flyout is closed
  useEffect(() => {
    if (!isFlyoutOpen && flyoutMigrationId && migrationStats.id === flyoutMigrationId) {
      getMissingResources(migrationStats.id);
    }
  }, [getMissingResources, flyoutMigrationId, migrationStats.id, isFlyoutOpen]);

  const onOpenFlyout = useCallback<React.MouseEventHandler>(() => {
    openFlyout(migrationStats);
    setFlyoutMigrationId(migrationStats.id);
    telemetry.reportSetupMigrationOpenResources({
      migrationId: migrationStats.id,
      missingResourcesCount: missingResourceCount,
      vendor: migrationStats.vendor,
    });
  }, [openFlyout, migrationStats, telemetry, missingResourceCount]);

  const isStopped = useMemo(
    () => migrationStats.status === SiemMigrationTaskStatus.STOPPED,
    [migrationStats.status]
  );

  const migrationPanelDescription = useMemo(() => {
    if (migrationStats.last_execution?.error) {
      return i18n.RULE_MIGRATION_ERROR_DESCRIPTION(migrationStats.items.total);
    }

    if (isStopped) {
      return i18n.RULE_MIGRATION_STOPPED_DESCRIPTION(migrationStats.items.total);
    }
    return i18n.RULE_MIGRATION_READY_DESCRIPTION(migrationStats.items.total);
  }, [migrationStats.last_execution?.error, migrationStats.items.total, isStopped]);

  const { startMigration, isLoading: isStarting } = useStartMigration();
  const onStartMigrationWithSettings = useCallback(
    (settings: RuleMigrationSettings) => {
      startMigration(migrationStats, undefined, settings);
    },
    [migrationStats, startMigration]
  );
  const { modal: startMigrationModal, showModal: showStartMigrationModal } =
    useStartRulesMigrationModal({ type: 'start', migrationStats, onStartMigrationWithSettings });

  return (
    <>
      {startMigrationModal}
      <EuiPanel hasShadow={false} hasBorder paddingSize="m">
        <EuiFlexGroup direction="row" gutterSize="m" alignItems="flexEnd">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <MigrationPanelTitle migrationStats={migrationStats} migrationType="rule" />
              </EuiFlexItem>
              <EuiFlexItem>
                <PanelText data-test-subj="ruleMigrationDescription" size="s" subdued>
                  <span>{migrationPanelDescription}</span>
                  {!isLoadingMissingResources && missingResourceCount > 0 && (
                    <span>
                      {' '}
                      {RULE_MIGRATION_READY_MISSING_RESOURCES_DESCRIPTION[migrationStats.vendor]}
                    </span>
                  )}
                </PanelText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {missingResourceCount > 0 && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="ruleMigrationMissingResourcesButton"
                aria-label={i18n.RULE_MIGRATION_UPLOAD_MISSING_RESOURCES_SPLUNK_TITLE}
                iconType="download"
                iconSide="right"
                onClick={onOpenFlyout}
                size="s"
                isLoading={isLoadingMissingResources}
              >
                {i18n.RULE_MIGRATION_UPLOAD_BUTTON}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <StartTranslationButton
              migrationStats={migrationStats}
              isStopped={isStopped}
              startMigration={isStopped ? startMigration : showStartMigrationModal}
              isStarting={isStarting}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {migrationStats.last_execution?.error && (
          <>
            <EuiSpacer size="m" />
            <MigrationsLastError
              message={migrationStats.last_execution.error}
              migrationType="rule"
            />
          </>
        )}
      </EuiPanel>
    </>
  );
});
MigrationReadyPanel.displayName = 'MigrationReadyPanel';
