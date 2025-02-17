/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import type { Logger } from '@kbn/core/server';
import { abortSignalToPromise } from '@kbn/kibana-utils-plugin/server';
import { AbortError } from '@kbn/kibana-utils-plugin/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import { initPromisePool } from '../../../../utils/promise_pool';
import type { RuleMigrationsDataClient } from '../data/rule_migrations_data_client';
import type { MigrateRuleState } from './agent/types';
import { getRuleMigrationAgent } from './agent';
import { RuleMigrationsRetriever } from './retrievers';
import { SiemMigrationTelemetryClient } from './rule_migrations_telemetry_client';
import type { MigrationAgent } from './types';
import { generateAssistantComment } from './util/comments';
import type { SiemRuleMigrationsClientDependencies, StoredRuleMigration } from '../types';
import { ActionsClientChat } from './util/actions_client_chat';
import { EsqlKnowledgeBase } from './util/esql_knowledge_base';
import { SiemMigrationStatus } from '@kbn/security-solution-plugin/common/siem_migrations/constants';

const TASK_CONCURRENCY = 10 as const;
const ITERATION_SLEEP_SECONDS = 10 as const;

const RETRY_CONFIG = {
  initialRetryDelaySeconds: 1,
  backoffMultiplier: 2,
  maxRetries: 8,
  // max waiting time 4m15s (1*2^8 = 256s)
} as const;

export class RuleMigrationTaskRunner {
  private telemetry?: SiemMigrationTelemetryClient;
  private agent?: MigrationAgent;
  private retriever?: RuleMigrationsRetriever;
  private actionsClientChat: ActionsClientChat;

  constructor(
    private migrationId: string,
    private abortController: AbortController,
    private data: RuleMigrationsDataClient,
    private logger: Logger,
    private dependencies: SiemRuleMigrationsClientDependencies
  ) {
    this.actionsClientChat = new ActionsClientChat(this.dependencies.actionsClient, this.logger);
  }

  /** Retrieves the connector and creates the migration agent */
  public async setup(connectorId: string) {
    const { rulesClient, savedObjectsClient, inferenceClient } = this.dependencies;

    const model = await this.actionsClientChat.createModel({
      connectorId,
      migrationId: this.migrationId,
      abortController: this.abortController,
    });

    const esqlKnowledgeBase = new EsqlKnowledgeBase(
      connectorId,
      this.migrationId,
      inferenceClient,
      this.logger
    );

    this.retriever = new RuleMigrationsRetriever(this.migrationId, {
      data: this.data,
      rules: rulesClient,
      savedObjects: savedObjectsClient,
    });

    this.telemetry = new SiemMigrationTelemetryClient(
      this.dependencies.telemetry,
      this.logger,
      this.migrationId,
      model.model
    );

    this.agent = getRuleMigrationAgent({
      model,
      esqlKnowledgeBase,
      ruleMigrationsRetriever: this.retriever,
      telemetryClient: this.telemetry,
      logger: this.logger,
    });
  }

  /** Initializes the retriever populating ELSER indices. It may take a few minutes */
  private async initialize() {
    assert(this.retriever, 'setup() must be called before initialize()');
    await this.retriever.initialize();
  }

