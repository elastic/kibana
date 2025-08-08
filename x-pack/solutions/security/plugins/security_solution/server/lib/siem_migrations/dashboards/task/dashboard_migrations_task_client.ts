/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunnableConfig } from '@langchain/core/runnables';
import type {
  DashboardMigration,
  DashboardMigrationDashboard,
} from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { DashboardMigrationTaskRunner } from './dashboard_migrations_task_runner';
import { SiemMigrationsTaskClient } from '../../common/task/siem_migrations_task_client';
import type { MigrateDashboardConfigSchema } from './agent/types';
import { DashboardMigrationTaskEvaluator } from './dashboard_migrations_task_evaluator';

export type DashboardMigrationsRunning = Map<string, DashboardMigrationTaskRunner>;
export class DashboardMigrationsTaskClient extends SiemMigrationsTaskClient<
  DashboardMigration,
  DashboardMigrationDashboard,
  MigrateDashboardConfigSchema
> {
  protected readonly TaskRunnerClass = DashboardMigrationTaskRunner;
  protected readonly EvaluatorClass = DashboardMigrationTaskEvaluator;

  // Dashboards specific last_execution config
  protected getLastExecutionConfig(
    invocationConfig: RunnableConfig<MigrateDashboardConfigSchema>
  ): Record<string, unknown> {
    return {
      skipPrebuiltDashboardsMatching:
        invocationConfig.configurable?.skipPrebuiltDashboardsMatching ?? false,
    };
  }
}
