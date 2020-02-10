/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

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

export function initRoutes(server, taskManager, legacyTaskManager, taskTestingEvents) {
  const callCluster = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;

  async function ensureIndexIsRefreshed() {
    return await callCluster('indices.refresh', {
      index: '.kibana_task_manager',
    });
  }

  server.route({
    path: '/api/sample_tasks/schedule',
    method: 'POST',
    config: {
      validate: {
        payload: Joi.object({
          task: Joi.object({
            taskType: Joi.string().required(),
            schedule: Joi.object({
              interval: Joi.string(),
            }).optional(),
            interval: Joi.string().optional(),
            params: Joi.object().required(),
            state: Joi.object().optional(),
            id: Joi.string().optional(),
          }),
        }),
      },
    },
    async handler(request) {
      try {
        const { task: taskFields } = request.payload;
        const task = {
          ...taskFields,
          scope: [scope],
        };

        const taskResult = await taskManager.schedule(task, { request });

        return taskResult;
      } catch (err) {
        return err;
      }
    },
  });

  /*
    Schedule using legacy Api
   */
  server.route({
    path: '/api/sample_tasks/schedule_legacy',
    method: 'POST',
    config: {
      validate: {
        payload: Joi.object({
          task: Joi.object({
            taskType: Joi.string().required(),
            schedule: Joi.object({
              interval: Joi.string(),
            }).optional(),
            interval: Joi.string().optional(),
            params: Joi.object().required(),
            state: Joi.object().optional(),
            id: Joi.string().optional(),
          }),
        }),
      },
    },
    async handler(request) {
      try {
        const { task: taskFields } = request.payload;
        const task = {
          ...taskFields,
          scope: [scope],
        };

        const taskResult = await legacyTaskManager.schedule(task, { request });

        return taskResult;
      } catch (err) {
        return err;
      }
    },
  });

  server.route({
    path: '/api/sample_tasks/run_now',
    method: 'POST',
    config: {
      validate: {
        payload: Joi.object({
          task: Joi.object({
            id: Joi.string().optional(),
          }),
        }),
      },
    },
    async handler(request) {
      const {
        task: { id },
      } = request.payload;
      try {
        return await taskManager.runNow(id);
      } catch (err) {
        return { id, error: `${err}` };
      }
    },
  });

  server.route({
    path: '/api/sample_tasks/ensure_scheduled',
    method: 'POST',
    config: {
      validate: {
        payload: Joi.object({
          task: Joi.object({
            taskType: Joi.string().required(),
            params: Joi.object().required(),
            state: Joi.object().optional(),
            id: Joi.string().optional(),
          }),
        }),
      },
    },
    async handler(request) {
      try {
        const { task: taskFields } = request.payload;
        const task = {
          ...taskFields,
          scope: [scope],
        };

        const taskResult = await taskManager.ensureScheduled(task, { request });

        return taskResult;
      } catch (err) {
        return err;
      }
    },
  });

  server.route({
    path: '/api/sample_tasks/event',
    method: 'POST',
    config: {
      validate: {
        payload: Joi.object({
          event: Joi.string().required(),
          data: Joi.object()
            .optional()
            .default({}),
        }),
      },
    },
    async handler(request) {
      try {
        const { event, data } = request.payload;
        taskTestingEvents.emit(event, data);
        return { event };
      } catch (err) {
        return err;
      }
    },
  });

  server.route({
    path: '/api/sample_tasks',
    method: 'GET',
    async handler() {
      try {
        return taskManager.fetch({
          query: taskManagerQuery,
        });
      } catch (err) {
        return err;
      }
    },
  });

  server.route({
    path: '/api/sample_tasks/task/{taskId}',
    method: 'GET',
    async handler(request) {
      try {
        await ensureIndexIsRefreshed();
        return await taskManager.get(request.params.taskId);
      } catch (err) {
        return err;
      }
    },
  });

  server.route({
    path: '/api/sample_tasks',
    method: 'DELETE',
    async handler() {
      try {
        let tasksFound = 0;
        do {
          const { docs: tasks } = await taskManager.fetch({
            query: taskManagerQuery,
          });
          tasksFound = tasks.length;
          await Promise.all(tasks.map(task => taskManager.remove(task.id)));
        } while (tasksFound > 0);
        return 'OK';
      } catch (err) {
        return err;
      }
    },
  });
}
