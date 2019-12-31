/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import _ from 'lodash';
import stats from 'stats-lite';
import prettyMilliseconds from 'pretty-ms';
import { performance, PerformanceObserver } from 'perf_hooks';
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
      const taskManager = {
        ...server.newPlatform.setup.plugins.kibanaTaskManager,
        ...server.newPlatform.start.plugins.kibanaTaskManager,
      };
      const performanceState = resetPerfState({});

      let lastFlush = new Date();
      function flushPerfStats() {
        setTimeout(flushPerfStats, 5000);
        const prevFlush = lastFlush;
        lastFlush = new Date();

        const tasks = performanceState.leadTimeQueue.length;
        const title = `[Perf${performanceState.capturing ? ' (capturing)' : ''}]`;
        const seconds = parseInt((lastFlush - prevFlush) / 1000);
        console.log(
          `${title} I have processed ${tasks} tasks in the past ${seconds}s (${tasks /
            seconds} per second)`
        );
        if (tasks > 0) {
          const latestAverage = avg(performanceState.leadTimeQueue.splice(0, tasks)).mean;

          performanceState.averagesTakenLeadTime.push(latestAverage);
          performanceState.averagesTaken.push(tasks);
          if (performanceState.averagesTakenLeadTime.length > 1) {
            performanceState.runningAverageLeadTime = avg(
              performanceState.averagesTakenLeadTime
            ).mean;
            performanceState.runningAverageTasksPerSecond =
              avg(performanceState.averagesTaken).mean / 5;
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

                const counter = state.counter ? state.counter : 1;

                const now = Date.now();
                const leadTime = now - taskInstance.runAt;
                performanceState.leadTimeQueue.push(leadTime);

                // schedule to run next cycle as soon as possible
                const runAt = calRunAt(params, counter);

                const stateUpdated = {
                  ...state,
                  counter: counter + 1,
                };

                if (params.trackExecutionTimeline && state.perf && state.perf.id) {
                  performance.mark(`perfTask_run_${state.perf.id}_${counter}`);
                  performance.measure(
                    'perfTask.markUntilRun',
                    `perfTask_markAsRunning_${state.perf.id}_${counter}`,
                    `perfTask_run_${state.perf.id}_${counter}`
                  );
                  if (counter === 1) {
                    performance.measure(
                      'perfTask.firstRun',
                      `perfTask_schedule_${state.perf.id}`,
                      `perfTask_run_${state.perf.id}_${counter}`
                    );
                    performance.measure(
                      'perfTask.firstMarkAsRunningTillRan',
                      `perfTask_markAsRunning_${state.perf.id}_${counter}`,
                      `perfTask_run_${state.perf.id}_${counter}`
                    );
                  }
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
            ...taskInstance,
          };

          if (taskInstance.params && taskInstance.params.trackExecutionTimeline) {
            modifiedInstance.state = modifiedInstance.state || {};
            modifiedInstance.state.perf = modifiedInstance.state.perf || {};
            modifiedInstance.state.perf.id = uuid.v4().replace(/-/gi, '_');
            performance.mark(`perfTask_schedule_${modifiedInstance.state.perf.id}`);
          }

          return {
            ...opts,
            taskInstance: modifiedInstance,
          };
        },

        async beforeMarkRunning({ taskInstance, ...opts }) {
          const modifiedInstance = {
            ...taskInstance,
          };

          if (
            modifiedInstance.state &&
            modifiedInstance.state.perf &&
            modifiedInstance.state.perf.id
          ) {
            const { counter = 1 } = modifiedInstance.state;
            performance.mark(`perfTask_markAsRunning_${modifiedInstance.state.perf.id}_${counter}`);
            if (counter === 1) {
              performance.measure(
                'perfTask.firstMarkAsRunning',
                `perfTask_schedule_${modifiedInstance.state.perf.id}`,
                `perfTask_markAsRunning_${modifiedInstance.state.perf.id}_${counter}`
              );
            } else if (counter > 1) {
              performance.measure(
                'perfTask.runUntilNextMarkAsRunning',
                `perfTask_run_${modifiedInstance.state.perf.id}_${counter - 1}`,
                `perfTask_markAsRunning_${modifiedInstance.state.perf.id}_${counter}`
              );
            }
          }

          return {
            ...opts,
            taskInstance: modifiedInstance,
          };
        },
      });

      const perfApi = {
        capture() {
          resetPerfState(performanceState);
          performanceState.capturing = true;
          performance.mark('perfTest.start');
        },
        endCapture() {
          return new Promise(resolve => {
            performanceState.performance.summarize.push([resolve, perfApi.summarize]);

            performance.mark('perfTest.end');
            performance.measure('perfTest.duration', 'perfTest.start', 'perfTest.end');
          });
        },
        summarize(perfTestDuration) {
          const {
            runningAverageTasksPerSecond,
            runningAverageLeadTime,
            performance,
          } = performanceState;

          const {
            numberOfTasksRanOverall,
            elasticsearchApiCalls,
            activityDuration,
            sleepDuration,
            cycles,
            claimAvailableTasksNoTasks,
            claimAvailableTasksNoAvailableWorkers,
            taskPoolAttemptToRun,
            taskRunnerMarkTaskAsRunning,
          } = performance;

          const perfRes = {
            perfTestDuration: prettyMilliseconds(perfTestDuration),
            runningAverageTasksPerSecond,
            runningAverageLeadTime,
            numberOfTasksRanOverall,
            claimAvailableTasksNoTasks,
            claimAvailableTasksNoAvailableWorkers,
            elasticsearchApiCalls: _.mapValues(elasticsearchApiCalls, avg),
            sleepDuration: prettyMilliseconds(stats.sum(sleepDuration)),
            activityDuration: prettyMilliseconds(stats.sum(activityDuration)),
            cycles,
            taskPoolAttemptToRun: avg(taskPoolAttemptToRun),
            taskRunnerMarkTaskAsRunning: avg(taskRunnerMarkTaskAsRunning),
          };

          resetPerfState(performanceState);

          return perfRes;
        },
      };

      initRoutes(server, perfApi);
    },
  });
}

