/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RuleMigrationTaskCreateClientParams } from './types';
import { RuleMigrationsTaskClient, type MigrationsRunning } from './rule_migrations_task_client';

export class RuleMigrationsTaskService {
  private migrationsRunning: MigrationsRunning;

  constructor(private logger: Logger) {
    this.migrationsRunning = new Map();
  }

  public createClient({
    currentUser,
    dataClient,
    dependencies,
  }: RuleMigrationTaskCreateClientParams): RuleMigrationsTaskClient {
    return new RuleMigrationsTaskClient(
      this.migrationsRunning,
      this.logger,
      dataClient,
      currentUser,
      dependencies
    );
  }

  /** Stops all running migrations */
  stopAll() {
    this.migrationsRunning.forEach((migrationRunning) => {
      migrationRunning.abortController.abort('Server shutdown');
    });
    this.migrationsRunning.clear();
  }
}
