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
import type { StoredSiemMigration } from '../types';
import type {
  RuleMigrationTaskEvaluateParams,
  RuleMigrationTaskStartParams,
  RuleMigrationTaskStartResult,
  RuleMigrationTaskStopResult,
} from './types';
import { RuleMigrationTaskRunner } from './rule_migrations_task_runner';
import { RuleMigrationTaskEvaluator } from './rule_migrations_task_evaluator';
import type { SiemMigrationsClientDependencies } from '../../common/types';

export type MigrationsRunning = Map<string, RuleMigrationTaskRunner>;

export class RuleMigrationsTaskClient {
  constructor(
    private migrationsRunning: MigrationsRunning,
    private logger: Logger,
    private data: RuleMigrationsDataClient,
    private currentUser: AuthenticatedUser,
    private dependencies: SiemMigrationsClientDependencies
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

    migrationLogger.info('Starting migration');

    this.migrationsRunning.set(migrationId, migrationTaskRunner);

    await this.data.migrations.saveAsStarted({
      id: migrationId,
      connectorId,
      skipPrebuiltRulesMatching: invocationConfig.configurable?.skipPrebuiltRulesMatching,
    });

    // run the migration in the background without awaiting and resolve the `start` promise
    migrationTaskRunner
      .run(invocationConfig)
      .then(() => {
        // The task runner has finished normally. Abort errors are also handled here, it's an expected finish scenario, nothing special should be done.
        migrationLogger.debug('Migration execution task finished');
        this.data.migrations.saveAsFinished({ id: migrationId }).catch((error) => {
          migrationLogger.error(`Error saving migration as finished: ${error}`);
        });
      })
      .catch((error) => {
        // Unexpected errors, no use in throwing them since the `start` promise is long gone. Just log and store the error message
        migrationLogger.error(`Error executing migration task: ${error}`);
        this.data.migrations
          .saveAsFailed({ id: migrationId, error: error.message })
          .catch((saveError) => {
            migrationLogger.error(`Error saving migration as failed: ${saveError}`);
          });
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
    const migration = await this.data.migrations.get({ id: migrationId });
    if (!migration) {
      throw new Error(`Migration with ID ${migrationId} not found`);
    }
    const dataStats = await this.data.rules.getStats(migrationId);
    const taskStats = this.getTaskStats(migration, dataStats.rules);
    return { ...taskStats, ...dataStats, name: migration.name };
  }

  /** Returns the stats of all migrations */
  async getAllStats(): Promise<RuleMigrationTaskStats[]> {
    const allDataStats = await this.data.rules.getAllStats();
    const allMigrations = await this.data.migrations.getAll();
    const allMigrationsMap = new Map<string, StoredSiemMigration>(
      allMigrations.map((migration) => [migration.id, migration])
    );

    const allStats: RuleMigrationTaskStats[] = [];

    for (const dataStats of allDataStats) {
      const migration = allMigrationsMap.get(dataStats.id);
      if (migration) {
        const tasksStats = this.getTaskStats(migration, dataStats.rules);
        allStats.push({ ...tasksStats, ...dataStats, name: migration.name });
      }
    }
    return allStats;
  }

  private getTaskStats(
    migration: StoredSiemMigration,
    dataStats: RuleMigrationDataStats['rules']
  ): Pick<RuleMigrationTaskStats, 'status' | 'last_execution'> {
    return {
      status: this.getTaskStatus(migration, dataStats),
      last_execution: migration.last_execution,
    };
  }

  private getTaskStatus(
    migration: StoredSiemMigration,
    dataStats: RuleMigrationDataStats['rules']
  ): SiemMigrationTaskStatus {
    const { id: migrationId, last_execution: lastExecution } = migration;
    if (this.migrationsRunning.has(migrationId)) {
      return SiemMigrationTaskStatus.RUNNING;
    }
    if (dataStats.completed + dataStats.failed === dataStats.total) {
      return SiemMigrationTaskStatus.FINISHED;
    }
    if (lastExecution?.is_stopped) {
      return SiemMigrationTaskStatus.STOPPED;
    }
    if (dataStats.pending === dataStats.total) {
      return SiemMigrationTaskStatus.READY;
    }
    return SiemMigrationTaskStatus.INTERRUPTED;
  }

  /** Stops one running migration */
  async stop(migrationId: string): Promise<RuleMigrationTaskStopResult> {
    try {
      const migrationRunning = this.migrationsRunning.get(migrationId);
      if (migrationRunning) {
        migrationRunning.abortController.abort('Stopped by user');
        await this.data.migrations.setIsStopped({ id: migrationId });
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

  /** Creates a new evaluator for the rule migration task */
  async evaluate(params: RuleMigrationTaskEvaluateParams): Promise<void> {
    const { evaluationId, langsmithOptions, connectorId, invocationConfig, abortController } =
      params;

    const migrationLogger = this.logger.get('evaluate');

    const migrationTaskEvaluator = new RuleMigrationTaskEvaluator(
      evaluationId,
      this.currentUser,
      abortController,
      this.data,
      migrationLogger,
      this.dependencies
    );

    await migrationTaskEvaluator.evaluate({
      connectorId,
      langsmithOptions,
      invocationConfig,
    });
  }

  /** Returns if a migration is running or not */
  isMigrationRunning(migrationId: string): boolean {
    return this.migrationsRunning.has(migrationId);
  }
}
