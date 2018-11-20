/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

export function initRoutes(server) {
  const { taskManager } = server;

  server.route({
    path: '/api/sample_tasks',
    method: 'POST',
    config: {
      validate: {
        payload: Joi.object({
          taskType: Joi.string().required(),
          interval: Joi.string().optional(),
          params: Joi.object().required(),
          state: Joi.object().optional(),
          id: Joi.string().optional(),
        }),
      },
    },
    async handler(request) {
      try {
        const task = await taskManager.schedule(request.payload, { request });
        return task;
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
        return taskManager.fetch();
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
        const { docs: tasks } = await taskManager.fetch();
        return Promise.all(tasks.map((task) => taskManager.remove(task.id)));
      } catch (err) {
        return err;
      }
    },
  });
}
