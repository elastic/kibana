/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { range } from 'lodash';

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
          trackExecutionTimeline: Joi.boolean().default(false).required(),
        }),
      },
    },
    async handler(request) {
      performanceState.capture();

      const { tasksToSpawn, durationInSeconds, trackExecutionTimeline } = request.payload;
      const startAt = millisecondsFromNow(5000).getTime();
      await Promise.all(
        range(tasksToSpawn)
          .map(taskIndex => taskManager.schedule({
            taskType: 'performanceTestTask',
            params: { startAt, taskIndex, trackExecutionTimeline, runUntil: millisecondsFromNow(durationInSeconds * 1000).getTime() },
            scope: [scope],
          },
          { request }
          ))
      );

      return new Promise(resolve => {
        setTimeout(() => {
          performanceState.endCapture().then(resolve);
        }, durationInSeconds * 1000);
      });
    },
  });
}

function millisecondsFromNow(ms) {
  if (!ms) {
    return;
  }

  const dt = new Date();
  dt.setTime(dt.getTime() + ms);
  return dt;
}
