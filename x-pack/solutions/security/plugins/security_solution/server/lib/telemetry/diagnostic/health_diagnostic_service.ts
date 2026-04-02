/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { schema } from '@kbn/config-schema';
import { bufferCount, defaultIfEmpty, defer, from, mergeMap, take, tap } from 'rxjs';
import { cloneDeep } from 'lodash';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type {
  ElasticsearchClient,
  LogMeta,
  Logger,
  EventTypeOpts,
  AnalyticsServiceStart,
} from '@kbn/core/server';
import {
  PermissionError,
  type ExecutableQuery,
  type SkippedQuery,
  type HealthDiagnosticQuery,
  type HealthDiagnosticQueryStats,
  type HealthDiagnosticService,
  type HealthDiagnosticServiceSetup,
  type HealthDiagnosticServiceStart,
  type ParseFailureQuery,
} from './health_diagnostic_service.types';
import {
  emptyStat as queryStat,
  fieldNames,
  shouldExecute as isDueForExecution,
  applyFilterlist,
} from './health_diagnostic_utils';
import { parseHealthDiagnosticQueries } from './health_diagnostic_query_parser';
import { type CircuitBreaker, ValidationError } from './health_diagnostic_circuit_breakers.types';
import type { CircuitBreakingQueryExecutor } from './health_diagnostic_receiver.types';
import { CircuitBreakingQueryExecutorImpl } from './health_diagnostic_receiver';
import {
  TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_RESULT_EVENT,
  TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_STATS_EVENT,
} from '../event_based/events';
import { artifactService } from '../artifact';
import { newTelemetryLogger, withErrorMessage } from '../helpers';
import { telemetryConfiguration } from '../configuration';
import { RssGrowthCircuitBreaker } from './circuit_breakers/rss_growth_circuit_breaker';
import { TimeoutCircuitBreaker } from './circuit_breakers/timeout_circuit_breaker';
import { EventLoopUtilizationCircuitBreaker } from './circuit_breakers/event_loop_utilization_circuit_breaker';
import { EventLoopDelayCircuitBreaker } from './circuit_breakers/event_loop_delay_circuit_breaker';
import { ElasticsearchCircuitBreaker } from './circuit_breakers/elastic_search_circuit_breaker';
import type { TelemetryConfigProvider } from '../../../../common/telemetry_config/telemetry_config_provider';
import {
  IntegrationResolverImpl,
  type IntegrationResolver,
} from './health_diagnostic_integration_resolver';

const TASK_TYPE = 'security:health-diagnostic';
const TASK_ID = `${TASK_TYPE}:1.0.0`;
const INTERVAL = '1h';
const TIMEOUT = '10m';
const QUERY_ARTIFACT_ID = 'health-diagnostic-queries-v2';

export class HealthDiagnosticServiceImpl implements HealthDiagnosticService {
  private readonly salt = 'c2a5d101-d0ef-49cc-871e-6ee55f9546f8';

  private readonly logger: Logger;
  private queryExecutor?: CircuitBreakingQueryExecutor;
  private analytics?: AnalyticsServiceStart;
  private _esClient?: ElasticsearchClient;
  private telemetryConfigProvider?: TelemetryConfigProvider;
  private integrationResolver?: IntegrationResolver;
  private isServerless = false;

  constructor(logger: Logger) {
    const mdc = { task_id: TASK_ID, task_type: TASK_TYPE };
    this.logger = newTelemetryLogger(logger.get('health-diagnostic'), mdc);
  }

  public setup(setup: HealthDiagnosticServiceSetup) {
    this.logger.debug('Setting up health diagnostic service');
    this.isServerless = setup.isServerless;

    this.registerTask(setup.taskManager);
  }

  public async start(start: HealthDiagnosticServiceStart) {
    this.logger.debug('Starting health diagnostic service');

    this.queryExecutor = new CircuitBreakingQueryExecutorImpl(
      start.esClient,
      this.isServerless,
      this.logger
    );
    this.analytics = start.analytics;
    this._esClient = start.esClient;
    this.telemetryConfigProvider = start.telemetryConfigProvider;
    this.integrationResolver = new IntegrationResolverImpl(start.packageService, this.logger);

    await this.scheduleTask(start.taskManager);
  }

