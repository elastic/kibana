/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIEM_DASHBOARD_MIGRATION_STATS_PATH } from '@kbn/security-solution-plugin/common/siem_migrations/dashboards/constants';
import type { GetDashboardMigrationStatsResponse } from '@kbn/security-solution-plugin/common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { rootRequest } from './common';
import { deleteAllDocuments } from './elasticsearch';

const MIGRATION_INDEX_PREFIX = '.kibana-siem-rule-migrations';
const DASHBOARDS_MIGRATION_INDEX_PREFIX = '.kibana-siem-dashboard-migrations';

export const cleanMigrationData = () => {
  cy.currentSpace().then((spaceId = 'default') => {
    const migrationIndices = [
      `${MIGRATION_INDEX_PREFIX}-rules-${spaceId}`,
      `${MIGRATION_INDEX_PREFIX}-migrations-${spaceId}`,
    ];

    deleteAllDocuments(migrationIndices.join(','));
  });
};

export const cleanDashboardsMigrationData = () => {
  cy.currentSpace().then((spaceId = 'default') => {
    const migrationIndices = [
      `${DASHBOARDS_MIGRATION_INDEX_PREFIX}-dashboards-${spaceId}`,
      `${DASHBOARDS_MIGRATION_INDEX_PREFIX}-migrations-${spaceId}`,
    ];

    deleteAllDocuments(migrationIndices.join(','));
  });
};

export const getDashboardMigrationStats = (migrationId: string) =>
  rootRequest<GetDashboardMigrationStatsResponse>({
    method: 'GET',
    url: SIEM_DASHBOARD_MIGRATION_STATS_PATH.replace('{migration_id}', migrationId),
    headers: {
      'elastic-api-version': '1',
    },
  });

/**
 * Waits until the dashboard migration's current execution has finished, as recorded by `last_execution.finished_at`.
 */
export const waitForDashboardMigrationExecutionToFinish = (migrationId: string) => {
  cy.waitUntil(() =>
    getDashboardMigrationStats(migrationId).then(({ body }) =>
      Boolean(body.last_execution?.finished_at)
    )
  );
};
