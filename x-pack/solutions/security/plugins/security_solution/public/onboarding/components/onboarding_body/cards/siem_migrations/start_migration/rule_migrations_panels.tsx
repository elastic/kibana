/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
    if (migrationsStats.length === 0) {
      return isConnectorsCardComplete ? (
        <UploadRulesPanel />
      ) : (
        <MissingAIConnectorCallout onExpandAiConnectorsCard={expandConnectorsCard} />
      );
    }

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          {isConnectorsCardComplete ? (
            <UploadRulesPanel isUploadMore />
          ) : (
            <MissingAIConnectorCallout onExpandAiConnectorsCard={expandConnectorsCard} />
          )}
        </EuiFlexItem>
        {migrationsStats.map((migrationStats) => (
          <EuiFlexItem grow={false} key={migrationStats.id}>
            {migrationStats.status === SiemMigrationTaskStatus.READY && (
              <MigrationReadyPanel migrationStats={migrationStats} />
            )}
            {migrationStats.status === SiemMigrationTaskStatus.RUNNING && (
              <MigrationProgressPanel migrationStats={migrationStats} />
            )}
            {migrationStats.status === SiemMigrationTaskStatus.FINISHED && (
              <MigrationResultPanel migrationStats={migrationStats} />
            )}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }
);
RuleMigrationsPanels.displayName = 'RuleMigrationsPanels';
