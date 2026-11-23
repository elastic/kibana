/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  WorkflowMigration,
  WorkflowMigrationWorkflow,
} from '../../../../../common/siem_migrations/model/workflow_migration.gen';
import { SiemMigrationsTaskClient } from '../../common/task/siem_migrations_task_client';
import type {
  MigrateWorkflowConfigSchema,
  WorkflowMigrationTaskInput,
  WorkflowMigrationTaskOutput,
} from './agent/types';
import { WorkflowMigrationTaskRunner } from './workflow_migrations_task_runner';

export type WorkflowMigrationsRunning = Map<string, WorkflowMigrationTaskRunner>;

export class WorkflowMigrationsTaskClient extends SiemMigrationsTaskClient<
  WorkflowMigration,
  WorkflowMigrationWorkflow,
  WorkflowMigrationTaskInput,
  MigrateWorkflowConfigSchema,
  WorkflowMigrationTaskOutput
> {
  protected readonly TaskRunnerClass = WorkflowMigrationTaskRunner;
  protected readonly EvaluatorClass = undefined;
}
