/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { Logger, IRouter } from '@kbn/core/server';
import type { ITelemetryReceiver } from '../receiver';
import type { ITelemetryEventsSender } from '../sender';
import { TaskMetricsService } from '../task_metrics';
import { telemetryConfiguration } from '../configuration';
import { createIngestStatsTaskConfig } from '../tasks/ingest_pipelines_stats';

// TODO: just to test the POC, remove
export const getTriggerIngestPipelinesStatsTaskRoute = (
  router: IRouter,
  logger: Logger,
  receiver: ITelemetryReceiver,
  sender: ITelemetryEventsSender
) => {
  router.get(
    {
      path: '/api/trigger-ingest-pipelines-stats-task',
      options: {
        tags: ['api'],
        access: 'public',
        summary: 'Trigger ingest pipelines stats task (for testing purposes)',
      },
      validate: {
        query: schema.object({
          enabled: schema.maybe(schema.boolean()),
        }),
      },
    },
    async (_context, request, response) => {
      const taskMetricsService = new TaskMetricsService(logger, sender);
      const task = createIngestStatsTaskConfig();
      const timeStart = performance.now();

      const taskConfig = telemetryConfiguration.ingest_pipelines_stats_config;

      taskConfig.enabled = request.query.enabled;

      logger.info('Triggering ingest pipelines stats task');

      const result = await task.runTask('id', logger, receiver, sender, taskMetricsService, {
        last: '',
        current: '',
      });
      const elapsedTime = performance.now() - timeStart;

      return response.ok({
        body: {
          message: `Task finished`,
          indices: result,
          enabled: taskConfig.enabled,
          elapsed_time: elapsedTime,
        },
      });
    }
  );
};
