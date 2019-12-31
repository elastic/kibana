/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { EventEmitter } = require('events');

import { initRoutes } from './init_routes';

const once = function(emitter, event) {
  return new Promise(resolve => {
    emitter.once(event, data => resolve(data || {}));
  });
};

export default function TaskTestingAPI(kibana) {
  const taskTestingEvents = new EventEmitter();

  return new kibana.Plugin({
    name: 'sampleTask',
    require: ['elasticsearch', 'task_manager'],

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server) {
      const taskManager = {
        ...server.newPlatform.setup.plugins.kibanaTaskManager,
        ...server.newPlatform.start.plugins.kibanaTaskManager,
      };

      const defaultSampleTaskConfig = {
        timeout: '1m',
        // This task allows tests to specify its behavior (whether it reschedules itself, whether it errors, etc)
        // taskInstance.params has the following optional fields:
        //    nextRunMilliseconds: number - If specified, the run method will return a runAt that is now + nextRunMilliseconds
        //    failWith: string - If specified, the task will throw an error with the specified message
        //    failOn: number - If specified, the task will only throw the `failWith` error when `count` equals to the failOn value
        //    waitForParams : boolean - should the task stall ands wait to receive params asynchronously before using the default params
        //    waitForEvent : string - if provided, the task will stall (after completing the run) and wait for an asyn event before completing
        createTaskRunner: ({ taskInstance }) => ({
          async run() {
            const { params, state, id } = taskInstance;
            const prevState = state || { count: 0 };

            const count = (prevState.count || 0) + 1;

            const runParams = {
              ...params,
              // if this task requires custom params provided async - wait for them
              ...(params.waitForParams ? await once(taskTestingEvents, id) : {}),
            };

            if (runParams.failWith) {
              if (!runParams.failOn || (runParams.failOn && count === runParams.failOn)) {
                throw new Error(runParams.failWith);
              }
            }

            const callCluster = server.plugins.elasticsearch.getCluster('admin')
              .callWithInternalUser;
            await callCluster('index', {
              index: '.kibana_task_manager_test_result',
              body: {
                type: 'task',
                taskId: taskInstance.id,
                params: JSON.stringify(runParams),
                state: JSON.stringify(state),
                ranAt: new Date(),
              },
              refresh: true,
            });

            // Stall task  run until a certain event is triggered
            if (runParams.waitForEvent) {
              await once(taskTestingEvents, runParams.waitForEvent);
            }

            return {
              state: { count },
              runAt: millisecondsFromNow(runParams.nextRunMilliseconds),
            };
          },
        }),
      };

      taskManager.registerTaskDefinitions({
        sampleTask: {
          ...defaultSampleTaskConfig,
          title: 'Sample Task',
          description: 'A sample task for testing the task_manager.',
        },
        singleAttemptSampleTask: {
          ...defaultSampleTaskConfig,
          title: 'Failing Sample Task',
          description:
            'A sample task for testing the task_manager that fails on the first attempt to run.',
          // fail after the first failed run
          maxAttempts: 1,
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

      initRoutes(server, taskManager, taskTestingEvents);
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
