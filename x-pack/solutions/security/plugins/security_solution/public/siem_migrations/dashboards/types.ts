/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardMigrationTaskStats } from '../../../common/siem_migrations/model/dashboard_migration.gen';
import type { SiemMigrationTaskStatus } from '../../../common/siem_migrations/constants';
import type { MigrationSource } from '../common/types';

export interface DashboardMigrationStats extends DashboardMigrationTaskStats {
  status: SiemMigrationTaskStatus; // use the native enum instead of the zod enum from the model
  vendor: MigrationSource;
}
