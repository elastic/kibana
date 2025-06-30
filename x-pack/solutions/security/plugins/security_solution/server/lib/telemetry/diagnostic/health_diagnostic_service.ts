/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { cloneDeep } from 'lodash';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { schema } from '@kbn/config-schema';
import type {
  ElasticsearchClient,
  LogMeta,
  Logger,
  EventTypeOpts,
  AnalyticsServiceStart,
} from '@kbn/core/server';
import {
  Action,
  type HealthDiagnosticQuery,
  type HealthDiagnosticQueryResult,
  type HealthDiagnosticQueryStats,
  type HealthDiagnosticService,
  type HealthDiagnosticServiceSetup,
  type HealthDiagnosticServiceStart,
} from './health_diagnostic_service.types';
import { nextExecution, parseDiagnosticQueries } from './health_diagnostic_utils';
import type { CircuitBreaker } from './health_diagnostic_circuit_breakers.types';
import type { CircuitBreakingQueryExecutor } from './health_diagnostic_receiver.types';
import { CircuitBreakingQueryExecutorImpl } from './health_diagnostic_receiver';
import {
  TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_RESULT_EVENT,
  TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_STATS_EVENT,
} from '../event_based/events';
import { artifactService } from '../artifact';
import { newTelemetryLogger } from '../helpers';
import { RssGrouthCircuitBreaker } from './circuit_breakers/rss_grouth_circuit_breaker';
import { TimeoutCircuitBreaker } from './circuit_breakers/timeout_circuit_breaker';
import { EventLoopUtilizationCircuitBreaker } from './circuit_breakers/event_loop_utilization_circuit_breaker';
import { EventLoopDelayCircuitBreaker } from './circuit_breakers/event_loop_delay_circuit_breaker';
import { ElasticsearchCircuitBreaker } from './circuit_breakers/elastic_search_circuit_breaker';

const TASK_TYPE = 'security:health-diagnostic';
const TASK_ID = `${TASK_TYPE}:1.0.0`;
const INTERVAL = '60m';
const TIMEOUT = '5m';
const QUERY_ARTIFACT_ID = 'health-diagnostic-query';

export class HealthDiagnosticServiceImpl implements HealthDiagnosticService {
  private readonly salt = 'c2a5d101-d0ef-49cc-871e-6ee55f9546f8';

  private readonly logger: Logger;
  private queryExecutor?: CircuitBreakingQueryExecutor;
  private analytics?: AnalyticsServiceStart;
  private _esClient?: ElasticsearchClient;

  // TODO: allow external configuration
  private readonly circuitBreakersConfig = {
    rssGrowth: {
      maxRssGrowthPercent: 0.2,
      validationIntervalMs: 200,
    },
    timeout: {
      timeoutMillis: 1000,
      validationIntervalMs: 50,
    },
    eventLoopUtilization: {
      thresholdMillis: 500,
      validationIntervalMs: 50,
    },
    eventLoopDelay: {
      thresholdMillis: 100,
      validationIntervalMs: 10,
    },
    elasticsearch: {
      maxJvmHeapUsedPercent: 80,
      maxCpuPercent: 80,
      expectedClusterHealth: ['green', 'yellow'],
      validationIntervalMs: 30,
    },
  };

  constructor(logger: Logger) {
    const mdc = { task_id: TASK_ID, task_type: TASK_TYPE };
    this.logger = newTelemetryLogger(logger.get('health-diagnostic'), mdc);
  }

  public setup(setup: HealthDiagnosticServiceSetup) {
    this.logger.info('Setting up health diagnostic service');

    this.registerTask(setup.taskManager);
  }

  public async start(start: HealthDiagnosticServiceStart) {
    this.logger.info('Starting health diagnostic service');

    this.queryExecutor = new CircuitBreakingQueryExecutorImpl(start.esClient, this.logger);
    this.analytics = start.analytics;
    this._esClient = start?.esClient;

    await this.scheduleTask(start.taskManager);
  }

  public async runHealthDiagnosticQueries(
    lastExecutionByQuery: Record<string, number>
  ): Promise<HealthDiagnosticQueryStats[]> {
    const statistics: HealthDiagnosticQueryStats[] = [];
    const toDate = new Date();

    this.logger.info(`Running health diagnostic task`);

    if (this.queryExecutor === undefined) {
      this.logger.warn('CircuitBreakingQueryExecutor service is not started');
      return statistics;
    }

    const healthQueries = await this.healthQueries();

    const queriesToRun = healthQueries.filter((query) => {
      const { name, scheduleCron, enabled } = query;
      const lastExecution = new Date(lastExecutionByQuery[name] ?? 0);

      return nextExecution(lastExecution, toDate, scheduleCron) !== undefined && (enabled ?? true);
    });

    this.logger.info('About to run health diagnostic queries', {
      totalQueries: healthQueries.length,
      queriesToRun: queriesToRun.length,
    } as LogMeta);

    for (const query of queriesToRun) {
      const circuitBreakers = this.buildCircuitBreakers();
      const options = { query, circuitBreakers };

      const queryStats: HealthDiagnosticQueryStats = {
        name: query.name,
        started: toDate.toISOString(),
        finished: new Date().toISOString(),
        traceId: randomUUID(),
        numDocs: 0,
        passed: false,
      };

      try {
        const data: unknown[] = await this.queryExecutor.search(options);

        queryStats.numDocs += data.length;
        const queryResult: HealthDiagnosticQueryResult = {
          name: query.name,
          queryId: query.id,
          traceId: queryStats.traceId,
          page: 0,
          data,
        };

        this.logger.info('Sending query result EBT', {
          name: query.name,
          traceId: queryStats.traceId,
        } as LogMeta);

        const filtered = query.filterlist
          ? await this.applyFilterlist(queryResult, query.filterlist)
          : queryResult;

        this.reportEBT(TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_RESULT_EVENT, filtered);

        queryStats.passed = true;
      } catch (err) {
        queryStats.failure = err.message;
        this.logger.error('Error running query', { error: err.message } as LogMeta);
      }

      queryStats.circuitBreakers = circuitBreakers.reduce((acc, cb) => {
        acc[cb.constructor.name] = cb.stats();
        return acc;
      }, {} as Record<string, unknown>);

      this.logger.info('Query executed. Sending query stats EBT', {
        name: query.name,
        traceId: queryStats.traceId,
      } as LogMeta);

      this.reportEBT(TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_STATS_EVENT, queryStats);
      statistics.push(queryStats);
    }

    this.logger.info('Finished running health diagnostic task');

    return statistics;
  }