function calRunAt(params, counter) {
  const runAt = counter === 1 ? new Date(params.startAt) : new Date();
  return runAt.getTime() < params.runUntil ? runAt : undefined;
}

function avg(items) {
  const mode = stats.mode(items);
  return {
    mean: parseInt(stats.mean(items)),
    range: {
      min: parseInt(typeof mode === 'number' ? mode : _.min([...mode])),
      max: parseInt(typeof mode === 'number' ? mode : _.max([...mode])),
    },
  };
}

function resetPerfState(target) {
  if (target.performanceObserver) {
    target.performanceObserver.disconnect();
  }

  const performanceState = Object.assign(target, {
    capturing: false,
    runningAverageTasksPerSecond: 0,
    averagesTaken: [],
    runningAverageLeadTime: -1,
    averagesTakenLeadTime: [],
    leadTimeQueue: [],
    performance: {
      numberOfTasksRanOverall: 0,
      cycles: {
        fillPoolStarts: 0,
        fillPoolCycles: 0,
        fillPoolBail: 0,
        claimedOnRerunCycle: 0,
        fillPoolBailNoTasks: 0,
      },
      claimAvailableTasksNoTasks: 0,
      claimAvailableTasksNoAvailableWorkers: 0,
      elasticsearchApiCalls: {
        timeUntilFirstRun: [],
        timeUntilFirstMarkAsRun: [],
        firstMarkAsRunningTillRan: [],
        timeFromMarkAsRunTillRun: [],
        timeFromRunTillNextMarkAsRun: [],
        claimAvailableTasks: [],
      },
      activityDuration: [],
      sleepDuration: [],
      taskPollerActivityDurationPreScheduleComplete: [],
      taskPoolAttemptToRun: [],
      taskRunnerMarkTaskAsRunning: [],

      summarize: [],
    },
  });

  performanceState.performanceObserver = new PerformanceObserver((list, observer) => {
    list.getEntries().forEach(entry => {
      const { name, duration } = entry;
      switch (name) {
        // Elasticsearch Api Calls
        case 'perfTask.firstRun':
          performanceState.performance.elasticsearchApiCalls.timeUntilFirstRun.push(duration);
          break;
        case 'perfTask.firstMarkAsRunning':
          performanceState.performance.elasticsearchApiCalls.timeUntilFirstMarkAsRun.push(duration);
          break;
        case 'perfTask.firstMarkAsRunningTillRan':
          performanceState.performance.elasticsearchApiCalls.firstMarkAsRunningTillRan.push(
            duration
          );
          break;
        case 'perfTask.markUntilRun':
          performanceState.performance.elasticsearchApiCalls.timeFromMarkAsRunTillRun.push(
            duration
          );
          break;
        case 'perfTask.runUntilNextMarkAsRunning':
          performanceState.performance.elasticsearchApiCalls.timeFromRunTillNextMarkAsRun.push(
            duration
          );
          break;
        case 'claimAvailableTasks':
          performanceState.performance.elasticsearchApiCalls.claimAvailableTasks.push(duration);
          break;
        case 'TaskPoller.sleepDuration':
          performanceState.performance.sleepDuration.push(duration);
          break;
        case 'fillPool.activityDurationUntilNoTasks':
          performanceState.performance.activityDuration.push(duration);
          break;
        case 'fillPool.activityDurationUntilExhaustedCapacity':
          performanceState.performance.activityDuration.push(duration);
          break;
        case 'fillPool.bailExhaustedCapacity':
          performanceState.performance.cycles.fillPoolBail++;
          break;
        case 'fillPool.claimedOnRerunCycle':
          performanceState.performance.cycles.claimedOnRerunCycle++;
          break;
        case 'fillPool.bailNoTasks':
          performanceState.performance.cycles.fillPoolBail++;
          performanceState.performance.cycles.fillPoolBailNoTasks++;
          break;
        case 'fillPool.start':
          performanceState.performance.cycles.fillPoolStarts++;
          break;
        case 'fillPool.cycle':
          performanceState.performance.cycles.fillPoolCycles++;
          break;
          break;
        case 'claimAvailableTasks.noTasks':
          performanceState.performance.claimAvailableTasksNoTasks++;
          break;
        case 'claimAvailableTasks.noAvailableWorkers':
          performanceState.performance.claimAvailableTasksNoAvailableWorkers++;
          break;
        case 'taskPool.attemptToRun':
          performanceState.performance.taskPoolAttemptToRun.push(duration);
          break;
        case 'taskRunner.markTaskAsRunning':
          performanceState.performance.taskRunnerMarkTaskAsRunning.push(duration);
          break;
        case 'perfTest.duration':
          observer.disconnect();
          const { summarize } = performanceState.performance;
          if (summarize && summarize.length) {
            summarize.splice(0, summarize.length).forEach(([resolve, summarize]) => {
              resolve(summarize(duration));
            });
          }
          break;
        default:
          if (name.startsWith('perfTask_run_')) {
            performanceState.performance.numberOfTasksRanOverall++;
          }
      }
    });
  });
  performanceState.performanceObserver.observe({ entryTypes: ['measure', 'mark'] });

  return performanceState;
}
