/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import { EuiSkeletonLoading, EuiSkeletonText, EuiSkeletonTitle } from '@elastic/eui';
import type { RouteComponentProps } from 'react-router-dom';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { useNavigation } from '../../../common/lib/kibana';
import { HeaderPage } from '../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SecurityPageName } from '../../../app/types';

import * as i18n from './translations';
import { MigrationRulesTable } from '../components/rules_table';
import { NeedAdminForUpdateRulesCallOut } from '../../../detections/components/callouts/need_admin_for_update_callout';
import { MissingPrivilegesCallOut } from '../../../detections/components/callouts/missing_privileges_callout';
import { HeaderButtons } from '../components/header_buttons';
import { UnknownMigration } from '../components/unknown_migration';
import { useLatestStats } from '../service/hooks/use_latest_stats';
import { RuleMigrationDataInputWrapper } from '../components/data_input_flyout/data_input_wrapper';
import { MigrationReadyPanel } from '../components/migration_status_panels/migration_ready_panel';
import { MigrationProgressPanel } from '../components/migration_status_panels/migration_progress_panel';
import { useInvalidateGetMigrationRules } from '../logic/use_get_migration_rules';
import { useInvalidateGetMigrationTranslationStats } from '../logic/use_get_migration_translation_stats';

type MigrationRulesPageProps = RouteComponentProps<{ migrationId?: string }>;

export const MigrationRulesPage: React.FC<MigrationRulesPageProps> = React.memo(
  ({
    match: {
      params: { migrationId },
    },
  }) => {
    const { navigateTo } = useNavigation();
    const { data: ruleMigrationsStats, isLoading, refreshStats } = useLatestStats();

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

    const content = useMemo(() => {
      const migrationStats = ruleMigrationsStats.find((stats) => stats.id === migrationId);
      if (!migrationId || !migrationStats) {
        return <UnknownMigration />;
      }
      if (migrationStats.status === SiemMigrationTaskStatus.FINISHED) {
        return <MigrationRulesTable migrationId={migrationId} refetchData={refetchData} />;
      }
      return (
        <RuleMigrationDataInputWrapper onFlyoutClosed={refetchData}>
          <>
            {migrationStats.status === SiemMigrationTaskStatus.READY && (
              <MigrationReadyPanel migrationStats={migrationStats} />
            )}
            {migrationStats.status === SiemMigrationTaskStatus.RUNNING && (
              <MigrationProgressPanel migrationStats={migrationStats} />
            )}
          </>
        </RuleMigrationDataInputWrapper>
      );
    }, [migrationId, refetchData, ruleMigrationsStats]);

    return (
      <>
        <NeedAdminForUpdateRulesCallOut />
        <MissingPrivilegesCallOut />

        <SecuritySolutionPageWrapper>
          <HeaderPage title={i18n.PAGE_TITLE}>
            <HeaderButtons
              ruleMigrationsStats={ruleMigrationsStats}
              selectedMigrationId={migrationId}
              onMigrationIdChange={onMigrationIdChange}
            />
          </HeaderPage>
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
      </>
    );
  }
);
MigrationRulesPage.displayName = 'MigrationRulesPage';
