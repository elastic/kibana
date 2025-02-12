/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import { AbortError, abortSignalToPromise } from '@kbn/kibana-utils-plugin/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import { TELEMETRY_SIEM_MIGRATION_ID } from './util/constants';
import { EsqlKnowledgeBase } from './util/esql_knowledge_base';
import {
  SiemMigrationStatus,
  SiemMigrationTaskStatus,
} from '../../../../../common/siem_migrations/constants';
import type { RuleMigrationTaskStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationFilters } from '../../../../../common/siem_migrations/types';
import type { RuleMigrationsDataClient } from '../data/rule_migrations_data_client';
import type { RuleMigrationDataStats } from '../data/rule_migrations_data_rules_client';
import type { SiemRuleMigrationsClientDependencies } from '../types';
import { getRuleMigrationAgent } from './agent';
import type { MigrateRuleState } from './agent/types';
import { RuleMigrationsRetriever } from './retrievers';
import { SiemMigrationTelemetryClient } from './rule_migrations_telemetry_client';
import type {
  MigrationAgent,
  RuleMigrationTaskCreateAgentParams,
  RuleMigrationTaskRunParams,
  RuleMigrationTaskStartParams,
  RuleMigrationTaskStartResult,
  RuleMigrationTaskStopResult,
} from './types';
import type { ChatModel } from './util/actions_client_chat';
import { ActionsClientChat } from './util/actions_client_chat';
import { generateAssistantComment } from './util/comments';

const ITERATION_BATCH_SIZE = 15 as const;
const ITERATION_SLEEP_SECONDS = 10 as const;

