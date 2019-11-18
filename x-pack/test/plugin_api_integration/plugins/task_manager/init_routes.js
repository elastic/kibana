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
            }
          }
        ]
      }
    }
  }
};

export function initRoutes(server) {
  const taskManager = server.plugins.task_manager;

  server.route({
    path: '/api/sample_tasks/schedule',
    method: 'POST',
    config: {
      validate: {
        payload: Joi.object({
          task: Joi.object({
            taskType: Joi.string().required(),
            interval: Joi.string().optional(),
            params: Joi.object().required(),
            state: Joi.object().optional(),
            id: Joi.string().optional()
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

        return await taskManager.schedule(task, { request });
      } catch (err) {
        return err;
      }
    },
  });

  server.route({
    path: '/api/sample_tasks/ensure',
    method: 'POST',
    config: {
      validate: {
        payload: Joi.object({
          task: Joi.object({
            taskType: Joi.string().required(),
            interval: Joi.string().optional(),
            params: Joi.object().required(),
            state: Joi.object().optional(),
            id: Joi.string().optional()
          })
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

        return await taskManager.ensureScheduled(task, { request });
      } catch (err) {
        return err;
      }
    },
  });

  server.route({
    path: '/api/sample_tasks/reschedule',
    method: 'POST',
    config: {
      validate: {
        payload: Joi.object({
          task: Joi.object({
            interval: Joi.string().optional(),
            id: Joi.string().required()
          })
        }),
      },
    },
    async handler(request) {
      try {
        const { task } = request.payload;

        return await taskManager.reschedule(task);
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
    }
  });

  server.route({
    path: '/api/sample_tasks',
    method: 'DELETE',
    async handler() {
      try {
        const { docs: tasks } = await taskManager.fetch({
          query: taskManagerQuery,
        });
        return Promise.all(tasks.map((task) => taskManager.remove(task.id)));
      } catch (err) {
        return err;
      }
    },
  });
}
