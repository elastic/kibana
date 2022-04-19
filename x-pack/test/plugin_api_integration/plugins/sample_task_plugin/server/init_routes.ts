/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  IRouter,
  IScopedClusterClient,
} from '@kbn/core/server';
import { EventEmitter } from 'events';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

const scope = 'testing';
const taskManagerQuery = {
  bool: {
    filter: {
      bool: {
        must: [
          {
            term: {
              'task.scope': scope,
            },
          },
        ],
      },
    },
  },
};

export function initRoutes(
  router: IRouter,
  taskManagerStart: Promise<TaskManagerStartContract>,
  taskTestingEvents: EventEmitter
) {
  async function ensureIndexIsRefreshed(client: IScopedClusterClient) {
    return await client.asInternalUser.indices.refresh({
      index: '.kibana_task_manager',
    });
  }

  router.post(
    {
      path: `/api/sample_tasks/schedule`,
      validate: {
        body: schema.object({
          task: schema.object({
            taskType: schema.string(),
            schedule: schema.maybe(
              schema.object({
                interval: schema.string(),
              })
            ),
            interval: schema.maybe(schema.string()),
            params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
            state: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
            id: schema.maybe(schema.string()),
          }),
        }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const taskManager = await taskManagerStart;
      const { task: taskFields } = req.body;
      const task = {
        ...taskFields,
        scope: [scope],
      };

      const taskResult = await taskManager.schedule(task, { req });

      return res.ok({ body: taskResult });
    }
  );

  router.post(
    {
      path: `/api/sample_tasks/run_now`,
      validate: {
        body: schema.object({
          task: schema.object({
            id: schema.string({}),
          }),
        }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const {
        task: { id },
      } = req.body;
      try {
        const taskManager = await taskManagerStart;
        return res.ok({ body: await taskManager.runNow(id) });
      } catch (err) {
        return res.ok({ body: { id, error: `${err}` } });
      }
    }
  );

  router.post(
    {
      path: `/api/sample_tasks/ephemeral_run_now`,
      validate: {
        body: schema.object({
          task: schema.object({
            taskType: schema.string(),
            state: schema.recordOf(schema.string(), schema.any()),
            params: schema.recordOf(schema.string(), schema.any()),
          }),
        }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<
        any,
        any,
        {
          task: {
            taskType: string;
            params: Record<string, any>;
            state: Record<string, any>;
          };
        },
        any
      >,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const { task } = req.body;
      try {
        const taskManager = await taskManagerStart;
        return res.ok({ body: await taskManager.ephemeralRunNow(task) });
      } catch (err) {
        return res.ok({ body: { task, error: `${err}` } });
      }
    }
  );

  router.post(
    {
      path: `/api/sample_tasks/ensure_scheduled`,
      validate: {
        body: schema.object({
          task: schema.object({
            taskType: schema.string(),
            params: schema.object({}),
            state: schema.maybe(schema.object({})),
            id: schema.maybe(schema.string()),
          }),
        }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      try {
        const { task: taskFields } = req.body;
        const task = {
          ...taskFields,
          scope: [scope],
        };

        const taskManager = await taskManagerStart;
        const taskResult = await taskManager.ensureScheduled(task, { req });

        return res.ok({ body: taskResult });
      } catch (err) {
        return res.ok({ body: err });
      }
    }
  );

  router.post(
    {
      path: `/api/sample_tasks/event`,
      validate: {
        body: schema.object({
          event: schema.string(),
          data: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
        }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      try {
        const { event, data } = req.body;
        taskTestingEvents.emit(event, data);
        return res.ok({ body: event });
      } catch (err) {
        return res.ok({ body: err });
      }
    }
  );

  router.get(
    {
      path: `/api/sample_tasks`,
      validate: {},
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      try {
        const taskManager = await taskManagerStart;
        return res.ok({
          body: await taskManager.fetch({
            query: taskManagerQuery,
          }),
        });
      } catch (err) {
        return res.ok({ body: err });
      }
    }
  );

  router.get(
    {
      path: `/api/sample_tasks/task/{taskId}`,
      validate: {
        params: schema.object({
          taskId: schema.string(),
        }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      try {
        await ensureIndexIsRefreshed((await context.core).elasticsearch.client);
        const taskManager = await taskManagerStart;
        return res.ok({ body: await taskManager.get(req.params.taskId) });
      } catch ({ isBoom, output, message }) {
        return res.ok({ body: isBoom ? output.payload : { message } });
      }
    }
  );

  router.get(
    {
      path: `/api/ensure_tasks_index_refreshed`,
      validate: {},
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      await ensureIndexIsRefreshed((await context.core).elasticsearch.client);
      return res.ok({ body: {} });
    }
  );

  router.delete(
    {
      path: `/api/sample_tasks`,
      validate: {},
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      try {
        await ensureIndexIsRefreshed((await context.core).elasticsearch.client);
        let tasksFound = 0;
        const taskManager = await taskManagerStart;
        do {
          const { docs: tasks } = await taskManager.fetch({
            query: taskManagerQuery,
          });
          tasksFound = tasks.length;
          await Promise.all(tasks.map((task) => taskManager.remove(task.id)));
        } while (tasksFound > 0);
        return res.ok({ body: 'OK' });
      } catch ({ isBoom, output, message }) {
        return res.ok({ body: isBoom ? output.payload : { message } });
      }
    }
  );
}
