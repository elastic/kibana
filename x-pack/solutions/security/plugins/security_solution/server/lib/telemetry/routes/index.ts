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
import { createTelemetryIndicesMetadataTaskConfig } from '../tasks/indices.metadata';
import { telemetryConfiguration } from '../configuration';

// TODO: just to test the POC, remove
export const getTriggerIndicesMetadataTaskRoute = (
  router: IRouter,
  logger: Logger,
  receiver: ITelemetryReceiver,
  sender: ITelemetryEventsSender
) => {
  router.get(
    {
      path: '/api/trigger-indices-metadata-task',
      options: {
        tags: ['api'],
        access: 'public',
        summary: 'Trigger indices metadata task (for testing purposes)',
      },
      validate: {
        query: schema.object({
          datastreamsThreshold: schema.maybe(schema.number()),
          indicesThreshold: schema.maybe(schema.number()),
          indicesSettingsThreshold: schema.maybe(schema.number()),
        }),
      },
    },
    async (_context, request, response) => {
      const taskMetricsService = new TaskMetricsService(logger, sender);
      const task = createTelemetryIndicesMetadataTaskConfig();
      const timeStart = performance.now();

      const taskConfig = telemetryConfiguration.indices_metadata_config;

      taskConfig.indices_threshold = request.query.indicesThreshold || 100;
      taskConfig.datastreams_threshold = request.query.datastreamsThreshold || 100;
      taskConfig.indices_settings_threshold = request.query.indicesSettingsThreshold || 100;

      const detail = {
        indicesThreshold: taskConfig.indices_threshold,
        dataStreamsThreshold: taskConfig.datastreams_threshold,
        indicesSettingsThreshold: taskConfig.indices_settings_threshold,
      };

      logger.info(`Triggering indices metadata task ${detail}`);

      const result = await task.runTask('id', logger, receiver, sender, taskMetricsService, {
        last: '',
        current: '',
      });
      const elapsedTime = performance.now() - timeStart;

      return response.ok({
        body: {
          message: `Task finished`,
          indices: result,
          execution_detail: detail,
          elapsed_time: elapsedTime,
        },
      });
    }
  );
};
