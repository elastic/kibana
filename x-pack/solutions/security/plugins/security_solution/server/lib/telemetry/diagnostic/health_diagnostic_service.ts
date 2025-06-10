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
import { Artifact, type CdnConfig } from '../artifact';
import { newTelemetryLogger } from '../helpers';
import type { ITelemetryReceiver } from '../receiver';

const TASK_TYPE = 'security:health-diagnostic';
const TASK_ID = `${TASK_TYPE}:1.0.0`;
const INTERVAL = '60m';
const TIMEOUT = '5m';
const QUERY_ARTIFACT_ID = 'health-diagnostic-query';

export class HealthDiagnosticServiceImpl implements HealthDiagnosticService {
  private readonly logger: Logger;
  private queryExecutor?: CircuitBreakingQueryExecutor;
  private analytics?: AnalyticsServiceStart;
  private artifactService: Artifact;
  private receiver?: ITelemetryReceiver;

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
    const mdc = { task_id: TASK_ID, task_type: TASK_TYPE };
    this.logger = newTelemetryLogger(logger.get('health-diagnostic'), mdc);
    this.artifactService = new Artifact();
  }

  public setup(setup: HealthDiagnosticServiceSetup) {
    this.logger.info('Setting up health diagnostic service');

    this.registerTask(setup.taskManager);
  }

  public async start(start: HealthDiagnosticServiceStart) {
    this.logger.info('Starting health diagnostic service');

    this.queryExecutor = new CircuitBreakingQueryExecutorImpl(start.esClient);
    this.analytics = start.analytics;
    this.receiver = start.receiver;

    await Promise.all([
      this.artifactService.start(start.receiver),
      this.scheduleTask(start.taskManager),
    ]);
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
      const { name, scheduleInterval, isEnabled } = query;
      const lastExecution = new Date(lastExecutionByQuery[name] ?? 0);

      return (
        nextExecution(lastExecution, toDate, scheduleInterval) !== undefined && (isEnabled ?? true)
      );
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
        started: toDate.toISOString(),
        finished: new Date().toISOString(),
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
            traceId: queryStats.traceId,
            currentPage,
          } as LogMeta);

          this.reportEBT(TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_RESULT_EVENT, queryResult);

          currentPage++;
        }
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

  public async updateCdnUrl(cdn: CdnConfig): Promise<void> {
    if (this.receiver === undefined) {
      this.logger.warn('Receiver is not started');
      return;
    }
    await this.artifactService.start(this.receiver, cdn);
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
    ];
  }

  private reportEBT<T>(eventTypeOpts: EventTypeOpts<T>, eventData: T): void {
    if (!this.analytics) {
      throw Error('analytics is unavailable');
    }
    this.analytics.reportEvent(eventTypeOpts.eventType, eventData as object);
  }

  private async healthQueries(): Promise<HealthDiagnosticQuery[]> {
    try {
      const artifact = await this.artifactService.getArtifact(QUERY_ARTIFACT_ID);
      return parseDiagnosticQueries(artifact.data);
    } catch (err) {
      this.logger.warn('Error getting health diagnostic queries', {
        error: err.message,
      } as LogMeta);
      return [];
    }
  }
}
