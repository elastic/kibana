/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initRoutes } from './init_routes';

export default function TaskTestingAPI(kibana) {
  return new kibana.Plugin({
    name: 'sampleTask',
    require: ['elasticsearch', 'task_manager'],

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server) {
      const taskManager = server.plugins.task_manager;

      taskManager.registerTaskDefinitions({
        sampleTask: {
          title: 'Sample Task',
          description: 'A sample task for testing the task_manager.',
          timeout: '1m',

          // This task allows tests to specify its behavior (whether it reschedules itself, whether it errors, etc)
          // taskInstance.params has the following optional fields:
          // nextRunMilliseconds: number - If specified, the run method will return a runAt that is now + nextRunMilliseconds
          // failWith: string - If specified, the task will throw an error with the specified message
          createTaskRunner: ({ taskInstance }) => ({
            async run() {
              const { params, state } = taskInstance;
              const prevState = state || { count: 0 };

              if (params.failWith) {
                throw new Error(params.failWith);
              }

              const callCluster = server.plugins.elasticsearch.getCluster('admin')
                .callWithInternalUser;
              await callCluster('index', {
                index: '.task_manager_test_result',
                body: {
                  type: 'task',
                  taskId: taskInstance.id,
                  params: JSON.stringify(params),
                  state: JSON.stringify(state),
                  ranAt: new Date(),
                },
                refresh: true,
              });

              return {
                state: { count: (prevState.count || 0) + 1 },
                runAt: millisecondsFromNow(params.nextRunMilliseconds),
              };
            },
          }),
        },
      });

      taskManager.addMiddleware({
        async beforeSave({ taskInstance, ...opts }) {
          const modifiedInstance = {
            ...taskInstance,
            params: {
              originalParams: taskInstance.params,
              superFly: 'My middleware param!',
            },
          };

          return {
            ...opts,
            taskInstance: modifiedInstance,
          };
        },

        async beforeRun({ taskInstance, ...opts }) {
          return {
            ...opts,
            taskInstance: {
              ...taskInstance,
              params: taskInstance.params.originalParams,
            },
          };
        },
      });

      initRoutes(server);
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
