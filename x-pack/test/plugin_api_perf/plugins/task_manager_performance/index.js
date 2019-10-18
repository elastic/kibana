/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { initRoutes } from './init_routes';

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
        runningAverageTasksPerSecond: 0,
        averagesTaken: [],
        runningAverageLeadTime: -1,
        averagesTakenLeadTime: [],
        leadTimeQueue: [],
        timelines: {}
      };

      function flushPerfStats() {
        setTimeout(flushPerfStats, 5000);
        const tasks = performanceState.leadTimeQueue.length;
        console.log(`I have processed ${tasks} tasks in the past 5s (${tasks / 5} per second)`);
        if (tasks > 0) {
          const latestAverage = avg(performanceState.leadTimeQueue.splice(0, tasks));

          performanceState.averagesTakenLeadTime.push(latestAverage);
          performanceState.averagesTaken.push(tasks);
          if (performanceState.averagesTakenLeadTime.length > 1) {
            performanceState.runningAverageLeadTime = avg(performanceState.averagesTakenLeadTime);
            performanceState.runningAverageTasksPerSecond = avg(performanceState.averagesTaken) / 5;
          } else {
            performanceState.runningAverageLeadTime = latestAverage;
            performanceState.runningAverageTasksPerSecond = tasks / 5;
          }
        }
      }

      setTimeout(flushPerfStats, 5000);

      const title = 'Perf Test Task';

      taskManager.registerTaskDefinitions({
        performanceTestTask: {
          title,
          description: 'A task for stress testing task_manager.',
          timeout: '1m',

          createTaskRunner: ({ taskInstance }) => {
            return {
              async run() {
                const { params, state } = taskInstance;

                const counter = (state.counter ? 1 + state.counter : 1);

                const now = Date.now();
                const leadTime = now - taskInstance.runAt;
                performanceState.leadTimeQueue.push(leadTime);

                // schedule to run next cycle as soon as possible
                const runAt = calRunAt(params, counter);

                const stateUpdated = {
                  ...state,
                  counter
                };

                if(params.trackExecutionTimeline) {
                  const id = taskInstance.id.split('-')[0];
                  performanceState.timelines[id] = performanceState.timelines[id] || [];

                  if(stateUpdated.timeline && stateUpdated.timeline.length) {
                    stateUpdated
                      .timeline
                      .splice(0, stateUpdated.timeline.length)
                      .forEach(i => performanceState.timelines[id].push(i));
                  }

                  performanceState.timelines[id].push({
                    event: 'run',
                    owner: taskInstance.ownerId.split('-')[0],
                    counter,
                    leadTime,
                    ranAt: now
                  });
                }

                return {
                  state: stateUpdated,
                  runAt,
                };
              },
            };
          },
        },
      });

      taskManager.addMiddleware({
        async beforeSave({ taskInstance, ...opts }) {
          const modifiedInstance = {
            ...taskInstance
          };

          if (taskInstance.params && taskInstance.params.trackExecutionTimeline) {
            const now = new Date();
            modifiedInstance.state = modifiedInstance.state || {};
            modifiedInstance.state.timeline = modifiedInstance.state.timeline || [];
            modifiedInstance.state.timeline.push({
              event: 'scheduled',
              markAt: now.getTime(),
            });
          }

          return {
            ...opts,
            taskInstance: modifiedInstance
          };
        },

        async beforeMarkRunning({ taskInstance, ...opts }) {
          const modifiedInstance = {
            ...taskInstance
          };

          if (modifiedInstance.state && modifiedInstance.state.timeline) {
            const now = new Date();
            const leadTime = now.getTime() - modifiedInstance.runAt.getTime();

            modifiedInstance.state.timeline.push({
              event: 'markTaskAsRunning',
              leadTime,
              markAt: now.getTime(),
            });
          }

          return {
            ...opts,
            taskInstance: modifiedInstance,
          };
        }
      });

      initRoutes(server, {
        summarize() {
          const { runningAverageTasksPerSecond, runningAverageLeadTime, timelines } = performanceState;

          const {
            numberOfTasksRanOverall,
            timeUntilFirstRun,
            timeUntilFirstMarkAsRun,
            timeFromMarkAsRunTillRun,
            timeFromRunTillNextMarkAsRun
          } = Object
            .entries(timelines)
            .reduce((summary, [, taskInstanceTimeline]) => {
              summary.numberOfTasksRanOverall =
                summary.numberOfTasksRanOverall + _.filter(taskInstanceTimeline, ({ event }) =>  event === 'run').length;

              const firstRunEvent = _.find(
                taskInstanceTimeline,
                ({ event }) =>  event === 'run').ranAt;

              const firstMarkRunEvent = _.find(
                taskInstanceTimeline,
                ({ event }) =>  event === 'markTaskAsRunning').markAt;

              const scheduleEvent = _.find(
                taskInstanceTimeline,
                ({ event }) =>  event === 'scheduled').markAt;

              summary.timeUntilFirstMarkAsRun.push(firstMarkRunEvent - scheduleEvent);
              summary.timeUntilFirstRun.push(firstRunEvent - scheduleEvent);

              summary.timeFromMarkAsRunTillRun.push(..._.zip(
                _.filter(taskInstanceTimeline, ({ event }) =>  event === 'markTaskAsRunning'),
                _.filter(taskInstanceTimeline, ({ event }) =>  event === 'run')
              ).map(([markTaskAsRunning, run]) => run.ranAt - markTaskAsRunning.markAt));

              summary.timeFromRunTillNextMarkAsRun.push(..._.zip(
                _.dropRight(_.filter(taskInstanceTimeline, ({ event }) =>  event === 'run'), 1),
                _.drop(_.filter(taskInstanceTimeline, ({ event }) =>  event === 'markTaskAsRunning'), 1)
              ).map(([run, markTaskAsRunning]) =>  markTaskAsRunning.markAt - run.ranAt));

              return summary;
            }, {
              numberOfTasksRanOverall: 0,
              timeUntilFirstRun: [],
              timeUntilFirstMarkAsRun: [],
              timeFromMarkAsRunTillRun: [],
              timeFromRunTillNextMarkAsRun: []
            });

          return {
            runningAverageTasksPerSecond,
            runningAverageLeadTime,
            numberOfTasksRanOverall,
            timeUntilFirstRun: avg(timeUntilFirstRun),
            timeUntilFirstMarkAsRun: avg(timeUntilFirstMarkAsRun),
            timeFromRunTillNextMarkAsRun: avg(timeFromRunTillNextMarkAsRun),
            timeFromMarkAsRunTillRun: avg(timeFromMarkAsRunTillRun)
          };
        }
      });
    },
  });
}

function calRunAt(params, counter) {
  const runAt = counter === 1 ? new Date(params.startAt) :  new Date();
  return runAt.getTime() < params.runUntil ? runAt : undefined;
}

function avg(items) {
  return (
    items.reduce((sum, val) => {
      return sum + val;
    }, 0) / items.length
  );
}
// function millisecondsFromNow(ms) {
//   if (!ms) {
//     return;
//   }

//   const dt = new Date();
//   dt.setTime(dt.getTime() + ms);
//   return dt;
// }
