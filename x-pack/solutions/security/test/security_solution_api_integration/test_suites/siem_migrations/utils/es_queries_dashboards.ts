/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type {
  DashboardMigrationDashboard,
  DashboardMigrationDashboardData,
} from '@kbn/security-solution-plugin/common/siem_migrations/model/dashboard_migration.gen';
import { getDefaultDashboardMigrationDoc } from './dashboard_mocks';

const SIEM_MIGRATIONS_DASHBOARDS_BASE_INDEX_PATTERN = `.kibana-siem-dashboard-migrations`;
export const DASHBOARD_MIGRATIONS_MIGRATIONS_INDEX_PATTERN = `${SIEM_MIGRATIONS_DASHBOARDS_BASE_INDEX_PATTERN}-migrations-default`;
export const DASHBOARD_MIGRATIONS_DASHBOARDS_INDEX_PATTERN = `${SIEM_MIGRATIONS_DASHBOARDS_BASE_INDEX_PATTERN}-dashboards-default`;
export const DASHBOARD_MIGRATIONS_RESOURCES_INDEX_PATTERN = `${SIEM_MIGRATIONS_DASHBOARDS_BASE_INDEX_PATTERN}-resources-default`;

export const getDashboardMigrationsFromES = async ({
  es,
  migrationId,
}: {
  es: Client;
  migrationId: string;
}) => {
  return await es.search({
    index: DASHBOARD_MIGRATIONS_MIGRATIONS_INDEX_PATTERN,
    query: {
      terms: {
        _id: [migrationId],
      },
    },
  });
};

export const getDashboardsPerMigrationFromES = async ({
  es,
  migrationId,
}: {
  es: Client;
  migrationId: string;
}) => {
  return await es.search<DashboardMigrationDashboard>({
    index: DASHBOARD_MIGRATIONS_DASHBOARDS_INDEX_PATTERN,
    size: 10000,
    query: {
      term: {
        migration_id: migrationId,
      },
    },
  });
};

export const getDashboardResourcesPerMigrationFromES = async ({
  es,
  migrationId,
}: {
  es: Client;
  migrationId: string;
}) => {
  return await es.search({
    index: DASHBOARD_MIGRATIONS_RESOURCES_INDEX_PATTERN,
    size: 10000,
    query: {
      term: {
        migration_id: migrationId,
      },
    },
  });
};

export const deleteAllLookupIndices = async (es: Client): Promise<void> => {
  const indicesResponse = await es.indices.get({ index: 'lookup_*' });
  if (Object.keys(indicesResponse).length === 0) {
    return;
  }

  for (const indexName of Object.keys(indicesResponse)) {
    await es.indices.delete({ index: indexName });
  }
};

export const deleteAllDashboardMigrations = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: [
      DASHBOARD_MIGRATIONS_MIGRATIONS_INDEX_PATTERN,
      DASHBOARD_MIGRATIONS_DASHBOARDS_INDEX_PATTERN,
      DASHBOARD_MIGRATIONS_RESOURCES_INDEX_PATTERN,
    ],
    query: {
      match_all: {},
    },
    conflicts: 'proceed',
    ignore_unavailable: true,
    refresh: true,
  });
};

export const indexMigrationDashboards = async (
  es: Client,
  dashboards: DashboardMigrationDashboardData[]
): Promise<string[]> => {
  const createdAt = new Date().toISOString();
  const addDashboardOperations = dashboards.flatMap((ruleMigration) => [
    { create: { _index: DASHBOARD_MIGRATIONS_DASHBOARDS_INDEX_PATTERN } },
    {
      ...ruleMigration,
      '@timestamp': createdAt,
      updated_at: createdAt,
    },
  ]);

  const migrationIdsToBeCreated = new Set(dashboards.map((rule) => rule.migration_id));
  const createMigrationOperations = Array.from(migrationIdsToBeCreated).flatMap((migrationId) => [
    { create: { _index: DASHBOARD_MIGRATIONS_MIGRATIONS_INDEX_PATTERN, _id: migrationId } },
    {
      ...getDefaultDashboardMigrationDoc(),
    },
  ]);

  const res = await es.bulk({
    refresh: 'wait_for',
    operations: [...createMigrationOperations, ...addDashboardOperations],
  });

  const ids = res.items.reduce((acc, item) => {
    if (item.create?._id && item.create._index === DASHBOARD_MIGRATIONS_DASHBOARDS_INDEX_PATTERN) {
      acc.push(item.create._id);
    }
    return acc;
  }, [] as string[]);

  return ids;
};
