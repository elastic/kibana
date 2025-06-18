/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';
import type { RuleMigrationStats } from '../../../../../../siem_migrations/rules/types';
import { UploadRulesPanel } from './upload_rules_panel';
import { MigrationProgressPanel } from '../../../../../../siem_migrations/rules/components/migration_status_panels/migration_progress_panel';
import { MigrationResultPanel } from '../../../../../../siem_migrations/rules/components/migration_status_panels/migration_result_panel';
import { MigrationReadyPanel } from '../../../../../../siem_migrations/rules/components/migration_status_panels/migration_ready_panel';
import { MissingAIConnectorCallout } from './missing_ai_connector_callout';

export interface RuleMigrationsPanelsProps {
  migrationsStats: RuleMigrationStats[];
  isConnectorsCardComplete: boolean;
  expandConnectorsCard: () => void;
}
export const RuleMigrationsPanels = React.memo<RuleMigrationsPanelsProps>(
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
      <EuiFlexGroup data-test-subj="ruleMigrationPanelGroup" direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          {!isConnectorsCardComplete && (
            <>
              <MissingAIConnectorCallout onExpandAiConnectorsCard={expandConnectorsCard} />
              <EuiSpacer size="s" />
            </>
          )}
          <UploadRulesPanel
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
              <MigrationProgressPanel migrationStats={migrationStats} />
            )}
            {migrationStats.status === SiemMigrationTaskStatus.FINISHED && (
              <MigrationResultPanel
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
RuleMigrationsPanels.displayName = 'RuleMigrationsPanels';
