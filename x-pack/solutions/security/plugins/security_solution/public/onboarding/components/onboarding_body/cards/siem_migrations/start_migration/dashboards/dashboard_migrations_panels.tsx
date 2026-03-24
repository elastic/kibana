/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { SiemMigrationTaskStatus } from '../../../../../../../../common/siem_migrations/constants';
import type { DashboardMigrationStats } from '../../../../../../../siem_migrations/dashboards/types';
import { UploadDashboardsPanel } from '../../../../../../../siem_migrations/dashboards/components/status_panels/upload_panel';
import { MigrationReadyPanel } from '../../../../../../../siem_migrations/dashboards/components/migration_status_panels/migration_ready_panel';
import { MigrationProgressPanel } from '../../../../../../../siem_migrations/common/components';
import { DashboardMigrationResultPanel } from '../../../../../../../siem_migrations/dashboards/components/migration_status_panels/migration_result_panel';
import { MissingAIConnectorCallout } from '../common/missing_ai_connector_callout';

export interface DashboardMigrationsPanelsProps {
  migrationsStats: DashboardMigrationStats[];
  isConnectorsCardComplete: boolean;
  expandConnectorsCard: () => void;
}
export const DashboardMigrationsPanels = React.memo<DashboardMigrationsPanelsProps>(
  ({ migrationsStats, isConnectorsCardComplete, expandConnectorsCard }) => {
    const latestMigrationsStats = useMemo(
      () => migrationsStats.slice().reverse(),
      [migrationsStats]
    );

    const [expandedCardId, setExpandedCardId] = useState<string | undefined>(() => {
      if (latestMigrationsStats[0]?.status === SiemMigrationTaskStatus.FINISHED) {
        return latestMigrationsStats[0]?.id;
      }
      return undefined;
    });

    useEffect(() => {
      if (!expandedCardId && latestMigrationsStats.length > 0) {
        const runningMigration = latestMigrationsStats.find(
          ({ status }) => status === SiemMigrationTaskStatus.RUNNING
        );
        if (runningMigration) {
          setExpandedCardId(runningMigration.id); // Set the next migration to be expanded when it finishes
        }
      }
    }, [latestMigrationsStats, expandedCardId]);

    const getOnToggleCollapsed = useCallback(
      (id: string) => (isCollapsed: boolean) => {
        setExpandedCardId(isCollapsed ? undefined : id);
      },
      []
    );
    return (
      <EuiFlexGroup data-test-subj="dashboardMigrationPanelGroup" direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          {!isConnectorsCardComplete && (
            <>
              <MissingAIConnectorCallout onExpandAiConnectorsCard={expandConnectorsCard} />
              <EuiSpacer size="s" />
            </>
          )}
          <UploadDashboardsPanel
            isUploadMore={latestMigrationsStats.length > 0}
            isDisabled={!isConnectorsCardComplete}
          />
        </EuiFlexItem>

        {latestMigrationsStats.map((migrationStats) => (
          <EuiFlexItem
            data-test-subj={`migration-${migrationStats.id}`}
            grow={false}
            key={migrationStats.id}
          >
            {[
              SiemMigrationTaskStatus.READY,
              SiemMigrationTaskStatus.INTERRUPTED,
              SiemMigrationTaskStatus.STOPPED,
            ].includes(migrationStats.status) && (
              <MigrationReadyPanel migrationStats={migrationStats} />
            )}
            {migrationStats.status === SiemMigrationTaskStatus.RUNNING && (
              <MigrationProgressPanel migrationStats={migrationStats} migrationType="dashboard" />
            )}
            {migrationStats.status === SiemMigrationTaskStatus.FINISHED && (
              <DashboardMigrationResultPanel
                migrationStats={migrationStats}
                isCollapsed={migrationStats.id !== expandedCardId}
                onToggleCollapsed={getOnToggleCollapsed(migrationStats.id)}
              />
            )}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }
);
DashboardMigrationsPanels.displayName = 'DashboardMigrationsPanels';
