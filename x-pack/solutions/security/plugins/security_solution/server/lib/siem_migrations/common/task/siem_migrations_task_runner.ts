/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import { abortSignalToPromise, AbortError } from '@kbn/kibana-utils-plugin/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import { initPromisePool } from '../../../../utils/promise_pool';
import type { SiemMigrationsDataClient } from '../data/siem_migrations_data_client';
import type { Invocation, Invoke, MigrationTask } from './types';
import { generateAssistantComment } from './util/comments';
import type {
  ItemDocument,
  MigrationDocument,
  SiemMigrationsClientDependencies,
  Stored,
} from '../types';
import { ActionsClientChat } from './util/actions_client_chat';
import type { SiemMigrationTelemetryClient } from './siem_migrations_telemetry_client';
import type { SiemMigrationVendor } from '../../../../../common/siem_migrations/model/common.gen';

/** Number of items loaded in memory to be translated in the pool */
const TASK_BATCH_SIZE = 100 as const;
/** The timeout of each individual agent invocation in minutes */
const AGENT_INVOKE_TIMEOUT_MIN = 20 as const;

/** Exponential backoff configuration to handle rate limit errors */
const RETRY_CONFIG = {
  initialRetryDelaySeconds: 1,
  backoffMultiplier: 2,
  maxRetries: 8,
  // max waiting time 4m15s (1*2^8 = 256s)
} as const;

/** Executor sleep configuration
 * A sleep time applied at the beginning of each single item translation in the execution pool,
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
 * This can only happen when the API can not process all concurrenct translations ( based on taskConcurrency ) at a time,
 * even after the executor sleep is increased on every attempt.
 **/
const EXECUTOR_RECOVER_MAX_ATTEMPTS = 3 as const;

export type SiemTaskRunnerConstructor<
  M extends MigrationDocument = MigrationDocument,
  I extends ItemDocument = ItemDocument,
  P extends object = {},
  C extends object = {},
  O extends object = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
> = new (...params: any[]) => SiemMigrationTaskRunner<M, I, P, C, O>;

export abstract class SiemMigrationTaskRunner<
  M extends MigrationDocument = MigrationDocument, // The migration document type (rule migrations and dashboard migrations very similar but have differences)
  I extends ItemDocument = ItemDocument, // The rule or dashboard document type
  P extends object = {}, // The migration task input parameters schema
  C extends object = {}, // The migration task config schema
  O extends object = {} // The migration task output schema
