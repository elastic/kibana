/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService }: { getService: (service: string) => any }) {
  const log = getService('log');
  const supertest = getService('supertest');

  const params = { tasksToSpawn: 100, trackExecutionTimeline: true, durationInSeconds: 60 };

  describe('stressing task manager', () => {
    it(`should run ${params.tasksToSpawn} tasks over ${params.durationInSeconds} seconds`, async () => {
      const {
        runningAverageTasksPerSecond,
        runningAverageLeadTime,
        numberOfTasksRanOverall,
        firstMarkAsRunningTillRan,
        timeUntilFirstMarkAsRun,
        timeFromMarkAsRunTillRun,
        timeFromRunTillNextMarkAsRun,
        claimAvailableTasks,
        taskPoolAttemptToRun,
        taskRunnerMarkTaskAsRunning,
        taskPollerInactivityDuration,
        perfTestDuration,
        cycles: { attemptWorkSkip, fillPoolCycles, fillPoolBail, fillPoolBailNoTasks },
      } = await supertest
        .post('/api/perf_tasks')
        .set('kbn-xsrf', 'xxx')
        .send(params)
        .expect(200)
        .then((response: any) => response.body);

      log.debug(cyan(`Stress Test Result:`));
      log.debug(`Average number of tasks executed per second: ${runningAverageTasksPerSecond}`);
      log.debug(
        `Average time between a task's "runAt" scheduled time and the time it actually ran: ${runningAverageLeadTime}`
      );

      if (params.trackExecutionTimeline) {
        log.debug(
          `Overall number of tasks ran in ${params.durationInSeconds} seconds: ${numberOfTasksRanOverall}`
        );
        log.debug(`Average time between stages:`);
        log.debug(
          `Schedule ---[${descMetric(
            timeUntilFirstMarkAsRun
          )}]--> first markAsRunning ---[${descMetric(firstMarkAsRunningTillRan)}]--> first run`
        );
        log.debug(
          `markAsRunning ---[${descMetric(timeFromMarkAsRunTillRun)}]--> run ---[${descMetric(
            timeFromRunTillNextMarkAsRun
          )}]---> next markAsRunning`
        );
        log.debug(`Duration of Perf Test: ${perfTestDuration}`);
        log.debug(`inactivity waiting to poll for tasks: ${taskPollerInactivityDuration}`);
        log.debug(
          `task poll cycles: ${colorizeCycles(fillPoolCycles, fillPoolBail, fillPoolBailNoTasks)}`
        );
        log.debug(`task poll cycles skipped due to workers being busy: ${attemptWorkSkip}`);
        log.debug(
          `average duration taken to Claim Available Tasks: ${descMetric(claimAvailableTasks)}`
        );
        log.debug(
          `average duration taken to Mark claimed Tasks as Running in Task Pool: ${descMetric(
            taskPoolAttemptToRun
          )}`
        );
        log.debug(
          `average duration taken to Mark individual Tasks as Running in Task Runner: ${descMetric(
            taskRunnerMarkTaskAsRunning
          )}`
        );
      }

      expect(runningAverageTasksPerSecond).to.be.greaterThan(0);
      expect(runningAverageLeadTime).to.be.greaterThan(0);
    });
  });
}

function descMetric(metric: { mean: number; range: { min: number; max: number } }): string {
  return `${colorize(metric.mean)}ms ${dim(`(`)}${colorize(metric.range.min)}${dim(
    `ms - `
  )}${colorize(metric.range.max)}${dim(`ms)`)}`;
}

function colorize(avg: number) {
  if (!avg) {
    return red('?');
  }
  return avg < 500 ? green(`${avg}`) : avg < 1000 ? cyan(`${avg}`) : red(`${avg}`);
}

function colorizeCycles(fillPoolCycles: number, fillPoolBail: number, fillPoolBailNoTasks: number) {
  const perc = (fillPoolBail * 100) / fillPoolCycles;
  const colorFunc = perc >= 100 ? red : perc >= 50 ? cyan : green;
  return (
    colorFunc(`${fillPoolCycles}`) +
    ` cycles, having bailed ` +
    colorFunc(`${fillPoolBail}`) +
    ` (No Tasks:${fillPoolBailNoTasks}, No Workers: ${fillPoolBail - fillPoolBailNoTasks})`
  );
}

function cyan(str: string) {
  return `\x1b[36m${str}\x1b[0m`;
}

function red(str: string) {
  return `\x1b[31m${str}\x1b[0m`;
}

function green(str: string) {
  return `\x1b[32m${str}\x1b[0m`;
}

function dim(str: string) {
  return `\x1b[2m${str}\x1b[0m`;
}
