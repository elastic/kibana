/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogMeta, Logger } from '@kbn/core/server';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';
import { TelemetryCounter } from '../types';
import {
  createUsageCounterLabel,
  getPreviousDailyTaskTimestamp,
  newTelemetryLogger,
} from '../helpers';
import { TELEMETRY_NODE_INGEST_PIPELINES_STATS_EVENT } from '../event_based/events';
import { telemetryConfiguration } from '../configuration';

const COUNTER_LABELS = ['security_solution', 'pipelines-stats'];

export function createIngestStatsTaskConfig() {
  const taskType = 'security:ingest-pipelines-stats-telemetry';
  return {
    type: taskType,
    title: 'Security Solution Telemetry Ingest Pipelines Stats task',
    interval: '24h',
    timeout: '5m',
    version: '1.0.0',
    getLastExecutionTime: getPreviousDailyTaskTimestamp,
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const mdc = { task_id: taskId, task_execution_period: taskExecutionPeriod };
      const log = newTelemetryLogger(logger.get('indices-metadata'), mdc);
      const trace = taskMetricsService.start(taskType);

      const taskConfig = telemetryConfiguration.ingest_pipelines_stats_config;

      const start = performance.now();

      try {
        logger.info('Running ingest stats task');

        if (!taskConfig.enabled) {
          logger.info('Ingest stats task is disabled, skipping');
          await taskMetricsService.end(trace);
          return 0;
        }

        const ingestStats = await receiver.getIngestPipelinesStats('3m');

        logger.info('Got ingest stats, about to publish EBT events', {
          count: ingestStats.length,
        } as LogMeta);

        ingestStats.forEach((stats) => {
          sender.reportEBT(TELEMETRY_NODE_INGEST_PIPELINES_STATS_EVENT, stats);
        });

        const telemetryUsageCounter = sender.getTelemetryUsageCluster();

        telemetryUsageCounter?.incrementCounter({
          counterName: createUsageCounterLabel(COUNTER_LABELS.concat('events')),
          counterType: TelemetryCounter.DOCS_SENT,
          incrementBy: ingestStats.length,
        });

        await taskMetricsService.end(trace);

        log.info('Ingest stats task completed', {
          count: ingestStats.length,
          elapsed: performance.now() - start,
        } as LogMeta);

        return ingestStats.length;
      } catch (error) {
        log.warn(`Error running ingest stats task`, {
          error,
          elapsed: performance.now() - start,
        });
        await taskMetricsService.end(trace, error);
        return 0;
      }
    },
  };
}
