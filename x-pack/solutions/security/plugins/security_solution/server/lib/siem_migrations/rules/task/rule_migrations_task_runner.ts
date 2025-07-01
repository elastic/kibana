/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import { abortSignalToPromise, AbortError } from '@kbn/kibana-utils-plugin/server';
import { type ElasticRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import { initPromisePool } from '../../../../utils/promise_pool';
import type { RuleMigrationsDataClient } from '../data/rule_migrations_data_client';
import type { MigrateRuleGraphConfig, MigrateRuleState } from './agent/types';
import { getRuleMigrationAgent } from './agent';
import { RuleMigrationsRetriever } from './retrievers';
import { SiemMigrationTelemetryClient } from './rule_migrations_telemetry_client';
import type { MigrationAgent, RuleMigrationInput } from './types';
import { generateAssistantComment } from './util/comments';
import type { SiemRuleMigrationsClientDependencies, StoredRuleMigration } from '../types';
import { ActionsClientChat } from './util/actions_client_chat';
import { EsqlKnowledgeBase } from './util/esql_knowledge_base';
import { nullifyElasticRule } from './util/nullify_missing_properties';

/** Number of concurrent rule translations in the pool */
const TASK_CONCURRENCY = 10 as const;
/** Number of rules loaded in memory to be translated in the pool */
const TASK_BATCH_SIZE = 100 as const;
/** The timeout of each individual agent invocation in minutes */
const AGENT_INVOKE_TIMEOUT_MIN = 3 as const;

/** Exponential backoff configuration to handle rate limit errors */
const RETRY_CONFIG = {
  initialRetryDelaySeconds: 1,
  backoffMultiplier: 2,
  maxRetries: 8,
  // max waiting time 4m15s (1*2^8 = 256s)
} as const;

/** Executor sleep configuration
 * A sleep time applied at the beginning of each single rule translation in the execution pool,
 * The objective of this sleep is to spread the load of concurrent translations, and prevent hitting the rate limit repeatedly.
 * The sleep time applied is a random number between [0-value]. Every time we hit rate limit the value is increased by the multiplier, up to the limit.
 */
const EXECUTOR_SLEEP = {
  initialValueSeconds: 3,
  multiplier: 2,
  limitSeconds: 96, // 1m36s (5 increases)
} as const;

/** This limit should never be reached, it's a safety net to prevent infinite loops.
 * It represents the max number of consecutive rate limit recovery & failure attempts.
 * This can only happen when the API can not process TASK_CONCURRENCY translations at a time,
 * even after the executor sleep is increased on every attempt.
 **/
const EXECUTOR_RECOVER_MAX_ATTEMPTS = 3 as const;

export class RuleMigrationTaskRunner {
  private telemetry?: SiemMigrationTelemetryClient;
  protected agent?: MigrationAgent;
  private retriever: RuleMigrationsRetriever;
  private actionsClientChat: ActionsClientChat;
  private abort: ReturnType<typeof abortSignalToPromise>;
  private executorSleepMultiplier: number = EXECUTOR_SLEEP.initialValueSeconds;
  public isWaiting: boolean = false;

  constructor(
    public readonly migrationId: string,
    public readonly startedBy: AuthenticatedUser,
    public readonly abortController: AbortController,
    private readonly data: RuleMigrationsDataClient,
    protected readonly logger: Logger,
    protected readonly dependencies: SiemRuleMigrationsClientDependencies
  ) {
    this.actionsClientChat = new ActionsClientChat(this.dependencies.actionsClient, this.logger);
    this.retriever = new RuleMigrationsRetriever(this.migrationId, {
      data: this.data,
      rules: this.dependencies.rulesClient,
      savedObjects: this.dependencies.savedObjectsClient,
    });
    this.abort = abortSignalToPromise(this.abortController.signal);
  }

  /** Retrieves the connector and creates the migration agent */
  public async setup(connectorId: string) {
    const { inferenceClient } = this.dependencies;

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
  protected async initialize() {
    await this.retriever.initialize();
  }

  public async run(invocationConfig: MigrateRuleGraphConfig): Promise<void> {
    assert(this.telemetry, 'telemetry is missing please call setup() first');
    const { telemetry, migrationId } = this;

    const migrationTaskTelemetry = telemetry.startSiemMigrationTask();

    try {
      // TODO: track the duration of the initialization alone in the telemetry
      this.logger.debug('Initializing migration');
      await this.withAbort(this.initialize()); // long running operation
    } catch (error) {
      migrationTaskTelemetry.failure(error);
      if (error instanceof AbortError) {
        this.logger.info('Abort signal received, stopping initialization');
        return;
      } else {
        throw new Error(`Migration initialization failed. ${error}`);
      }
    }

    const migrateRuleTask = this.createMigrateRuleTask(invocationConfig);
    this.logger.debug(`Started rule translations. Concurrency is: ${TASK_CONCURRENCY}`);

    try {
      do {
        const { data: ruleMigrations } = await this.data.rules.get(migrationId, {
          filters: { status: SiemMigrationStatus.PENDING },
          size: TASK_BATCH_SIZE, // keep these rules in memory and process them in the promise pool with concurrency limit
        });
        if (ruleMigrations.length === 0) {
          break;
        }

        this.logger.debug(`Start processing batch of ${ruleMigrations.length} rules`);

        const { errors } = await initPromisePool<StoredRuleMigration, void, Error>({
          concurrency: TASK_CONCURRENCY,
          abortSignal: this.abortController.signal,
          items: ruleMigrations,
          executor: async (ruleMigration) => {
            const ruleTranslationTelemetry = migrationTaskTelemetry.startRuleTranslation();
            try {
              await this.saveRuleProcessing(ruleMigration);

              const resources = await this.retriever.resources.getResources(ruleMigration);

              const migrationResult = await migrateRuleTask({
                id: ruleMigration.id,
                original_rule: ruleMigration.original_rule,
                resources,
              });

              await this.saveRuleCompleted(ruleMigration, migrationResult);
              ruleTranslationTelemetry.success(migrationResult);
            } catch (error) {
              if (this.abortController.signal.aborted) {
                throw new AbortError();
              }
              ruleTranslationTelemetry.failure(error);
              await this.saveRuleFailed(ruleMigration, error);
            }
          },
        });

        if (errors.length > 0) {
          throw errors[0].error; // Only AbortError is thrown from the pool. The task was aborted
        }

        this.logger.debug('Batch processed successfully');
      } while (true);

      migrationTaskTelemetry.success();
      this.logger.info('Migration completed successfully');
    } catch (error) {
      await this.data.rules.releaseProcessing(migrationId);

      if (error instanceof AbortError) {
        migrationTaskTelemetry.aborted(error);
        this.logger.info('Abort signal received, stopping migration');
      } else {
        migrationTaskTelemetry.failure(error);
        throw new Error(`Error processing migration: ${error}`);
      }
    } finally {
      this.abort.cleanup();
    }
  }

  protected createMigrateRuleTask(invocationConfig?: MigrateRuleGraphConfig) {
    assert(this.agent, 'agent is missing please call setup() first');
    const { agent } = this;
    const config: MigrateRuleGraphConfig = {
      timeout: AGENT_INVOKE_TIMEOUT_MIN * 60 * 1000, // milliseconds timeout
      ...invocationConfig,
      signal: this.abortController.signal,
    };

    // Prepare the invocation with specific config
    const invoke = async (input: RuleMigrationInput): Promise<MigrateRuleState> =>
      agent.invoke(input, config);

    // Invokes the rule translation with exponential backoff, should be called only when the rate limit has been hit
    const invokeWithBackoff = async (
      ruleMigration: RuleMigrationInput
    ): Promise<MigrateRuleState> => {
      this.logger.debug(`Rate limit backoff started for rule "${ruleMigration.id}"`);
      let retriesLeft: number = RETRY_CONFIG.maxRetries;
      while (true) {
        try {
          await this.sleepRetry(retriesLeft);
          retriesLeft--;
          const result = await invoke(ruleMigration);
          this.logger.info(
            `Rate limit backoff completed successfully for rule "${ruleMigration.id}" after ${
              RETRY_CONFIG.maxRetries - retriesLeft
            } retries`
          );
          return result;
        } catch (error) {
          if (!this.isRateLimitError(error) || retriesLeft === 0) {
            this.logger.debug(
              `Rate limit backoff completed unsuccessfully for rule "${ruleMigration.id}"`
            );
            const logMessage =
              retriesLeft === 0
                ? `Rate limit backoff completed unsuccessfully for rule "${ruleMigration.id}"`
                : `Rate limit backoff interrupted for rule "${ruleMigration.id}". ${error} `;
            this.logger.debug(logMessage);
            throw error;
          }
          this.logger.debug(
            `Rate limit backoff not completed for rule "${ruleMigration.id}", retries left: ${retriesLeft}`
          );
        }
      }
    };

    let backoffPromise: Promise<MigrateRuleState> | undefined;
    // Migrates one rule, this function will be called concurrently by the promise pool.
    // Handles rate limit errors and ensures only one task is executing the backoff retries at a time, the rest of translation will await.
    const migrateRule = async (ruleMigration: RuleMigrationInput): Promise<MigrateRuleState> => {
      let recoverAttemptsLeft: number = EXECUTOR_RECOVER_MAX_ATTEMPTS;
      while (true) {
        try {
          await this.executorSleep(); // Random sleep, increased every time we hit the rate limit.
          return await invoke(ruleMigration);
        } catch (error) {
          if (!this.isRateLimitError(error) || recoverAttemptsLeft === 0) {
            throw error;
          }
          if (!backoffPromise) {
            // only one translation handles the rate limit backoff retries, the rest will await it and try again when it's resolved
            backoffPromise = invokeWithBackoff(ruleMigration);
            this.isWaiting = true;
            return backoffPromise.finally(() => {
              backoffPromise = undefined;
              this.increaseExecutorSleep();
              this.isWaiting = false;
            });
          }
          this.logger.debug(`Awaiting backoff task for rule "${ruleMigration.id}"`);
          await backoffPromise.catch(() => {
            throw error; // throw the original error
          });
          recoverAttemptsLeft--;
        }
      }
    };

    return migrateRule;
  }

  private isRateLimitError(error: Error) {
    return error.message.match(/\b429\b/); // "429" (whole word in the error message): Too Many Requests.
  }

  private async withAbort<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([promise, this.abort.promise]);
  }

  private async sleep(seconds: number) {
    await this.withAbort(new Promise((resolve) => setTimeout(resolve, seconds * 1000)));
  }

  // Exponential backoff implementation
  private async sleepRetry(retriesLeft: number) {
    const seconds =
      RETRY_CONFIG.initialRetryDelaySeconds *
      Math.pow(RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxRetries - retriesLeft);
    this.logger.debug(`Retry sleep: ${seconds}s`);
    await this.sleep(seconds);
  }

  private executorSleep = async () => {
    const seconds = Math.random() * this.executorSleepMultiplier;
    this.logger.debug(`Executor sleep: ${seconds.toFixed(3)}s`);
    await this.sleep(seconds);
  };

  private increaseExecutorSleep = () => {
    const increasedMultiplier = this.executorSleepMultiplier * EXECUTOR_SLEEP.multiplier;
    if (increasedMultiplier > EXECUTOR_SLEEP.limitSeconds) {
      this.logger.warn('Executor sleep reached the maximum value');
      return;
    }
    this.executorSleepMultiplier = increasedMultiplier;
  };

  private async saveRuleProcessing(ruleMigration: StoredRuleMigration) {
    this.logger.debug(`Starting translation of rule "${ruleMigration.id}"`);
    return this.data.rules.saveProcessing(ruleMigration.id);
  }

  private async saveRuleCompleted(
    ruleMigration: StoredRuleMigration,
    migrationResult: MigrateRuleState
  ) {
    this.logger.debug(`Translation of rule "${ruleMigration.id}" succeeded`);
    const nullifiedElasticRule = nullifyElasticRule(
      migrationResult.elastic_rule as ElasticRule,
      this.logger.error
    );
    const ruleMigrationTranslated = {
      ...ruleMigration,
      elastic_rule: nullifiedElasticRule as ElasticRule,
      translation_result: migrationResult.translation_result,
      comments: migrationResult.comments,
    };
    return this.data.rules.saveCompleted(ruleMigrationTranslated);
  }

  private async saveRuleFailed(ruleMigration: StoredRuleMigration, error: Error) {
    this.logger.error(`Error translating rule "${ruleMigration.id}" with error: ${error.message}`);
    const comments = [generateAssistantComment(`Error migrating rule: ${error.message}`)];
    return this.data.rules.saveError({ ...ruleMigration, comments });
  }
}