  public async runHealthDiagnosticQueries(
    lastExecutionByQuery: Record<string, number>
  ): Promise<HealthDiagnosticQueryStats[]> {
    if (!this.telemetryConfigProvider?.getIsOptedIn()) {
      this.logger.debug('Skipping health diagnostic task because telemetry is disabled');
      return [];
    }

    if (!this.queryExecutor || !this.integrationResolver) {
      this.logger.warn('Service is not fully started');
      return [];
    }

    const queries = await this.getRunnableHealthQueries(lastExecutionByQuery, new Date());
    const resolved = await this.integrationResolver.resolve(queries);
    this.logger.trace('About to run queries', { numQueries: queries.length } as LogMeta);
    const statistics: HealthDiagnosticQueryStats[] = [];

    for (const resolvedQuery of resolved) {
      this.logger.trace('About to execute health diagnostic query', {
        name: resolvedQuery.query.name,
      } as LogMeta);
      let stats: HealthDiagnosticQueryStats;

      if (resolvedQuery.kind === 'skipped') {
        stats = this.buildSkippedStats(resolvedQuery);
      } else {
        stats = await this.executeQuery(resolvedQuery);
      }

      this.logger.debug('Query executed. Sending query stats EBT', {
        queryName: resolvedQuery.query.name,
        traceId: stats.traceId,
      } as LogMeta);

      this.reportEBT(TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_STATS_EVENT, stats);
      statistics.push(stats);
    }

    return statistics;
  }

  private buildSkippedStats(skipped: SkippedQuery): HealthDiagnosticQueryStats {
    const { query } = skipped;
    const name = query.name ? query.name : query.id ?? 'unknown';
    const now = new Date();
    return {
      name,
      started: now.toISOString(),
      finished: now.toISOString(),
      traceId: randomUUID(),
      numDocs: 0,
      passed: false,
      fieldNames: [],
      descriptorVersion: 'version' in query ? query.version : 0,
      status: 'skipped',
      skipReason: skipped.reason,
    };
  }

  private async executeQuery(
    executableQuery: ExecutableQuery
  ): Promise<HealthDiagnosticQueryStats> {
    const { query } = executableQuery;
    const now = new Date();
    const circuitBreakers = this.buildCircuitBreakers();
    const options = { query: executableQuery, circuitBreakers };

    if (!this.queryExecutor) {
      throw new Error('queryExecutor is unavailable');
    }
    const executor = this.queryExecutor;
    const query$ = defer(() => executor.search(options));

    return new Promise<HealthDiagnosticQueryStats>((resolve) => {
      const queryStats: HealthDiagnosticQueryStats = queryStat(query.name, now, query.version);
      let currentPage = 0;

      query$
        .pipe(
          // cap the result set to the max number of documents
          take(telemetryConfiguration.health_diagnostic_config.query.maxDocuments),

          // get the fields names, only once (assume all docs have the same structure)
          tap((doc) => {
            if (queryStats.fieldNames.length === 0) {
              queryStats.fieldNames = fieldNames(doc);
            }
          }),

          // publish N documents in the same EBT
          bufferCount(telemetryConfiguration.health_diagnostic_config.query.bufferSize),

          // emit empty array if no items were buffered (ensures EBT is always sent)
          defaultIfEmpty([]),

          // apply filterlist
          mergeMap((result) =>
            from(
              applyFilterlist(
                result,
                executableQuery.query.filterlist,
                this.salt,
                executableQuery.query,
                telemetryConfiguration.encryption_public_keys
              )
            )
          )
        )
        .subscribe({
          next: (data) => {
            this.logger.debug('Sending query result EBT', {
              queryName: query.name,
              traceId: queryStats.traceId,
            } as LogMeta);

            this.reportEBT(TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_RESULT_EVENT, {
              name: query.name,
              queryId: query.id,
              traceId: queryStats.traceId,
              page: currentPage++,
              data,
            });

            queryStats.numDocs += data.length;
          },
          error: (error) => {
            const failure = {
              message: error.message,
              reason: error instanceof ValidationError ? error.result : undefined,
            };
            if (error instanceof PermissionError) {
              this.logger.debug('Permission error running query.', withErrorMessage(error));
            } else {
              this.logger.warn('Error running query', withErrorMessage(error));
            }
            resolve({
              ...queryStats,
              failure,
              finished: new Date().toISOString(),
              circuitBreakers: this.circuitBreakersStats(circuitBreakers),
              passed: false,
              status: 'failed',
              integration: 'resolution' in executableQuery ? executableQuery.resolution : undefined,
            });
          },
          complete: () => {
            resolve({
              ...queryStats,
              finished: new Date().toISOString(),
              circuitBreakers: this.circuitBreakersStats(circuitBreakers),
              passed: true,
              status: 'success',
              integration: 'resolution' in executableQuery ? executableQuery.resolution : undefined,
            });
          },
        });
    });
  }

