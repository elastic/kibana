/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { DashboardMigrationDashboard } from '@kbn/security-solution-plugin/common/siem_migrations/model/dashboard_migration.gen';
import { INDEX_PATTERN as SIEM_MIGRATIONS_DASHBOARDS_BASE_INDEX_PATTERN } from '@kbn/security-solution-plugin/server/lib/siem_migrations/dashboards/data/dashboard_migrations_data_service';

const MIGRATIONS_INDEX_PATTERN = `${SIEM_MIGRATIONS_DASHBOARDS_BASE_INDEX_PATTERN}-migrations-default`;
const DASHBOARDS_INDEX_PATTERN = `${SIEM_MIGRATIONS_DASHBOARDS_BASE_INDEX_PATTERN}-dashboards-default`;

export const getDashboardMigrationsFromES = async ({
  es,
  migrationId,
}: {
  es: Client;
  migrationId: string;
}) => {
  return await es.search({
    index: MIGRATIONS_INDEX_PATTERN,
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
    index: DASHBOARDS_INDEX_PATTERN,
    size: 10000,
    query: {
      term: {
        migration_id: migrationId,
      },
    },
  });
};

export const deleteAllDashboardMigrations = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: [MIGRATIONS_INDEX_PATTERN],
    query: {
      match_all: {},
    },
    ignore_unavailable: true,
    refresh: true,
  });

  await es.deleteByQuery({
    index: [DASHBOARDS_INDEX_PATTERN],
    query: {
      match_all: {},
    },
    ignore_unavailable: true,
    refresh: true,
  });
};
