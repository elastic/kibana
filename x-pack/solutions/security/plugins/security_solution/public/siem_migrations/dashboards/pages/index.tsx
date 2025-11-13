/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import { EuiSkeletonLoading, EuiSkeletonText, EuiSkeletonTitle, EuiSpacer } from '@elastic/eui';
import type { RouteComponentProps } from 'react-router-dom';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { useNavigation } from '../../../common/lib/kibana';
import { HeaderPage } from '../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SecurityPageName } from '../../../app/types';

import { HeaderButtons, UnknownMigration } from '../../common/components';
import { EmptyMigrationDashboardsPage } from './empty';
import * as i18n from './translations';
import { useLatestStats } from '../service/hooks/use_latest_stats';
import { MigrationDashboardsTable } from '../components/dashboard_table';
import { useInvalidateGetMigrationDashboards } from '../logic/use_get_migration_dashboards';
import { useInvalidateGetMigrationTranslationStats } from '../logic/use_get_migration_translation_stats';
import { PageTitle } from '../../common/components/page_title';
import { MigrationProgressPanel } from '../../common/components/migration_panels/migration_progress_panel';
import { DashboardMigrationsUploadMissingPanel } from '../components/migration_status_panels/upload_missing_panel';
import { MigrationReadyPanel } from '../components/migration_status_panels/migration_ready_panel';
import { DashboardMigrationDataInputWrapper } from '../components/data_input_flyout/wrapper';

export type MigrationDashboardsPageProps = RouteComponentProps<{ migrationId?: string }>;

export const MigrationDashboardsPage: React.FC<MigrationDashboardsPageProps> = React.memo(
  ({
    match: {
      params: { migrationId },
    },
  }) => {
    const { navigateTo } = useNavigation();
    const { data, isLoading, refreshStats } = useLatestStats();
    const dashboardMigrationsStats = useMemo(() => data.slice().reverse(), [data]); // Show the most recent migration first

    useEffect(() => {
      if (isLoading || dashboardMigrationsStats.length === 0) {
        return;
      }

      // Navigate to the most recent migration if none is selected
      if (!migrationId) {
        navigateTo({
          deepLinkId: SecurityPageName.siemMigrationsDashboards,
          path: dashboardMigrationsStats[0].id,
        });
      }
    }, [isLoading, migrationId, navigateTo, dashboardMigrationsStats]);

    const onMigrationIdChange = (selectedId?: string) => {
      navigateTo({ deepLinkId: SecurityPageName.siemMigrationsDashboards, path: selectedId });
    };

    const invalidateGetMigrationDashboards = useInvalidateGetMigrationDashboards();
    const invalidateGetMigrationTranslationStats = useInvalidateGetMigrationTranslationStats();
    const refetchData = useCallback(() => {
      if (!migrationId) {
        return;
      }
      refreshStats();
      invalidateGetMigrationDashboards(migrationId);
      invalidateGetMigrationTranslationStats(migrationId);
    }, [
      invalidateGetMigrationDashboards,
      invalidateGetMigrationTranslationStats,
      migrationId,
      refreshStats,
    ]);

    const content = useMemo(() => {
      if (dashboardMigrationsStats.length === 0 && !migrationId) {
        return <EmptyMigrationDashboardsPage />;
      }
      const migrationStats = dashboardMigrationsStats.find((stats) => stats.id === migrationId);
      if (!migrationId || !migrationStats) {
        return <UnknownMigration />;
      }

      return (
        <DashboardMigrationDataInputWrapper onFlyoutClosed={refetchData}>
          <>
            {migrationStats.status === SiemMigrationTaskStatus.RUNNING && (
              <MigrationProgressPanel migrationStats={migrationStats} migrationType="dashboard" />
            )}
            {migrationStats.status === SiemMigrationTaskStatus.FINISHED && (
              <>
                <DashboardMigrationsUploadMissingPanel
                  migrationStats={migrationStats}
                  topSpacerSize="s"
                />
                <EuiSpacer size="m" />
                <MigrationDashboardsTable
                  refetchData={refetchData}
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
          </>
        </DashboardMigrationDataInputWrapper>
      );
    }, [dashboardMigrationsStats, migrationId, refetchData]);

    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage title={<PageTitle title={i18n.PAGE_TITLE} isBeta={true} />} border>
          <HeaderButtons
            migrationType="dashboard"
            migrationsStats={dashboardMigrationsStats}
            selectedMigrationId={migrationId}
            onMigrationIdChange={onMigrationIdChange}
          />
        </HeaderPage>
        <EuiSkeletonLoading
          key={migrationId}
          data-test-subj="migrationDashboardsPageLoading"
          isLoading={isLoading}
          loadingContent={
            <>
              <EuiSkeletonTitle data-test-subj="loadingSkeletonTitle" />
              <EuiSkeletonText data-test-subj="loadingSkeletonText" />
            </>
          }
          loadedContent={content}
        />
      </SecuritySolutionPageWrapper>
    );
  }
);
MigrationDashboardsPage.displayName = 'MigrationDashboardsPage';
