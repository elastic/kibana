/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import {
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  IRouter,
  CoreSetup,
} from 'src/core/server';
import { EventEmitter } from 'events';
import { TaskManagerStartContract } from '../../../../../plugins/task_manager/server';

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
  core: CoreSetup,
  taskManagerStart: Promise<TaskManagerStartContract>,
  taskTestingEvents: EventEmitter
) {
  async function ensureIndexIsRefreshed() {
    return await core.elasticsearch.legacy.client.callAsInternalUser('indices.refresh', {
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
      try {
        const taskManager = await taskManagerStart;
        const { task: taskFields } = req.body;
        const task = {
          ...taskFields,
          scope: [scope],
        };

        const taskResult = await taskManager.schedule(task, { req });

        return res.ok({ body: taskResult });
      } catch (err) {
        return res.internalError({ body: err });
      }
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
        await ensureIndexIsRefreshed();
        const taskManager = await taskManagerStart;
        return res.ok({ body: await taskManager.get(req.params.taskId) });
      } catch (err) {
        return res.ok({ body: err });
      }
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
      } catch (err) {
        return res.ok({ body: err });
      }
    }
  );
}
