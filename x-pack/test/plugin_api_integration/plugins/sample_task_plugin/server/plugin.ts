/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { Plugin, CoreSetup, CoreStart } from 'src/core/server';
import { EventEmitter } from 'events';
import { firstValueFrom, Subject } from 'rxjs';
import { initRoutes } from './init_routes';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  ConcreteTaskInstance,
  EphemeralTask,
} from '../../../../../plugins/task_manager/server';
import { DEFAULT_MAX_WORKERS } from '../../../../../plugins/task_manager/server/config';

// this plugin's dependendencies
export interface SampleTaskManagerFixtureSetupDeps {
  taskManager: TaskManagerSetupContract;
}
export interface SampleTaskManagerFixtureStartDeps {
  taskManager: TaskManagerStartContract;
}

export class SampleTaskManagerFixturePlugin
  implements
    Plugin<void, void, SampleTaskManagerFixtureSetupDeps, SampleTaskManagerFixtureStartDeps>
{
  taskManagerStart$: Subject<TaskManagerStartContract> = new Subject<TaskManagerStartContract>();
  taskManagerStart: Promise<TaskManagerStartContract> = firstValueFrom(this.taskManagerStart$);

  public setup(core: CoreSetup, { taskManager }: SampleTaskManagerFixtureSetupDeps) {
    const taskTestingEvents = new EventEmitter();
    taskTestingEvents.setMaxListeners(DEFAULT_MAX_WORKERS * 2);

    const tmStart = this.taskManagerStart;

    const defaultSampleTaskConfig = {
      timeout: '1m',
      // This task allows tests to specify its behavior (whether it reschedules itself, whether it errors, etc)
      // taskInstance.params has the following optional fields:
      //    nextRunMilliseconds: number - If specified, the run method will return a runAt that is now + nextRunMilliseconds
      //    failWith: string - If specified, the task will throw an error with the specified message
      //    failOn: number - If specified, the task will only throw the `failWith` error when `count` equals to the failOn value
      //    waitForParams : boolean - should the task stall ands wait to receive params asynchronously before using the default params
      //    waitForEvent : string - if provided, the task will stall (after completing the run) and wait for an asyn event before completing
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => ({
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

          const [{ elasticsearch }] = await core.getStartServices();
          await elasticsearch.client.asInternalUser.index({
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
      sampleTaskWithSingleConcurrency: {
        ...defaultSampleTaskConfig,
        title: 'Sample Task With Single Concurrency',
        maxConcurrency: 1,
        timeout: '60s',
        description: 'A sample task that can only have one concurrent instance.',
      },
      sampleTaskWithLimitedConcurrency: {
        ...defaultSampleTaskConfig,
        title: 'Sample Task With Max Concurrency of 2',
        maxConcurrency: 2,
        timeout: '60s',
        description: 'A sample task that can only have two concurrent instance.',
      },
      sampleRecurringTaskTimingOut: {
        title: 'Sample Recurring Task that Times Out',
        description: 'A sample task that times out each run.',
        maxAttempts: 3,
        timeout: '1s',
        createTaskRunner: () => ({
          async run() {
            return await new Promise((resolve) => {});
          },
        }),
      },
      sampleRecurringTaskWhichHangs: {
        title: 'Sample Recurring Task that Hangs for a minute',
        description: 'A sample task that Hangs for a minute on each run.',
        maxAttempts: 3,
        timeout: '60s',
        createTaskRunner: () => ({
          async run() {
            return await new Promise((resolve) => {});
          },
        }),
      },
      sampleOneTimeTaskTimingOut: {
        title: 'Sample One-Time Task that Times Out',
        description: 'A sample task that times out each run.',
        maxAttempts: 3,
        timeout: '1s',
        getRetry: (attempts: number, error: object) => new Date(Date.now() + _.random(2, 5) * 1000),
        createTaskRunner: () => ({
          async run() {
            return await new Promise((resolve) => {});
          },
        }),
      },
    });

    const taskWithTiming = {
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => ({
        async run() {
          const stopTiming = startTaskTimer();

          const {
            params: { delay = 0 },
            state: { timings = [] },
          } = taskInstance;

          if (delay) {
            await new Promise((resolve) => {
              setTimeout(resolve, delay);
            });
          }

          return {
            state: { timings: [...timings, stopTiming()] },
          };
        },
      }),
    };

    taskManager.registerTaskDefinitions({
      timedTask: {
        title: 'Task With Tracked Timings',
        timeout: '60s',
        description: 'A task that tracks its execution timing.',
        ...taskWithTiming,
      },
      timedTaskWithSingleConcurrency: {
        title: 'Task With Tracked Timings and Single Concurrency',
        maxConcurrency: 1,
        timeout: '60s',
        description:
          'A task that can only have one concurrent instance and tracks its execution timing.',
        ...taskWithTiming,
      },
      timedTaskWithLimitedConcurrency: {
        title: 'Task With Tracked Timings and Limited Concurrency',
        maxConcurrency: 2,
        timeout: '60s',
        description:
          'A task that can only have two concurrent instance and tracks its execution timing.',
        ...taskWithTiming,
      },
      taskWhichExecutesOtherTasksEphemerally: {
        title: 'Task Which Executes Other Tasks Ephemerally',
        description: 'A sample task used to validate how ephemeral tasks are executed.',
        maxAttempts: 1,
        timeout: '60s',
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => ({
          async run() {
            const {
              params: { tasks = [] },
            } = taskInstance;

            const tm = await tmStart;
            const executions = await Promise.all(
              (tasks as EphemeralTask[]).map(async (task) => {
                return tm
                  .ephemeralRunNow(task)
                  .then((result) => ({
                    result,
                  }))
                  .catch((error) => ({
                    error,
                  }));
              })
            );

            return {
              state: { executions },
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

      async beforeMarkRunning(context) {
        if (context.taskInstance?.params?.originalParams?.throwOnMarkAsRunning) {
          throw new Error(`Sample task ${context.taskInstance.id} threw on MarkAsRunning`);
        }
        return context;
      },
    });
    initRoutes(core.http.createRouter(), this.taskManagerStart, taskTestingEvents);
  }

  public start(core: CoreStart, { taskManager }: SampleTaskManagerFixtureStartDeps) {
    this.taskManagerStart$.next(taskManager);
    this.taskManagerStart$.complete();
  }
  public stop() {}
}

function millisecondsFromNow(ms: number) {
  if (!ms) {
    return;
  }

  const dt = new Date();
  dt.setTime(dt.getTime() + ms);
  return dt;
}

const once = function (emitter: EventEmitter, event: string): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    emitter.once(event, (data) => resolve(data || {}));
  });
};

function startTaskTimer(): () => { start: number; stop: number } {
  const start = Date.now();
  return () => ({ start, stop: Date.now() });
}
