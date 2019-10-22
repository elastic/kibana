/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService }: { getService: (service: string) => any }) {
  const log = getService('log');
  const supertest = getService('supertest');

  const params = { tasksToSpawn: 50, trackExecutionTimeline: true, durationInSeconds: 60 };

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
        taskPollerAttemptWork,
        taskPoolAttemptToRun,
        taskRunnerMarkTaskAsRunning,
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
        log.debug(
          `average duration taken to Claim Available Tasks: ${descMetric(claimAvailableTasks)}`
        );
        log.debug(
          `average duration taken to Attempt Work in Task Pooker: ${descMetric(
            taskPollerAttemptWork
          )}`
        );
        log.debug(
          `average duration taken to Mark Tasks as Running in Task Pool: ${descMetric(
            taskPoolAttemptToRun
          )}`
        );
        log.debug(
          `average duration taken to Mark Task as Running in Task Runner: ${descMetric(
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