type MigrationsRunning = Map<string, { user: string; abortController: AbortController }>;

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
    const { migrationId, connectorId } = params;
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
    const abortController = new AbortController();
    const model = await this.createModel(connectorId, migrationId, abortController);

    // run the migration without awaiting it to execute it in the background
    this.run({ ...params, model, abortController }).catch((error) => {
      this.logger.error(`Error executing migration ID:${migrationId} with error ${error}`);
    });

    return { exists: true, started: true };
  }

  private async run(params: RuleMigrationTaskRunParams): Promise<void> {
    const { migrationId, invocationConfig, abortController, model } = params;
    if (this.migrationsRunning.has(migrationId)) {
      // This should never happen, but just in case
      throw new Error(`Task already running for migration ID:${migrationId} `);
    }
    this.logger.info(`Starting migration ID:${migrationId}`);

    this.migrationsRunning.set(migrationId, { user: this.currentUser.username, abortController });

    const abortPromise = abortSignalToPromise(abortController.signal);
    const withAbortRace = async <T>(task: Promise<T>) => Promise.race([task, abortPromise.promise]);

    const sleep = async (seconds: number) => {
      this.logger.debug(`Sleeping ${seconds}s for migration ID:${migrationId}`);
      await withAbortRace(new Promise((resolve) => setTimeout(resolve, seconds * 1000)));
    };

    const stats = { completed: 0, failed: 0 };
    const telemetryClient = new SiemMigrationTelemetryClient(
      this.dependencies.telemetry,
      this.logger,
      migrationId,
      model.model
    );
    const endSiemMigration = telemetryClient.startSiemMigration();
    try {
      this.logger.debug(`Creating agent for migration ID:${migrationId}`);

      const agent = await withAbortRace(this.createAgent({ ...params, model, telemetryClient }));

      const config: RunnableConfig = {
        ...invocationConfig,
        // signal: abortController.signal, // not working properly https://github.com/langchain-ai/langgraphjs/issues/319
      };
      let isDone: boolean = false;
      do {
        const ruleMigrations = await this.data.rules.takePending(migrationId, ITERATION_BATCH_SIZE);
        this.logger.debug(
          `Processing ${ruleMigrations.length} rules for migration ID:${migrationId}`
        );

        await Promise.all(
          ruleMigrations.map(async (ruleMigration) => {
            this.logger.debug(`Starting migration of rule "${ruleMigration.original_rule.title}"`);
            if (ruleMigration.elastic_rule?.id) {
              await this.data.rules.saveCompleted(ruleMigration);
              return; // skip already installed rules
            }
            const endRuleTranslation = telemetryClient.startRuleTranslation();
            try {
              const invocationData = {
                original_rule: ruleMigration.original_rule,
              };

              // using withAbortRace is a workaround for the issue with the langGraph signal not working properly
              const migrationResult = await withAbortRace<MigrateRuleState>(
                agent.invoke(invocationData, config)
              );

              this.logger.debug(
                `Migration of rule "${ruleMigration.original_rule.title}" finished`
              );
              endRuleTranslation({ migrationResult });
              await this.data.rules.saveCompleted({
                ...ruleMigration,
                elastic_rule: migrationResult.elastic_rule,
                translation_result: migrationResult.translation_result,
                comments: migrationResult.comments,
              });
              stats.completed++;
            } catch (error) {
              stats.failed++;
              if (error instanceof AbortError) {
                throw error;
              }
              endRuleTranslation({ error });
              this.logger.error(
                `Error migrating rule "${ruleMigration.original_rule.title} with error: ${error.message}"`
              );
              await this.data.rules.saveError({
                ...ruleMigration,
                comments: [generateAssistantComment(`Error migrating rule: ${error.message}`)],
              });
            }
          })
        );

        this.logger.debug(`Batch processed successfully for migration ID:${migrationId}`);

        const { rules } = await this.data.rules.getStats(migrationId);
        isDone = rules.pending === 0;
        if (!isDone) {
          await sleep(ITERATION_SLEEP_SECONDS);
        }
      } while (!isDone);

      this.logger.info(`Finished migration ID:${migrationId}`);

      endSiemMigration({ stats });
    } catch (error) {
      await this.data.rules.releaseProcessing(migrationId);

      if (error instanceof AbortError) {
        this.logger.info(`Abort signal received, stopping migration ID:${migrationId}`);
        return;
      } else {
        endSiemMigration({ error, stats });
        this.logger.error(`Error processing migration ID:${migrationId} ${error}`);
      }
    } finally {
      this.migrationsRunning.delete(migrationId);
      abortPromise.cleanup();
    }
  }

  private async createAgent({
    connectorId,
    migrationId,
    model,
    telemetryClient,
  }: RuleMigrationTaskCreateAgentParams): Promise<MigrationAgent> {
    const { inferenceClient, rulesClient, savedObjectsClient } = this.dependencies;
    const esqlKnowledgeBase = new EsqlKnowledgeBase(
      connectorId,
      migrationId,
      inferenceClient,
      this.logger
    );
    const ruleMigrationsRetriever = new RuleMigrationsRetriever(migrationId, {
      data: this.data,
      rules: rulesClient,
      savedObjects: savedObjectsClient,
    });

    await ruleMigrationsRetriever.initialize();

    return getRuleMigrationAgent({
      model,
      esqlKnowledgeBase,
      ruleMigrationsRetriever,
      telemetryClient,
      logger: this.logger,
    });
  }

  /** Updates all the rules in a migration to be re-executed */
  public async updateToRetry(
    migrationId: string,
    filter: RuleMigrationFilters
  ): Promise<{ updated: boolean }> {
    if (this.migrationsRunning.has(migrationId)) {
      return { updated: false };
    }

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
        return { exists: true, stopped: false };
      }
      return { exists: false, stopped: false };
    } catch (err) {
      this.logger.error(`Error stopping migration ID:${migrationId}`, err);
      return { exists: true, stopped: false };
    }
  }

  private async createModel(
    connectorId: string,
    migrationId: string,
    abortController: AbortController
  ): Promise<ChatModel> {
    const { actionsClient } = this.dependencies;
    const actionsClientChat = new ActionsClientChat(connectorId, actionsClient, this.logger);
    const model = await actionsClientChat.createModel({
      telemetryMetadata: { pluginId: TELEMETRY_SIEM_MIGRATION_ID, aggregateBy: migrationId },
      maxRetries: 10,
      signal: abortController.signal,
      temperature: 0.05,
    });
    return model;
  }
}
