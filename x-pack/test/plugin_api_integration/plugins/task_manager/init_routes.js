/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

export function initRoutes(server) {
  const { client: taskManagerClient } = server.plugins.taskManager;

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
        }),
      },
    },
    async handler(request, reply) {
      try {
        const task = await taskManagerClient.schedule(request.payload, { request });
        reply(task);
      } catch (err) {
        reply(err);
      }
    },
  });

  server.route({
    path: '/api/sample_tasks',
    method: 'GET',
    async handler(_req, reply) {
      try {
        reply(taskManagerClient.fetch());
      } catch (err) {
        reply(err);
      }
    }
  });

  server.route({
    path: '/api/sample_tasks',
    method: 'DELETE',
    async handler(_req, reply) {
      try {
        const { docs: tasks } = await taskManagerClient.fetch();
        reply(Promise.all(tasks.map((task) => taskManagerClient.remove(task.id))));
      } catch (err) {
        reply(err);
      }
    },
  });
}
