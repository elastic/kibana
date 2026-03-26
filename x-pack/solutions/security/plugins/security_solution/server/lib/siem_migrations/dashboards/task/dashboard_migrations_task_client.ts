/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DashboardMigration,
  DashboardMigrationDashboard,
} from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type {
  DashboardMigrationTaskInput,
  DashboardMigrationTaskOutput,
} from './dashboard_migrations_task_runner';
import { DashboardMigrationTaskRunner } from './dashboard_migrations_task_runner';
import { SiemMigrationsTaskClient } from '../../common/task/siem_migrations_task_client';
import type { MigrateDashboardConfigSchema } from './agent/types';
import { DashboardMigrationTaskEvaluator } from './dashboard_migrations_task_evaluator';

export type DashboardMigrationsRunning = Map<string, DashboardMigrationTaskRunner>;
export class DashboardMigrationsTaskClient extends SiemMigrationsTaskClient<
  DashboardMigration,
  DashboardMigrationDashboard,
  DashboardMigrationTaskInput,
  MigrateDashboardConfigSchema,
  DashboardMigrationTaskOutput
> {
  protected readonly TaskRunnerClass = DashboardMigrationTaskRunner;
  protected readonly EvaluatorClass = DashboardMigrationTaskEvaluator;
}