  private circuitBreakersStats(circuitBreakers: CircuitBreaker[]): Record<string, unknown> {
    return circuitBreakers.reduce((acc, cb) => {
      acc[cb.constructor.name] = cb.stats();
      return acc;
    }, {} as Record<string, unknown>);
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

    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: { interval: INTERVAL },
      params: {},
      state: { lastExecutionByQuery: {} },
      scope: ['securitySolution'],
    });

    this.logger.info('Task scheduled');
  }

  private buildCircuitBreakers(): CircuitBreaker[] {
    const config = telemetryConfiguration.health_diagnostic_config;
    return [
      new RssGrowthCircuitBreaker(config.rssGrowthCircuitBreaker),
      new TimeoutCircuitBreaker(config.timeoutCircuitBreaker),
      new EventLoopUtilizationCircuitBreaker(config.eventLoopUtilizationCircuitBreaker),
      new EventLoopDelayCircuitBreaker(config.eventLoopDelayCircuitBreaker),
      new ElasticsearchCircuitBreaker(config.elasticsearchCircuitBreaker, this.esClient()),
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
    try {
      this.analytics.reportEvent(eventTypeOpts.eventType, eventData as object);
    } catch (error) {
      this.logger.warn('Error sending EBT', withErrorMessage(error));
    }
  }

  private isParseFailureQuery(query: HealthDiagnosticQuery): query is ParseFailureQuery {
    return '_raw' in query;
  }

  private async getRunnableHealthQueries(
    lastExecutionByQuery: Record<string, number>,
    now: Date
  ): Promise<HealthDiagnosticQuery[]> {
    const healthQueries = await this.healthQueries();
    return healthQueries.filter((query) => {
      this.logger.trace('Evaluating health diagnostic query for execution', {
        query: query.name,
      } as LogMeta);
      try {
        if (this.isParseFailureQuery(query)) {
          // let it pass the filter to send the stats, i.e. this kind of query will be always
          // skipped in the execution phase, but we want to report it in the stats with the
          // parse failure reason.
          return true;
        }
        const { name, scheduleCron, enabled } = query;
        const lastExecutedAt = new Date(lastExecutionByQuery[name] ?? 0);
        return enabled && isDueForExecution(lastExecutedAt, now, scheduleCron);
      } catch (error) {
        this.logger.warn(
          'Error processing health query',
          withErrorMessage(error, {
            name: (query as { name?: string }).name,
          } as LogMeta)
        );
        return false;
      }
    });
  }

  private async healthQueries(): Promise<HealthDiagnosticQuery[]> {
    try {
      const artifact = await artifactService.getArtifact(QUERY_ARTIFACT_ID);
      return parseHealthDiagnosticQueries(artifact.data);
    } catch (error) {
      this.logger.warn('Error getting health diagnostic queries', withErrorMessage(error));
      return [];
    }
  }
}
