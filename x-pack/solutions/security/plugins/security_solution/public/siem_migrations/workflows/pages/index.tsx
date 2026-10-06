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
import { EmptyMigrationWorkflowsPage } from './empty';
import * as i18n from './translations';
import { useLatestStats } from '../service/hooks/use_latest_stats';
import { WorkflowMigrationTable } from '../components/workflow_table';
import { useInvalidateGetMigrationWorkflows } from '../logic/use_get_migration_workflows';
import { PageTitle } from '../../common/components/page_title';
import { MigrationProgressPanel } from '../../common/components/migration_panels/migration_progress_panel';
import { MigrationReadyPanel } from '../components/migration_status_panels/migration_ready_panel';
import { WorkflowMigrationDataInputWrapper } from '../components/data_input_flyout/wrapper';

export type MigrationWorkflowsPageProps = RouteComponentProps<{ migrationId?: string }>;

export const MigrationWorkflowsPage: React.FC<MigrationWorkflowsPageProps> = React.memo(
  ({
    match: {
      params: { migrationId },
    },
  }) => {
    const { navigateTo } = useNavigation();
    const { data, isLoading, refreshStats } = useLatestStats();
    const workflowMigrationsStats = useMemo(() => data.slice().reverse(), [data]);

    useEffect(() => {
      if (isLoading || workflowMigrationsStats.length === 0) {
        return;
      }

      if (!migrationId) {
        navigateTo({
          deepLinkId: SecurityPageName.siemMigrationsWorkflows,
          path: workflowMigrationsStats[0].id,
        });
      }
    }, [isLoading, migrationId, navigateTo, workflowMigrationsStats]);

    const onMigrationIdChange = (selectedId?: string) => {
      navigateTo({ deepLinkId: SecurityPageName.siemMigrationsWorkflows, path: selectedId });
    };

    const invalidateGetMigrationWorkflows = useInvalidateGetMigrationWorkflows();
    const refetchData = useCallback(() => {
      if (!migrationId) {
        return;
      }
      refreshStats();
      invalidateGetMigrationWorkflows(migrationId);
    }, [invalidateGetMigrationWorkflows, migrationId, refreshStats]);

    const content = useMemo(() => {
      if (workflowMigrationsStats.length === 0 && !migrationId) {
        return <EmptyMigrationWorkflowsPage />;
      }
      const migrationStats = workflowMigrationsStats.find((stats) => stats.id === migrationId);
      if (!migrationId || !migrationStats) {
        return <UnknownMigration />;
      }

      return (
        <WorkflowMigrationDataInputWrapper onFlyoutClosed={refetchData}>
          <>
            {migrationStats.status === SiemMigrationTaskStatus.RUNNING && (
              <MigrationProgressPanel migrationStats={migrationStats} migrationType="workflow" />
            )}
            {migrationStats.status === SiemMigrationTaskStatus.FINISHED && (
              <>
                <EuiSpacer size="m" />
                <WorkflowMigrationTable
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
        </WorkflowMigrationDataInputWrapper>
      );
    }, [workflowMigrationsStats, migrationId, refetchData]);

    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage title={<PageTitle title={i18n.PAGE_TITLE} isBeta />} border>
          <HeaderButtons
            migrationType="workflow"
            migrationsStats={workflowMigrationsStats}
            selectedMigrationId={migrationId}
            onMigrationIdChange={onMigrationIdChange}
          />
        </HeaderPage>
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
