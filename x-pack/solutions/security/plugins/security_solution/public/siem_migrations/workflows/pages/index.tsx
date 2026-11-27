/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiSkeletonLoading, EuiSkeletonText, EuiSkeletonTitle, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { RouteComponentProps } from 'react-router-dom';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { useNavigation } from '../../../common/lib/kibana';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SecurityPageName } from '../../../app/types';
import { UnknownMigration } from '../../common/components';
import { MigrationSelectorRow } from '../../common/components/migration_selector';
import { useMigrationAppHeaderProps } from '../../common/hooks/use_migration_app_header_props';
import { MigrationReadyPanel } from '../components/migration_status_panels/migration_ready_panel';
import { useLatestStats } from '../service/hooks/use_latest_stats';
import { EmptyMigrationWorkflowsPage } from './empty';
import * as i18n from './translations';

export type MigrationWorkflowsPageProps = RouteComponentProps<{ migrationId?: string }>;

export const MigrationWorkflowsPage: React.FC<MigrationWorkflowsPageProps> = React.memo(
  ({
    match: {
      params: { migrationId },
    },
  }) => {
    const { navigateTo } = useNavigation();
    const { data, isLoading } = useLatestStats();
    const workflowMigrationsStats = useMemo(() => data.slice().reverse(), [data]); // Show the most recent migration first

    useEffect(() => {
      if (isLoading || workflowMigrationsStats.length === 0) {
        return;
      }

      // Navigate to the most recent migration if none is selected
      if (!migrationId) {
        navigateTo({
          deepLinkId: SecurityPageName.siemMigrationsWorkflows,
          path: workflowMigrationsStats[0].id,
        });
      }
    }, [isLoading, migrationId, navigateTo, workflowMigrationsStats]);

    const onMigrationIdChange = useCallback(
      (selectedId?: string) => {
        navigateTo({ deepLinkId: SecurityPageName.siemMigrationsWorkflows, path: selectedId });
      },
      [navigateTo]
    );

    const { menu, docLink } = useMigrationAppHeaderProps({
      migrationType: 'workflow',
      migrationsStats: workflowMigrationsStats,
    });

    const content = useMemo(() => {
      if (workflowMigrationsStats.length === 0 && !migrationId) {
        return <EmptyMigrationWorkflowsPage />;
      }
      const migrationStats = workflowMigrationsStats.find((stats) => stats.id === migrationId);
      if (!migrationId || !migrationStats) {
        return <UnknownMigration />;
      }

      return (
        <>
          {[
            SiemMigrationTaskStatus.READY,
            SiemMigrationTaskStatus.INTERRUPTED,
            SiemMigrationTaskStatus.STOPPED,
          ].includes(migrationStats.status) && (
            <>
              <EuiSpacer size="m" />
              <MigrationReadyPanel migrationStats={migrationStats} />
            </>
          )}
        </>
      );
    }, [workflowMigrationsStats, migrationId]);

    return (
      <SecuritySolutionPageWrapper>
        <AppHeader title={i18n.PAGE_TITLE} menu={menu} docLink={docLink} spacing="bleed" />
        <MigrationSelectorRow
          migrationsStats={workflowMigrationsStats}
          selectedMigrationId={migrationId}
          onMigrationIdChange={onMigrationIdChange}
        />
        <EuiSkeletonLoading
          key={migrationId}
          data-test-subj="migrationWorkflowsPageLoading"
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
MigrationWorkflowsPage.displayName = 'MigrationWorkflowsPage';
