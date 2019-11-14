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
    path: '/api/sample_tasks',
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
          ensureScheduled: Joi.boolean()
            .default(false)
            .optional(),
        }),
      },
    },
    async handler(request) {
      try {
        const { ensureScheduled = false, task: taskFields } = request.payload;
        const task = {
          ...taskFields,
          scope: [scope],
        };

        const taskResult = await (
          ensureScheduled
            ? taskManager.ensureScheduled(task, { request })
            : taskManager.schedule(task, { request })
        );

        return taskResult;
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
