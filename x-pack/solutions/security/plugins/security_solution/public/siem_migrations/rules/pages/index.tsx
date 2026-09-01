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
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AppHeader } from '@kbn/app-header';
import type { RouteComponentProps } from 'react-router-dom';
import type { RelatedIntegration } from '../../../../common/api/detection_engine';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { useNavigation } from '../../../common/lib/kibana';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SecurityPageName } from '../../../app/types';

import { MigrationRulesTable } from '../components/rules_table';
import { NeedAdminForUpdateRulesCallOut } from '../../../detection_engine/rule_management/components/callouts/need_admin_for_update_rules_callout';
import { MissingPrivilegesCallOut } from './missing_privileges_callout';
import { UnknownMigration } from '../../common/components';
import { useLatestStats } from '../service/hooks/use_latest_stats';
import { RuleMigrationDataInputWrapper } from '../components/data_input_flyout/data_input_wrapper';
import { MigrationReadyPanel } from '../components/migration_status_panels/migration_ready_panel';
import { MigrationProgressPanel } from '../../common/components/migration_panels/migration_progress_panel';
import { useInvalidateGetMigrationRules } from '../logic/use_get_migration_rules';
import {
  useGetMigrationTranslationStats,
  useInvalidateGetMigrationTranslationStats,
} from '../logic/use_get_migration_translation_stats';
import { useGetIntegrations } from '../service/hooks/use_get_integrations';
import { RuleMigrationsUploadMissingPanel } from '../components/migration_status_panels/upload_missing_panel';
import { useMigrationAppHeaderProps } from '../../common/hooks/use_migration_app_header_props';
import { MigrationSelector } from '../../common/components/migration_selector';
import { MigrationStatsBadges } from '../../common/components/migration_stats_badges';
import { EmptyMigrationRulesPage } from './empty';
import * as i18n from './translations';

export type MigrationRulesPageProps = RouteComponentProps<{ migrationId?: string }>;

export const MigrationRulesPage: React.FC<MigrationRulesPageProps> = React.memo(
  ({
    match: {
      params: { migrationId },
    },
  }) => {
    const { navigateTo } = useNavigation();
    const { data, isLoading, refreshStats } = useLatestStats();
    const ruleMigrationsStats = useMemo(() => data.slice().reverse(), [data]); // Show the most recent migration first

    const [integrations, setIntegrations] = React.useState<
      Record<string, RelatedIntegration> | undefined
    >();
    const { getIntegrations, isLoading: isIntegrationsLoading } =
      useGetIntegrations(setIntegrations);

    useEffect(() => {
      getIntegrations();
    }, [getIntegrations]);

    useEffect(() => {
      if (isLoading || ruleMigrationsStats.length === 0) {
        return;
      }

      // Navigate to the most recent migration if none is selected
      if (!migrationId) {
        navigateTo({
          deepLinkId: SecurityPageName.siemMigrationsRules,
          path: ruleMigrationsStats[0].id,
        });
      }
    }, [isLoading, migrationId, navigateTo, ruleMigrationsStats]);

    const onMigrationIdChange = useCallback(
      (selectedId?: string) => {
        navigateTo({ deepLinkId: SecurityPageName.siemMigrationsRules, path: selectedId });
      },
      [navigateTo]
    );

    const { menu } = useMigrationAppHeaderProps({
      migrationType: 'rule',
      migrationsStats: ruleMigrationsStats,
    });

    const invalidateGetRuleMigrations = useInvalidateGetMigrationRules();
    const invalidateGetMigrationTranslationStats = useInvalidateGetMigrationTranslationStats();
    const refetchData = useCallback(() => {
      if (!migrationId) {
        return;
      }
      refreshStats();
      invalidateGetRuleMigrations(migrationId);
      invalidateGetMigrationTranslationStats(migrationId);
    }, [
      invalidateGetMigrationTranslationStats,
      invalidateGetRuleMigrations,
      migrationId,
      refreshStats,
    ]);

    const selectedMigrationStats = useMemo(
      () => ruleMigrationsStats.find((stats) => stats.id === migrationId),
      [ruleMigrationsStats, migrationId]
    );

    // Translation stats for the selected migration, shared with MigrationRulesTable via the
    // react-query cache (same cache key), so no extra network request is made.
    const { data: selectedTranslationStats } = useGetMigrationTranslationStats(
      migrationId ?? '',
      !!migrationId
    );

    const content = useMemo(() => {
      if (ruleMigrationsStats.length === 0 && !migrationId) {
        return <EmptyMigrationRulesPage />;
      }
      const migrationStats = selectedMigrationStats;
      if (!migrationId || !migrationStats) {
        return <UnknownMigration />;
      }
      return (
        <RuleMigrationDataInputWrapper onFlyoutClosed={refetchData}>
          <>
            {migrationStats.status === SiemMigrationTaskStatus.FINISHED && (
              <>
                <RuleMigrationsUploadMissingPanel
                  migrationStats={migrationStats}
                  topSpacerSize="s"
                />
                <EuiSpacer size="m" />
                <MigrationRulesTable
                  refetchData={refetchData}
                  integrations={integrations}
                  isIntegrationsLoading={isIntegrationsLoading}
                  migrationStats={migrationStats}
                />
              </>
            )}
            {[
              SiemMigrationTaskStatus.READY,
              SiemMigrationTaskStatus.INTERRUPTED,
              SiemMigrationTaskStatus.STOPPED,
            ].includes(migrationStats.status) && (
              <MigrationReadyPanel migrationStats={migrationStats} />
            )}
            {migrationStats.status === SiemMigrationTaskStatus.RUNNING && (
              <MigrationProgressPanel migrationStats={migrationStats} migrationType="rule" />
            )}
          </>
        </RuleMigrationDataInputWrapper>
      );
    }, [
      migrationId,
      refetchData,
      ruleMigrationsStats,
      selectedMigrationStats,
      integrations,
      isIntegrationsLoading,
    ]);

    return (
      <SecuritySolutionPageWrapper>
        <AppHeader title={i18n.PAGE_TITLE} menu={menu} spacing="largeBleed" />
        {ruleMigrationsStats.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" gutterSize="l" responsive>
              <EuiFlexItem
                grow={false}
                css={css`
                  flex-basis: 40%;
                  min-width: 40%;
                `}
              >
                <MigrationSelector
                  migrationsStats={ruleMigrationsStats}
                  selectedMigrationId={migrationId}
                  onMigrationIdChange={onMigrationIdChange}
                />
              </EuiFlexItem>
              {selectedTranslationStats && (
                <EuiFlexItem grow>
                  <MigrationStatsBadges translationStats={selectedTranslationStats} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </>
        )}
        <NeedAdminForUpdateRulesCallOut />
        <MissingPrivilegesCallOut />
        <EuiSkeletonLoading
          key={migrationId}
          data-test-subj="migrationRulesPageLoading"
          isLoading={isLoading}
          loadingContent={
            <>
              <EuiSkeletonTitle />
              <EuiSkeletonText />
            </>
          }
          loadedContent={content}
        />
      </SecuritySolutionPageWrapper>
    );
  }
);
MigrationRulesPage.displayName = 'MigrationRulesPage';
