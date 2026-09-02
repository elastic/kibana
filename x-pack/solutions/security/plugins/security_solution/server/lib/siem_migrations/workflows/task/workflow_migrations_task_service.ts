/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowMigrationTaskCreateClientParams } from './types';
import {
  WorkflowMigrationsTaskClient,
  type WorkflowMigrationsRunning,
} from './workflow_migrations_task_client';

export class WorkflowMigrationsTaskService {
  private migrationsRunning: WorkflowMigrationsRunning;

  constructor(private logger: Logger) {
    this.migrationsRunning = new Map();
  }

  public createClient({
    request,
    currentUser,
    dataClient,
    dependencies,
  }: WorkflowMigrationTaskCreateClientParams): WorkflowMigrationsTaskClient {
    return new WorkflowMigrationsTaskClient(
      this.migrationsRunning,
      this.logger,
      dataClient,
      request,
      currentUser,
      dependencies
    );
  }

  stopAll() {
    this.migrationsRunning.forEach((migrationRunning) => {
      migrationRunning.abortController.abort('Server shutdown');
    });
    this.migrationsRunning.clear();
  }
}
