/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardMigrationTaskStats } from '../../../common/siem_migrations/model/dashboard_migration.gen';
import type { SiemMigrationTaskStatus } from '../../../common/siem_migrations/constants';

export interface DashboardMigrationStats extends DashboardMigrationTaskStats {
  status: SiemMigrationTaskStatus; // use the native enum instead of the zod enum from the model
}

// TODO: Remove this type once Translation Stats endpoint and types are implemented
export interface MigrationTranslationStats {
  id: string;
  dashboards: {
    total: number;
    success: {
      total: number;
      result: {
        full: number;
        partial: number;
        untranslatable: number;
      };
      installable: number;
    };
    failed: number;
  };
}
