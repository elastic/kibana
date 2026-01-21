/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardMigrationDashboard } from '../../../../common/siem_migrations/model/dashboard_migration.gen';
import { SiemMigrationStatus } from '../../../../common/siem_migrations/constants';

export const migrationDashboards: DashboardMigrationDashboard[] = [
  {
    id: '1',
    status: SiemMigrationStatus.PENDING,
    '@timestamp': '2025-01-01T00:00:00Z',
    migration_id: 'mig-1',
    created_by: 'elastic',
    original_dashboard: {
      id: 'splunk-1',
      vendor: 'splunk',
      title: 'Installed Dashboard',
      description: 'My Splunk dashboard 1',
      data: '<dashboard></dashboard>',
      format: 'xml',
    },
  },
  {
    id: '2',
    status: SiemMigrationStatus.COMPLETED,
    '@timestamp': '2025-01-01T00:00:00Z',
    migration_id: 'mig-1',
    created_by: 'elastic',
    original_dashboard: {
      id: 'splunk-2',
      vendor: 'splunk',
      title: 'Uninstalled Dashboard',
      description: 'My Splunk dashboard 2',
      data: '<dashboard></dashboard>',
      format: 'xml',
    },
  },
];
