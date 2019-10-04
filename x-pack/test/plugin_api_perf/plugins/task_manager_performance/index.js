/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initRoutes } from './init_routes';

function avg(items) {
  return (
    items.reduce((sum, val) => {
      return sum + val;
    }, 0) / items.length
  );
}

export default function TaskManagerPerformanceAPI(kibana) {
  return new kibana.Plugin({
    name: 'perfTask',
    require: ['elasticsearch', 'task_manager'],

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server) {
      const taskManager = server.plugins.task_manager;
      const performanceState = {
        runningAverageTasks: 0,
        averagesTaken: [],
        runningAverageLeadTime: -1,
        averagesTakenLeadTime: [],
        leadTimeQueue: [],
      };

      setInterval(() => {
        const tasks = performanceState.leadTimeQueue.length;
        console.log(`I have processed ${tasks} tasks in the past 5s`);
        if (tasks > 0) {
          const latestAverage = avg(performanceState.leadTimeQueue.splice(0, tasks));

          performanceState.averagesTakenLeadTime.push(latestAverage);
          performanceState.averagesTaken.push(tasks);
          if (performanceState.averagesTakenLeadTime.length > 1) {
            performanceState.runningAverageLeadTime = avg(performanceState.averagesTakenLeadTime);
            performanceState.runningAverageTasks = avg(performanceState.averagesTaken);
          } else {
            performanceState.runningAverageLeadTime = latestAverage;
            performanceState.runningAverageTasks = tasks;
          }
        }
      }, 5000);

      taskManager.registerTaskDefinitions({
        performanceTestTask: {
          title: 'Perf Test Task',
          description: 'A task for stress testing task_manager.',
          timeout: '1m',

          createTaskRunner: ({ taskInstance }) => {
            return {
              async run() {
                const { state } = taskInstance;
                const leadTime = Date.now() - taskInstance.runAt;
                performanceState.leadTimeQueue.push(leadTime);
                return {
                  state,
                  runAt: millisecondsFromNow(1000),
                };
              },
            };
          },
        },
      });

      initRoutes(server, performanceState);
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
