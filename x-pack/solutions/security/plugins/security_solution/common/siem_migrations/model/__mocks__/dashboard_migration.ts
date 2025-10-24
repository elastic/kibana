/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardMigrationDashboard } from '../dashboard_migration.gen';

export const getDashboardMigrationDashboardMock = (
  overrides?: Partial<DashboardMigrationDashboard>
): DashboardMigrationDashboard => {
  return {
    id: 'EfDKfJkBBI4hy8QbQ_BB',
    migration_id: '9bcd7ea8-f617-4dc4-ab4a-da323c0a18b2',
    original_dashboard: {
      id: 'https://test.elastic.com',
      title: 'Workload Management Admission Control',
      description: '',
      data: 'original test data',
      format: 'xml',
      vendor: 'splunk',
      last_updated: '1970-01-01T00:00:00+00:00',
      splunk_properties: {
        app: 'splunk_monitoring_console',
        owner: 'nobody',
        sharing: 'app',
      },
    },
    '@timestamp': '2025-09-24T17:34:14.336Z',
    status: 'completed',
    translation_result: 'partial',
    created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    updated_at: '2025-09-24T17:36:59.635Z',
    elastic_dashboard: {
      data: 'translated test data',
      description:
        'Provides an overview of distributed workload management admission control by tracking prefiltered searches across different categories.',
      title: 'Workload Management Admission Control',
    },
    comments: [
      {
        created_at: '2025-09-24T17:36:59.479Z',
        message: '# Panel "Total Searches Prefiltered (Last Hour)"',
        created_by: 'assistant',
      },
      {
        created_at: '2025-09-24T17:34:48.529Z',
        message:
          '## Inlining Summary\n\n**Original Query:**\n```splunk-spl\n`dmc_event_local_search_dispatch````',
        created_by: 'assistant',
      },
    ],
    ...overrides,
  };
};