> {
  protected telemetry?: SiemMigrationTelemetryClient<I>;
  protected task?: MigrationTask<P, C, O>;
  declare actionsClientChat: ActionsClientChat;
  private abort: ReturnType<typeof abortSignalToPromise>;
  private executorSleepMultiplier: number = EXECUTOR_SLEEP.initialValueSeconds;
  public isWaiting: boolean = false;
  /** Number of concurrent items to process. Each item triggers one instance of graph */
  protected abstract readonly taskConcurrency: number;

  constructor(
    public readonly migrationId: string,
    protected readonly vendor: SiemMigrationVendor,
    protected readonly request: KibanaRequest,
    public readonly startedBy: AuthenticatedUser,
    public readonly abortController: AbortController,
    protected readonly data: SiemMigrationsDataClient<M, I>,
    protected readonly logger: Logger,
    protected readonly dependencies: SiemMigrationsClientDependencies
  ) {
    this.actionsClientChat = new ActionsClientChat(this.request, this.dependencies);
    this.abort = abortSignalToPromise(this.abortController.signal);
  }

  /** Receives the connectorId and creates the `this.task` and `this.telemetry` attributes */
  public abstract setup(connectorId: string): Promise<void>;

  /** Prepares the migration item for the task execution */
  protected abstract prepareTaskInput(item: Stored<I>): Promise<P>;

  /** Processes the output of the migration task and returns the item to save */
  protected abstract processTaskOutput(item: Stored<I>, output: O): Stored<I>;

  /** Optional initialization logic */
  public async initialize() {}

  public async run(invocationConfig: RunnableConfig<C>): Promise<void> {
    assert(this.telemetry, 'telemetry is missing please call setup() first');
    const { telemetry, migrationId } = this;

    const migrationTaskTelemetry = telemetry.startSiemMigrationTask();

    try {
      this.logger.debug('Initializing migration');
      await this.withAbort(this.initialize());
    } catch (error) {
      migrationTaskTelemetry.failure(error);
      if (error instanceof AbortError) {
        this.logger.info('Abort signal received, stopping initialization');
        return;
      } else {
        throw new Error(`Migration initialization failed. ${error}`);
      }
    }

    const migrateItemTask = this.createMigrateItemTask(invocationConfig);
    this.logger.debug(`Started translations. Concurrency is: ${this.taskConcurrency}`);

    try {
      do {
        const { data: migrationItems } = await this.data.items.get(migrationId, {
          filters: { status: SiemMigrationStatus.PENDING },
          size: TASK_BATCH_SIZE, // keep these items in memory and process them in the promise pool with concurrency limit
        });
        if (migrationItems.length === 0) {
          break;
        }

        this.logger.debug(`Start processing batch of ${migrationItems.length} items`);

        const { errors } = await initPromisePool<Stored<I>, void, Error>({
          concurrency: this.taskConcurrency,
          abortSignal: this.abortController.signal,
          items: migrationItems,
          executor: async (migrationItem) => {
            const itemTranslationTelemetry = migrationTaskTelemetry.startItemTranslation();
            try {
              await this.saveItemProcessing(migrationItem);

              const migratedItem = await migrateItemTask(migrationItem);

              await this.saveItemCompleted(migratedItem);
              itemTranslationTelemetry.success(migratedItem);
            } catch (error) {
              if (this.abortController.signal.aborted) {
                throw new AbortError();
              }
              itemTranslationTelemetry.failure(error);
              await this.saveItemFailed(migrationItem, error);
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
      await this.data.items.releaseProcessing(migrationId);

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

  /** Executes the task with raw input and config, and returns the output promise. */
  async executeTask(input: P, config: RunnableConfig<C>) {
    assert(this.task, 'Migration task is not defined');
    return this.task(input, config);
  }

  /** Creates the task invoke function, the input is prepared and the output is processed as a migrationItem */
  private createTaskInvoke = async (
    migrationItem: I,
    config: RunnableConfig<C>
  ): Promise<Invoke<I>> => {
    const input = await this.prepareTaskInput(migrationItem);
    return async () => {
      const output = await this.executeTask(input, config);
      return this.processTaskOutput(migrationItem, output);
    };
  };

  protected createMigrateItemTask(invocationConfig?: RunnableConfig<C>) {
    const config: RunnableConfig<C> = {
      timeout: AGENT_INVOKE_TIMEOUT_MIN * 60 * 1000, // milliseconds timeout
      ...invocationConfig,
      metadata: {
        migrationId: this.migrationId,
      },
      signal: this.abortController.signal,
    };

    // Invokes the item translation with exponential backoff, should be called only when the rate limit has been hit
    const invokeWithBackoff = async (invoke: Invoke<I>): Invocation<I> => {
      this.logger.debug('Rate limit backoff started');
      let retriesLeft: number = RETRY_CONFIG.maxRetries;
      while (true) {
        try {
          await this.sleepRetry(retriesLeft);
          retriesLeft--;
          const result = await invoke();
          this.logger.info(
            `Rate limit backoff completed successfully after ${
              RETRY_CONFIG.maxRetries - retriesLeft
            } retries`
          );
          return result;
        } catch (error) {
          if (!this.isRateLimitError(error) || retriesLeft === 0) {
            const logMessage =
              retriesLeft === 0
                ? `Rate limit backoff completed unsuccessfully`
                : `Rate limit backoff interrupted. ${error} `;
            this.logger.debug(logMessage);
            throw error;
          }
          this.logger.debug(`Rate limit backoff not completed, retries left: ${retriesLeft}`);
        }
      }
    };

    let backoffPromise: Invocation<I> | undefined;
    // Migrates one item, this function will be called concurrently by the promise pool.
    // Handles rate limit errors and ensures only one task is executing the backoff retries at a time, the rest of translation will await.
    const migrateItem = async (migrationItem: I): Invocation<I> => {
      const invoke = await this.createTaskInvoke(migrationItem, config);

      let recoverAttemptsLeft: number = EXECUTOR_RECOVER_MAX_ATTEMPTS;
      while (true) {
        try {
          await this.executorSleep(); // Random sleep, increased every time we hit the rate limit.
          return await invoke();
        } catch (error) {
          this.logger.debug(`Error during migration item translation: ${error.toString()}`);
          if (!this.isRateLimitError(error) || recoverAttemptsLeft === 0) {
            throw error;
          }
          if (!backoffPromise) {
            // only one translation handles the rate limit backoff retries, the rest will await it and try again when it's resolved
            backoffPromise = invokeWithBackoff(invoke);
            this.isWaiting = true;
            return backoffPromise.finally(() => {
              backoffPromise = undefined;
              this.increaseExecutorSleep();
              this.isWaiting = false;
            });
          }
          this.logger.debug(`Awaiting backoff task for migration item "${migrationItem.id}"`);
          await backoffPromise.catch(() => {
            throw error; // throw the original error
          });
          recoverAttemptsLeft--;
        }
      }
    };

    return migrateItem;
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

  protected async saveItemProcessing(migrationItem: Stored<I>) {
    this.logger.debug(`Starting translation of document "${migrationItem.id}"`);
    return this.data.items.saveProcessing(migrationItem.id);
  }

  protected async saveItemCompleted(migrationItem: Stored<I>) {
    this.logger.debug(`Translation of document "${migrationItem.id}" succeeded`);
    return this.data.items.saveCompleted(migrationItem);
  }

  protected async saveItemFailed(migrationItem: Stored<I>, error: Error) {
    this.logger.error(
      `Error translating migration item "${migrationItem.id}" with error: ${error.message}`
    );
    const comments = [generateAssistantComment(`Error migrating document: ${error.message}`)];
    return this.data.items.saveError({ ...migrationItem, comments });
  }
}
