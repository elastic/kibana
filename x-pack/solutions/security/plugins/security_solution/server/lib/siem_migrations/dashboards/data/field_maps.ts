/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap, SchemaFieldMapKeys } from '@kbn/index-adapter';
import type {
  DashboardMigration,
  DashboardMigrationDashboardData,
} from '../../../../../common/siem_migrations/model/dashboard_migration.gen';

export const dashboardMigrationsFieldMap: FieldMap<
  SchemaFieldMapKeys<Omit<DashboardMigration, 'id' | 'last_execution'>>
> = {
  name: { type: 'keyword', required: true },
  created_at: { type: 'date', required: true },
  created_by: { type: 'keyword', required: true },
};

export const dashboardMigrationsDashboardsFieldMap: FieldMap<
  SchemaFieldMapKeys<DashboardMigrationDashboardData>
> = {
  '@timestamp': { type: 'date', required: false },
  migration_id: { type: 'keyword', required: true },
  created_by: { type: 'keyword', required: true },
  status: { type: 'keyword', required: true },
  updated_at: { type: 'date', required: true },
  updated_by: { type: 'keyword', required: true },
  raw: { type: 'object', required: true },
  'raw.id': { type: 'keyword', required: true },
  'raw.title': { type: 'text', required: true, fields: { keyword: { type: 'keyword' } } },
  'raw.label': { type: 'text', required: true, fields: { keyword: { type: 'keyword' } } },
  'raw.xml': { type: 'text', required: true },
  'raw.app': { type: 'keyword', required: true },
  'raw.sharing': { type: 'keyword', required: true },
  'raw.owner': { type: 'keyword', required: true },
  'raw.updated': { type: 'date', required: true },
};
