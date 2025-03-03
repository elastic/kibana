/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import {
  SiemMigrationStatus,
  SiemMigrationTaskStatus,
} from '../../../../../common/siem_migrations/constants';
import type { RuleMigrationTaskStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationFilters } from '../../../../../common/siem_migrations/types';
import type { RuleMigrationsDataClient } from '../data/rule_migrations_data_client';
import type { RuleMigrationDataStats } from '../data/rule_migrations_data_rules_client';
import type { SiemRuleMigrationsClientDependencies } from '../types';
import type {
  RuleMigrationTaskStartParams,
  RuleMigrationTaskStartResult,
  RuleMigrationTaskStopResult,
} from './types';
import { RuleMigrationTaskRunner } from './rule_migrations_task_runner';

export type MigrationsRunning = Map<string, RuleMigrationTaskRunner>;

export class RuleMigrationsTaskClient {
  constructor(
    private migrationsRunning: MigrationsRunning,
    private logger: Logger,
    private data: RuleMigrationsDataClient,
    private currentUser: AuthenticatedUser,
    private dependencies: SiemRuleMigrationsClientDependencies
  ) {}

  /** Starts a rule migration task */
  async start(params: RuleMigrationTaskStartParams): Promise<RuleMigrationTaskStartResult> {
    const { migrationId, connectorId, invocationConfig } = params;
    if (this.migrationsRunning.has(migrationId)) {
      return { exists: true, started: false };
    }
    // Just in case some previous execution was interrupted without cleaning up
    await this.data.rules.updateStatus(
      migrationId,
      { status: SiemMigrationStatus.PROCESSING },
      SiemMigrationStatus.PENDING,
      { refresh: true }
    );

    const { rules } = await this.data.rules.getStats(migrationId);
    if (rules.total === 0) {
      return { exists: false, started: false };
    }
    if (rules.pending === 0) {
      return { exists: true, started: false };
    }

    const migrationLogger = this.logger.get(migrationId);
    const abortController = new AbortController();
    const migrationTaskRunner = new RuleMigrationTaskRunner(
      migrationId,
      this.currentUser,
      abortController,
      this.data,
      migrationLogger,
      this.dependencies
    );

    await migrationTaskRunner.setup(connectorId);

    if (this.migrationsRunning.has(migrationId)) {
      // Just to prevent a race condition in the setup
      throw new Error('Task already running for this migration');
    }
    this.migrationsRunning.set(migrationId, migrationTaskRunner);

    migrationLogger.info('Starting migration');

    // run the migration in the background without awaiting and resolve the `start` promise
    migrationTaskRunner
      .run(invocationConfig)
      .catch((error) => {
        // no need to throw, the `start` promise is long gone. Just log the error
        migrationLogger.error('Error executing migration', error);
      })
      .finally(() => {
        this.migrationsRunning.delete(migrationId);
      });

    return { exists: true, started: true };
  }

  /** Updates all the rules in a migration to be re-executed */
  public async updateToRetry(
    migrationId: string,
    filter: RuleMigrationFilters
  ): Promise<{ updated: boolean }> {
    if (this.migrationsRunning.has(migrationId)) {
      // not update migrations that are currently running
      return { updated: false };
    }
    filter.installed = false; // only retry rules that are not installed
    await this.data.rules.updateStatus(migrationId, filter, SiemMigrationStatus.PENDING, {
      refresh: true,
    });
    return { updated: true };
  }

  /** Returns the stats of a migration */
  public async getStats(migrationId: string): Promise<RuleMigrationTaskStats> {
    const dataStats = await this.data.rules.getStats(migrationId);
    const status = this.getTaskStatus(migrationId, dataStats.rules);
    return { status, ...dataStats };
  }

  /** Returns the stats of all migrations */
  async getAllStats(): Promise<RuleMigrationTaskStats[]> {
    const allDataStats = await this.data.rules.getAllStats();
    return allDataStats.map((dataStats) => {
      const status = this.getTaskStatus(dataStats.id, dataStats.rules);
      return { status, ...dataStats };
    });
  }

  private getTaskStatus(
    migrationId: string,
    dataStats: RuleMigrationDataStats['rules']
  ): SiemMigrationTaskStatus {
    if (this.migrationsRunning.has(migrationId)) {
      return SiemMigrationTaskStatus.RUNNING;
    }
    if (dataStats.pending === dataStats.total) {
      return SiemMigrationTaskStatus.READY;
    }
    if (dataStats.completed + dataStats.failed === dataStats.total) {
      return SiemMigrationTaskStatus.FINISHED;
    }
    return SiemMigrationTaskStatus.STOPPED;
  }

  /** Stops one running migration */
  async stop(migrationId: string): Promise<RuleMigrationTaskStopResult> {
    try {
      const migrationRunning = this.migrationsRunning.get(migrationId);
      if (migrationRunning) {
        migrationRunning.abortController.abort();
        return { exists: true, stopped: true };
      }

      const { rules } = await this.data.rules.getStats(migrationId);
      if (rules.total > 0) {
        return { exists: true, stopped: true };
      }
      return { exists: false, stopped: true };
    } catch (err) {
      this.logger.error(`Error stopping migration ID:${migrationId}`, err);
      return { exists: true, stopped: false };
    }
  }
}
