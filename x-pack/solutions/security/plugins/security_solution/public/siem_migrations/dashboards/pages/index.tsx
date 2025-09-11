/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import { EuiSkeletonLoading, EuiSkeletonText, EuiSkeletonTitle, EuiTitle } from '@elastic/eui';
import type { RouteComponentProps } from 'react-router-dom';
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
    const refetchData = useCallback(() => {
      if (!migrationId) {
        return;
      }
      refreshStats();
      invalidateGetMigrationDashboards(migrationId);
    }, [invalidateGetMigrationDashboards, migrationId, refreshStats]);

    const content = useMemo(() => {
      if (dashboardMigrationsStats.length === 0 && !migrationId) {
        return <EmptyMigrationDashboardsPage />;
      }
      const migrationStats = dashboardMigrationsStats.find((stats) => stats.id === migrationId);
      if (!migrationId || !migrationStats) {
        return <UnknownMigration />;
      }
      return (
        <>
          <MigrationDashboardsTable refetchData={refetchData} migrationStats={migrationStats} />
        </>
      );
    }, [dashboardMigrationsStats, migrationId, refetchData]);

    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage
          title={
            <EuiTitle data-test-subj="siemMigrationsPageTitle" size="l">
              <h1>{i18n.PAGE_TITLE}</h1>
            </EuiTitle>
          }
          border
        >
          <HeaderButtons
            migrationsStats={dashboardMigrationsStats}
            selectedMigrationId={migrationId}
            onMigrationIdChange={onMigrationIdChange}
          />
        </HeaderPage>
        <EuiSkeletonLoading
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
MigrationDashboardsPage.displayName = 'MigrationDashboardsPage';
