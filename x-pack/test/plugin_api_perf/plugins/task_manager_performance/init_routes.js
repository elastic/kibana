/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

const scope = 'perf-testing';
export function initRoutes(server, performanceState) {
  const taskManager = server.plugins.task_manager;

  server.route({
    path: '/api/perf_tasks',
    method: 'POST',
    config: {
      validate: {
        payload: Joi.object({
          tasksToSpawn: Joi.number().required(),
          durationInSeconds: Joi.number().required(),
          trackExecutionTimeline: Joi.boolean()
            .default(false)
            .required(),
        }),
      },
    },
    async handler(request) {
      const { tasksToSpawn, durationInSeconds, trackExecutionTimeline } = request.payload;
      const tasks = [];

      for (let taskIndex = 0; taskIndex < tasksToSpawn; taskIndex++) {
        tasks.push(
          await taskManager.schedule(
            {
              taskType: 'performanceTestTask',
              params: { taskIndex, trackExecutionTimeline },
              scope: [scope],
            },
            { request }
          )
        );
      }

      return new Promise(resolve => {
        setTimeout(() => {
          resolve(performanceState);
        }, durationInSeconds * 1000);
      });
    },
  });
}
