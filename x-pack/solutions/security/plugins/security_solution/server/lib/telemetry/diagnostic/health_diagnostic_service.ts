/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { schema } from '@kbn/config-schema';
import type { LogMeta, Logger, EventTypeOpts, AnalyticsServiceStart } from '@kbn/core/server';
import type {
  HealthDiagnosticQuery,
  HealthDiagnosticQueryResult,
  HealthDiagnosticQueryStats,
  HealthDiagnosticService,
  HealthDiagnosticServiceSetup,
  HealthDiagnosticServiceStart,
} from './health_diagnostic_service.types';
import { nextExecution, parseDiagnosticQueries } from './health_diagnostic_utils';
import type { CircuitBreaker } from './health_diagnostic_circuit_breakers.types';
import type { CircuitBreakingQueryExecutor } from './health_diagnostic_receiver.types';
import { CircuitBreakingQueryExecutorImpl } from './health_diagnostic_receiver';
import { RssGrouthCircuitBreaker } from './circuit_breakers/rss_grouth_circuit_breakers';
import { TimeoutCircuitBreaker } from './circuit_breakers/timeout_circuit_breakers';
import { EventLoopUtilizationCircuitBreaker } from './circuit_breakers/event_loop_utilization_circuit_breakers';
import {
  TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_RESULT_EVENT,
  TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_STATS_EVENT,
} from '../event_based/events';
import { artifactService } from '../artifact';

const TASK_TYPE = 'Security Solution:Health Diagnostic';
const TASK_ID = 'security:health-diagnostic:1.0.0';
const INTERVAL = '1m';

export class HealthDiagnosticServiceImpl implements HealthDiagnosticService {
  private readonly logger: Logger;
  private queryExecutor?: CircuitBreakingQueryExecutor;
  private analytics?: AnalyticsServiceStart;

  // TODO: allow external configuration
  private readonly circuitBreakersConfig = {
    rssGrowth: {
      maxRssGrowthPercent: 0.2,
      validationIntervalMs: 200,
    },
    timeout: {
      timeoutMillis: 10,
      validationIntervalMs: 50,
    },
    eventLoopUtilization: {
      thresholdMillis: 1000,
      validationIntervalMs: 1000,
    },
  };

  constructor(logger: Logger) {
    this.logger = logger.get('health-diagnostic');
  }

  public setup(setup: HealthDiagnosticServiceSetup) {
    this.logger.info('Setting up health diagnostic service');
    this.registerTask(setup.taskManager);
  }

  public async start(start: HealthDiagnosticServiceStart) {
    this.logger.info('Starting health diagnostic service');
    this.queryExecutor = new CircuitBreakingQueryExecutorImpl(start.esClient);
    this.analytics = start.analytics;

    await this.scheduleTask(start.taskManager);
  }

  public async runHealthDiagnosticQueries(fromDate: Date, toDate: Date) {
    this.logger.info(`Running health diagnostic task`, {
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    } as LogMeta);

    if (this.queryExecutor === undefined) {
      this.logger.warn('CircuitBreakingQueryExecutor service is not started');
      return;
    }

    const healthQueries = await this.healthQueries();
    const queriesToRun = healthQueries.filter((query) => {
      const { scheduleCron, isEnabled } = query;
      return nextExecution(fromDate, toDate, scheduleCron) !== undefined && (isEnabled ?? true);
    });

    this.logger.info('About to run health diagnostic queries', {
      totalQueries: healthQueries.length,
      queriesToRun: queriesToRun.length,
    } as LogMeta);

    for (const query of queriesToRun) {
      const circuitBreakers = this.buildCircuitBreakers();
      const options = { query: query.esQuery, circuitBreakers };
      let currentPage = 1;

      const queryStats: HealthDiagnosticQueryStats = {
        name: query.name,
        traceId: randomUUID(),
        numDocs: 0,
        passed: false,
      };

      try {
        for await (const data of this.queryExecutor.search<unknown[]>(options)) {
          queryStats.numDocs += data.length;
          const queryResult: HealthDiagnosticQueryResult = {
            name: query.name,
            traceId: queryStats.traceId,
            page: currentPage,
            data,
          };

          this.logger.info('Sending query result EBT', {
            name: query.name,
            traceId: queryResult.traceId,
            currentPage,
          } as LogMeta);

          this.reportEBT(TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_RESULT_EVENT, queryResult);
          currentPage++;
        }
        queryStats.passed = true;
      } catch (err) {
        queryStats.failure = err.message;
        this.logger.error('Error running query', { queryStats } as LogMeta);
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
    }

    this.logger.info('Finished running health diagnostic task');
  }

  private registerTask(taskManager: TaskManagerSetupContract) {
    this.logger.debug('About to register task', { taskId: TASK_ID } as LogMeta);

    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Security Solution - Health Diagnostic Task',
        description: 'This task periodically collects health diagnostic information.',
        timeout: '5m',
        maxAttempts: 1,
        stateSchemaByVersion: {
          1: {
            up: (state: Record<string, unknown>) => ({
              lastExecutionTime:
                state.lastExecutionTime || new Date('2021-05-04T00:00:00').getTime(),
            }),
            schema: schema.object({
              lastExecutionTime: schema.number(),
            }),
          },
        },
        createTaskRunner: ({ taskInstance }) => {
          return {
            run: async () => {
              const { state } = taskInstance;

              const fromDate = new Date(state.lastExecutionTime);
              const toDate = new Date();

              await this.runHealthDiagnosticQueries(fromDate, toDate);

              return {
                state: {
                  lastExecutionTime: toDate.getTime(),
                },
              };
            },

            cancel: async () => {
              this.logger?.warn('Task timed out', { taskId: TASK_ID } as LogMeta);
            },
          };
        },
      },
    });
  }

  private async scheduleTask(taskManager: TaskManagerStartContract): Promise<void> {
    this.logger.info('About to schedule task', { taskId: TASK_ID, taskType: TASK_TYPE } as LogMeta);

    try {
      await taskManager.ensureScheduled({
        id: TASK_ID,
        taskType: TASK_TYPE,
        schedule: { interval: INTERVAL },
        params: {},
        state: {
          lastExecutionTime: new Date().getTime(),
        },
        scope: ['securitySolution'],
      });

      this.logger.info('Task scheduled', { taskId: TASK_ID, taskType: TASK_TYPE } as LogMeta);
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
    ];
  }

  private reportEBT<T>(eventTypeOpts: EventTypeOpts<T>, eventData: T): void {
    if (!this.analytics) {
      throw Error('analytics is unavailable');
    }
    this.analytics.reportEvent(eventTypeOpts.eventType, eventData as object);
  }

  private async healthQueries(): Promise<HealthDiagnosticQuery[]> {
    // TODO: run as part of the configuration task instead of getting the artifact each time the task runs?
    try {
      const artifact = await artifactService.getArtifact('health-diagnostic-query');
      return parseDiagnosticQueries(artifact.data);
    } catch (err) {
      this.logger.warn('Error getting health diagnostic queries', {
        error: err.message,
      } as LogMeta);
      return [];
    }
  }
}