  public async run(invocationConfig: RunnableConfig): Promise<void> {
    assert(this.agent && this.telemetry, 'setup() must be called before run()');
    const { agent, telemetry, migrationId } = this;

    const abort = abortSignalToPromise(this.abortController.signal);
    const withAbort = <T>(task: Promise<T>) => Promise.race([task, abort.promise]);

    const migrationTaskTelemetry = telemetry.startSiemMigrationTask();

    try {
      // TODO: track the duration of the initialization alone in the telemetry
      this.logger.debug('Initializing migration');
      await withAbort(this.initialize()); // long running operation
    } catch (error) {
      migrationTaskTelemetry.failure(error);
      if (error instanceof AbortError) {
        this.logger.info('Abort signal received, stopping');
        return;
      } else {
        this.logger.error(`Error initializing migration: ${error}`);
        return;
      }
    }

    const config: RunnableConfig = {
      ...invocationConfig,
      // signal: abortController.signal, // not working properly https://github.com/langchain-ai/langgraphjs/issues/319
    };

    const invokeAgent = async (migrationRule: StoredRuleMigration): Promise<MigrateRuleState> => {
      // withAbort is a workaround for the issue with the langGraph signal not working properly
      return withAbort<MigrateRuleState>(
        agent.invoke({ original_rule: migrationRule.original_rule }, config)
      );
    };

    const sleep = async (seconds: number) => {
      this.logger.debug(`Sleeping ${seconds}s`);
      await withAbort(new Promise((resolve) => setTimeout(resolve, seconds * 1000)));
    };

    const sleepRetry = async (retriesLeft: number) => {
      const seconds =
        RETRY_CONFIG.initialRetryDelaySeconds *
        Math.pow(RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxRetries - retriesLeft);
      this.logger.debug(`Retry sleep ${seconds}s`);
      await sleep(seconds);
    };

    const migrateRuleWithBackoff = async (
      ruleMigration: StoredRuleMigration
    ): Promise<MigrateRuleState> => {
      let retriesLeft: number = RETRY_CONFIG.maxRetries;
      while (true) {
        try {
          await sleepRetry(retriesLeft);
          retriesLeft--;
          return await invokeAgent(ruleMigration);
        } catch (error) {
          if (!error.message.match(/429/) || retriesLeft === 0) {
            throw error;
          }
        }
      }
    };

    let backoff: Promise<MigrateRuleState> | undefined;
    const migrateRule = async (ruleMigration: StoredRuleMigration): Promise<MigrateRuleState> => {
      while (true) {
        try {
          return await invokeAgent(ruleMigration);
        } catch (error) {
          if (!error.message.match(/429/)) {
            throw error;
          }
          if (!backoff) {
            backoff = migrateRuleWithBackoff(ruleMigration);
            return await backoff;
          }
          await backoff.catch(() => {
            throw error; // throw the original error, not the backoff promise error
          });
        }
      }
    };

    try {
      let isDone: boolean = false;
      do {
        const { data: ruleMigrations } = await this.data.rules.get(migrationId, {
          filters: { status: SiemMigrationStatus.PENDING },
          size: 100, // keep 100 rules in memory
        });

        this.logger.debug(`Start processing batch of ${ruleMigrations.length} rules`);

        await initPromisePool<StoredRuleMigration, void, Error>({
          concurrency: TASK_CONCURRENCY,
          items: ruleMigrations,
          executor: async (ruleMigration) => {
            const ruleTranslationTelemetry = migrationTaskTelemetry.startRuleTranslation();
            try {
              await this.saveRuleProcessing(ruleMigration);
              const migrationResult = await migrateRule(ruleMigration);
              await this.saveRuleCompleted(ruleMigration, migrationResult);
              ruleTranslationTelemetry.success(migrationResult);
            } catch (error) {
              ruleTranslationTelemetry.failure(error);
              if (error instanceof AbortError) {
                throw error;
              }
              await this.saveRuleFailed(ruleMigration, error);
            }
          },
          abortSignal: this.abortController.signal,
        });

        this.logger.debug('Batch processed successfully');

        const { rules } = await this.data.rules.getStats(migrationId);
        isDone = rules.pending === 0;
        if (!isDone) {
          await sleep(ITERATION_SLEEP_SECONDS);
        }
      } while (!isDone);

      migrationTaskTelemetry.success();
      this.logger.info(`Finished migration ID:${migrationId}`);
    } catch (error) {
      await this.data.rules.releaseProcessing(migrationId);

      migrationTaskTelemetry.failure(error);
      if (error instanceof AbortError) {
        this.logger.info(`Abort signal received, stopping migration ID:${migrationId}`);
        return;
      } else {
        this.logger.error(`Error processing migration ID:${migrationId} ${error}`);
      }
    } finally {
      abort.cleanup();
    }
  }

  private async saveRuleProcessing(ruleMigration: StoredRuleMigration) {
    this.logger.debug(`Starting migration of rule "${ruleMigration.original_rule.title}"`);
    return this.data.rules.saveProcessing(ruleMigration.id);
  }

  private async saveRuleCompleted(
    ruleMigration: StoredRuleMigration,
    migrationResult: MigrateRuleState
  ) {
    this.logger.debug(`Migration of rule "${ruleMigration.original_rule.title}" succeeded`);
    const ruleMigrationTranslated = {
      ...ruleMigration,
      elastic_rule: migrationResult.elastic_rule,
      translation_result: migrationResult.translation_result,
      comments: migrationResult.comments,
    };
    return this.data.rules.saveCompleted(ruleMigrationTranslated);
  }

  private async saveRuleFailed(ruleMigration: StoredRuleMigration, error: Error) {
    this.logger.error(
      `Error migrating rule "${ruleMigration.original_rule.title} with error: ${error.message}"`
    );
    const comments = [generateAssistantComment(`Error migrating rule: ${error.message}`)];
    return this.data.rules.saveError({ ...ruleMigration, comments });
  }
}
