/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import { EuiSkeletonLoading, EuiSkeletonText, EuiSkeletonTitle, EuiSpacer } from '@elastic/eui';
import type { RouteComponentProps } from 'react-router-dom';
import type { RelatedIntegration } from '../../../../common/api/detection_engine';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { useNavigation } from '../../../common/lib/kibana';
import { HeaderPage } from '../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SecurityPageName } from '../../../app/types';

import { MigrationRulesTable } from '../components/rules_table';
import { NeedAdminForUpdateRulesCallOut } from '../../../detections/components/callouts/need_admin_for_update_callout';
import { MissingPrivilegesCallOut } from './missing_privileges_callout';
import { HeaderButtons } from '../components/header_buttons';
import { UnknownMigration } from '../components/unknown_migration';
import { useLatestStats } from '../service/hooks/use_latest_stats';
import { RuleMigrationDataInputWrapper } from '../components/data_input_flyout/data_input_wrapper';
import { MigrationReadyPanel } from '../components/migration_status_panels/migration_ready_panel';
import { MigrationProgressPanel } from '../components/migration_status_panels/migration_progress_panel';
import { useInvalidateGetMigrationRules } from '../logic/use_get_migration_rules';
import { useInvalidateGetMigrationTranslationStats } from '../logic/use_get_migration_translation_stats';
import { useGetIntegrations } from '../service/hooks/use_get_integrations';
import { PageTitle } from './page_title';
import { RuleMigrationsUploadMissingPanel } from '../components/migration_status_panels/upload_missing_panel';

type MigrationRulesPageProps = RouteComponentProps<{ migrationId?: string }>;

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
      if (isLoading) {
        return;
      }

      // Navigate to landing page if there are no migrations
      if (!ruleMigrationsStats.length) {
        navigateTo({ deepLinkId: SecurityPageName.landing, path: 'siem_migrations' });
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

    const onMigrationIdChange = (selectedId?: string) => {
      navigateTo({ deepLinkId: SecurityPageName.siemMigrationsRules, path: selectedId });
    };

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

    const pageTitle = useMemo(() => <PageTitle />, []);

    const content = useMemo(() => {
      const migrationStats = ruleMigrationsStats.find((stats) => stats.id === migrationId);
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
                  migrationId={migrationId}
                  refetchData={refetchData}
                  integrations={integrations}
                  isIntegrationsLoading={isIntegrationsLoading}
                />
              </>
            )}
            {migrationStats.status === SiemMigrationTaskStatus.READY && (
              <MigrationReadyPanel migrationStats={migrationStats} />
            )}
            {migrationStats.status === SiemMigrationTaskStatus.RUNNING && (
              <MigrationProgressPanel migrationStats={migrationStats} />
            )}
          </>
        </RuleMigrationDataInputWrapper>
      );
    }, [migrationId, refetchData, ruleMigrationsStats, integrations, isIntegrationsLoading]);

    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage title={pageTitle} border>
          <HeaderButtons
            ruleMigrationsStats={ruleMigrationsStats}
            selectedMigrationId={migrationId}
            onMigrationIdChange={onMigrationIdChange}
          />
        </HeaderPage>
        <NeedAdminForUpdateRulesCallOut />
        <MissingPrivilegesCallOut />
        <EuiSkeletonLoading
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
