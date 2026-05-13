/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MigrationTaskStats } from '../../../../../common/siem_migrations/model/common.gen';

export const getMigrationsStatsMock = (): MigrationTaskStats[] => {
  return [
    {
      name: 'Migration 1',
      status: 'finished',
      last_execution: {
        is_stopped: false,
        finished_at: '2025-10-01T13:50:09.708Z',
        connector_id: 'gpt-4-1',
        started_at: '2025-10-01T13:44:29.732Z',
        error: null,
        total_execution_time_ms: 339976,
      },
      vendor: 'splunk',
      id: '1',
      items: {
        total: 7,
        pending: 0,
        processing: 0,
        completed: 4,
        failed: 3,
      },
      created_at: '2025-10-01T13:44:13.019Z',
      last_updated_at: '2025-10-01T13:50:09.140Z',
    },
    {
      name: 'Migration 2',
      status: 'running',
      last_execution: {
        is_stopped: false,
        finished_at: null,
        connector_id: 'sonnet-4-5',
        started_at: '2025-10-01T13:45:41.072Z',
        error: null,
      },
      id: '2',
      items: {
        total: 13,
        pending: 13,
        processing: 0,
        completed: 0,
        failed: 0,
      },
      vendor: 'qradar',
      created_at: '2025-10-01T13:45:05.216Z',
      last_updated_at: '2025-10-01T13:45:05.216Z',
    },
  ];
};
