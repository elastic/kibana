/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  RequestHandlerContext,
} from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { schema } from '@kbn/config-schema';
import { TaskCost, TaskPriority, type RunContext } from '@kbn/task-manager-plugin/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import {
  RUM_REPORT_EMAIL_TASK_TYPE,
  RUM_REPORT_SCHEDULE_SO_TYPE,
  type RumReportScheduleAttributes,
} from '../../common/rum_report_schedule';
import type { UxPluginStartDeps } from '../plugin_types';
import type { UxRouteHandlerResources } from '../routes/types';
import { sendRumReportEmail } from './send_rum_report_email';

const paramsSchema = schema.object({
  scheduleId: schema.string({ maxLength: 128 }),
  spaceId: schema.string({ maxLength: 128 }),
});

export const createTaskReportResources = (
  core: CoreSetup<UxPluginStartDeps>,
  logger: Logger,
  request: KibanaRequest
): UxRouteHandlerResources => ({
  request,
  response: {} as KibanaResponseFactory,
  logger,
  context: {
    core: core.getStartServices().then(([coreStart]) => ({
      elasticsearch: {
        client: {
          asCurrentUser: coreStart.elasticsearch.client.asInternalUser,
        },
      },
    })),
  } as unknown as RequestHandlerContext,
  core: {
    setup: core,
    start: () => core.getStartServices().then(([coreStart]) => coreStart),
  },
  startPlugins: async () => {
    const [, plugins] = await core.getStartServices();
    return plugins;
  },
});

const soNamespace = (spaceId: string) =>
  spaceId === DEFAULT_SPACE_ID ? undefined : { namespace: spaceId };

export const registerRumReportEmailTask = ({
  core,
  logger,
  taskManager,
}: {
  core: CoreSetup<UxPluginStartDeps>;
  logger: Logger;
  taskManager: TaskManagerSetupContract;
}): void => {
  taskManager.registerTaskDefinitions({
    [RUM_REPORT_EMAIL_TASK_TYPE]: {
      title: 'UX report email',
      description: 'Builds a RUM report and emails it through a Kibana email connector.',
      timeout: '5m',
      maxAttempts: 1,
      cost: TaskCost.Normal,
      priority: TaskPriority.Low,
      paramsSchema,
      createTaskRunner: ({ taskInstance, fakeRequest, signal }: RunContext) => ({
        run: async () => {
          if (signal.aborted) {
            return { state: {} };
          }
          const params = paramsSchema.validate(taskInstance.params);
          const [coreStart, plugins] = await core.getStartServices();
          if (!plugins.actions) {
            logger.warn('Skipping UX report email: actions plugin is unavailable');
            return { state: {} };
          }
          if (!fakeRequest) {
            logger.warn('Skipping UX report email: fakeRequest is missing');
            return { state: {} };
          }

          const repo = coreStart.savedObjects.createInternalRepository();
          const namespace = soNamespace(params.spaceId);
          const so = await repo.get<RumReportScheduleAttributes>(
            RUM_REPORT_SCHEDULE_SO_TYPE,
            params.scheduleId,
            namespace
          );
          if (!so.attributes.enabled) {
            return { state: {} };
          }

          const resources = createTaskReportResources(core, logger, fakeRequest);
          try {
            await sendRumReportEmail({
              actions: plugins.actions,
              coreStart,
              logger,
              resources,
              schedule: so.attributes,
              scheduleId: params.scheduleId,
              spaceId: params.spaceId,
            });
            await repo.update(
              RUM_REPORT_SCHEDULE_SO_TYPE,
              params.scheduleId,
              {
                ...so.attributes,
                lastRunAt: new Date().toISOString(),
                lastError: undefined,
              },
              namespace
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`UX report email failed for ${params.scheduleId}: ${message}`);
            await repo.update(
              RUM_REPORT_SCHEDULE_SO_TYPE,
              params.scheduleId,
              {
                ...so.attributes,
                lastError: message.slice(0, 1000),
              },
              namespace
            );
          }
          return { state: {} };
        },
      }),
    },
  });
};
