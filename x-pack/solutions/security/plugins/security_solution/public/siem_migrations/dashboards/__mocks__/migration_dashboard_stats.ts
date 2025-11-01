/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import type { DashboardMigrationStats } from '../types';

export const getDashboardMigrationStatsMock = (
  overrides?: Partial<DashboardMigrationStats>
): DashboardMigrationStats => {
  return {
    id: '1',
    name: 'My Dashboard 1',
    status: SiemMigrationTaskStatus.FINISHED,
    created_at: '2025-01-01T00:00:00.000Z',
    last_updated_at: '2025-01-01T00:00:00.000Z',
    items: {
      total: 10,
      completed: 5,
      pending: 5,
      processing: 0,
      failed: 0,
    },
    ...overrides,
  };
};
