/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';
import { TELEMETRY_CHANNEL_TIMELINE } from '../constants';
import { ranges, TelemetryTimelineFetcher, newTelemetryLogger } from '../helpers';

export function createTelemetryTimelineTaskConfig() {
  const taskName = 'Security Solution Timeline telemetry';
  const taskType = 'security:telemetry-timelines';
  return {
    type: taskType,
    title: taskName,
    interval: '1h',
    timeout: '15m',
    version: '1.0.1',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const mdc = { task_id: taskId, task_execution_period: taskExecutionPeriod };
      const log = newTelemetryLogger(logger.get('timelines'), mdc);
      const fetcher = new TelemetryTimelineFetcher(receiver);
      const trace = taskMetricsService.start(taskType);

      log.l('Running telemetry task');

      try {
        let counter = 0;

        const { rangeFrom, rangeTo } = ranges(taskExecutionPeriod);

        const alertsIndex = receiver.getAlertsIndex();
        if (!alertsIndex) {
          throw Error('alerts index is not ready yet, skipping telemetry task');
        }
        const alerts = await receiver.fetchTimelineAlerts(alertsIndex, rangeFrom, rangeTo);

        log.l('found alerts to process', { length: alerts.length });

        for (const alert of alerts) {
          const result = await fetcher.fetchTimeline(alert);

          sender.getTelemetryUsageCluster()?.incrementCounter({
            counterName: 'telemetry_timeline',
            counterType: 'timeline_node_count',
            incrementBy: result.nodes,
          });

          sender.getTelemetryUsageCluster()?.incrementCounter({
            counterName: 'telemetry_timeline',
            counterType: 'timeline_event_count',
            incrementBy: result.events,
          });

          if (result.timeline) {
            await sender.sendOnDemand(TELEMETRY_CHANNEL_TIMELINE, [result.timeline]);
            counter += 1;
          } else {
            log.debug('no events in timeline');
          }
        }

        log.l('Concluding timeline task.', { counter });

        await taskMetricsService.end(trace);

        return counter;
      } catch (err) {
        logger.error('could not complete task', { error: err });
        await taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}
