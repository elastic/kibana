/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap, SchemaFieldMapKeys } from '@kbn/index-adapter';
import type { SiemMigrationResource } from '../../../../../common/siem_migrations/model/common.gen';
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
  original_dashboard: { type: 'object', required: true },
  'original_dashboard.id': { type: 'keyword', required: true },
  'original_dashboard.title': {
    type: 'text',
    required: true,
    fields: { keyword: { type: 'keyword' } },
  },
  'original_dashboard.data': { type: 'text', required: true },
  'original_dashboard.description': { type: 'text', required: false },
  'original_dashboard.format': { type: 'keyword', required: true },
  'original_dashboard.vendor': { type: 'keyword', required: true },
  'original_dashboard.last_updated': { type: 'date', required: true },
  'original_dashboard.splunk_properties': { type: 'object', required: true },
  'original_dashboard.splunk_properties.app': { type: 'keyword', required: true },
  'original_dashboard.splunk_properties.sharing': { type: 'keyword', required: true },
  'original_dashboard.splunk_properties.owner': { type: 'keyword', required: true },
};

export const dashboardMigrationResourcesFieldMap: FieldMap<
  SchemaFieldMapKeys<Omit<SiemMigrationResource, 'id'>>
> = {
  migration_id: { type: 'keyword', required: true },
  type: { type: 'keyword', required: true },
  name: { type: 'keyword', required: true },
  content: { type: 'text', required: false },
  metadata: { type: 'object', required: false },
  updated_at: { type: 'date', required: false },
  updated_by: { type: 'keyword', required: false },
};