  private registerTask(taskManager: TaskManagerSetupContract) {
    this.logger.debug('About to register task');

    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Security Solution - Health Diagnostic Task',
        description: 'This task periodically collects health diagnostic information.',
        timeout: TIMEOUT,
        maxAttempts: 1,
        stateSchemaByVersion: {
          1: {
            up: (state: Record<string, unknown>) => ({
              lastExecutionByQuery: state.lastExecutionByQuery || {},
            }),
            schema: schema.object({
              lastExecutionByQuery: schema.recordOf(schema.string(), schema.number()),
            }),
          },
        },
        createTaskRunner: ({ taskInstance }) => {
          return {
            run: async () => {
              const { state } = taskInstance;

              const stats = await this.runHealthDiagnosticQueries(
                cloneDeep(state.lastExecutionByQuery)
              );
              const lastExecutionByQuery = stats.reduce((acc, stat) => {
                acc[stat.name] = new Date(stat.finished).getTime();
                return acc;
              }, {} as Record<string, number>);

              return {
                state: {
                  lastExecutionByQuery: { ...state.lastExecutionByQuery, ...lastExecutionByQuery },
                },
              };
            },

            cancel: async () => {
              this.logger?.warn('Task timed out');
            },
          };
        },
      },
    });
  }

  private async scheduleTask(taskManager: TaskManagerStartContract): Promise<void> {
    this.logger.info('About to schedule task');

    try {
      await taskManager.ensureScheduled({
        id: TASK_ID,
        taskType: TASK_TYPE,
        schedule: { interval: INTERVAL },
        params: {},
        state: { lastExecutionByQuery: {} },
        scope: ['securitySolution'],
      });

      this.logger.info('Task scheduled');
    } catch (e) {
      this.logger.error('Error scheduling task', {
        error: e.message,
        taskId: TASK_ID,
        taskType: TASK_TYPE,
      } as LogMeta);
    }
  }

  private buildCircuitBreakers(): CircuitBreaker[] {
    return [
      new RssGrouthCircuitBreaker(this.circuitBreakersConfig.rssGrowth),
      new TimeoutCircuitBreaker(this.circuitBreakersConfig.timeout),
      new EventLoopUtilizationCircuitBreaker(this.circuitBreakersConfig.eventLoopUtilization),
      new EventLoopDelayCircuitBreaker(this.circuitBreakersConfig.eventLoopDelay),
      new ElasticsearchCircuitBreaker(this.circuitBreakersConfig.elasticsearch, this.esClient()),
    ];
  }

  private esClient(): ElasticsearchClient {
    if (this._esClient === undefined || this._esClient === null) {
      throw Error('elasticsearch client is unavailable');
    }
    return this._esClient;
  }

  private reportEBT<T>(eventTypeOpts: EventTypeOpts<T>, eventData: T): void {
    if (!this.analytics) {
      throw Error('analytics is unavailable');
    }
    this.analytics.reportEvent(eventTypeOpts.eventType, eventData as object);
  }

  private async healthQueries(): Promise<HealthDiagnosticQuery[]> {
    try {
      const artifact = await artifactService.getArtifact(QUERY_ARTIFACT_ID);
      return parseDiagnosticQueries(artifact.data);
    } catch (err) {
      this.logger.warn('Error getting health diagnostic queries', {
        error: err.message,
      } as LogMeta);
      return [];
    }
  }

  private async applyFilterlist(
    queryResult: HealthDiagnosticQueryResult,
    rules: Record<string, Action>
  ): Promise<HealthDiagnosticQueryResult> {
    const filteredResult: unknown[] = [];
    const documents = queryResult.data;

    const applyFilterToDoc = async (doc: unknown): Promise<Record<string, unknown>> => {
      const filteredDoc: Record<string, unknown> = {};
      for (const path of Object.keys(rules)) {
        const keys = path.split('.');
        let src = doc as Record<string, unknown>;
        let dst = filteredDoc;

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];

          if (!(key in src)) break;

          if (i === keys.length - 1) {
            const value = src[key];
            dst[key] = rules[path] === Action.MASK ? await this.maskValue(String(value)) : value;
          } else {
            dst[key] ??= {};
            src = src[key] as Record<string, unknown>;
            dst = dst[key] as Record<string, unknown>;
          }
        }
      }
      return filteredDoc;
    };

    for (const doc of documents) {
      if (Array.isArray(doc)) {
        const docs = doc as unknown[];
        const result = await Promise.all(
          docs.map((d) => {
            const a = applyFilterToDoc(d);
            return a;
          })
        );
        filteredResult.push(result);
      } else {
        filteredResult.push(await applyFilterToDoc(doc));
      }
    }

    return {
      ...queryResult,
      data: filteredResult as unknown[],
    };
  }

  private async maskValue(value: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(this.salt + value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}
