/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService }: { getService: (service: string) => any }) {
  const log = getService('log');
  const supertest = getService('supertest');

  const params = { tasksToSpawn: 100, trackExecutionTimeline: true, durationInSeconds: 60 };
  describe('stressing task manager', () => {
    it(`should run ${params.tasksToSpawn} tasks over ${params.durationInSeconds} seconds`, async () => {
      const {
        runningAverageTasksPerSecond,
        runningAverageLeadTime,
        // how often things happen in Task Manager
        cycles: {
          fillPoolStarts,
          fillPoolCycles,
          claimedOnRerunCycle,
          fillPoolBail,
          fillPoolBailNoTasks,
        },
        claimAvailableTasksNoTasks,
        claimAvailableTasksNoAvailableWorkers,
        numberOfTasksRanOverall,
        // how long it takes to talk to Elasticsearch
        elasticsearchApiCalls: {
          timeUntilFirstMarkAsRun,
          firstMarkAsRunningTillRan,
          timeFromMarkAsRunTillRun,
          timeFromRunTillNextMarkAsRun,
          claimAvailableTasks,
        },
        // durations in Task Manager
        perfTestDuration,
        taskPoolAttemptToRun,
        taskRunnerMarkTaskAsRunning,
        sleepDuration,
        activityDuration,
      } = await supertest
        .post('/api/perf_tasks')
        .set('kbn-xsrf', 'xxx')
        .send(params)
        .expect(200)
        .then((response: any) => response.body);

      log.info(cyan(`Stress Test Result:`));
      log.info(
        `Average number of tasks executed per second: ${bright(runningAverageTasksPerSecond)}`
      );
      log.info(
        `Average time between a task's "runAt" scheduled time and the time it actually ran: ${bright(
          runningAverageLeadTime
        )}`
      );

      if (params.trackExecutionTimeline) {
        log.info(
          `Overall number of tasks ran in ${bright(params.durationInSeconds)} seconds: ${bright(
            numberOfTasksRanOverall
          )}`
        );
        log.info(`Average time between stages:`);
        log.info(
          `Schedule ---[${descMetric(
            timeUntilFirstMarkAsRun
          )}]--> first markAsRunning ---[${descMetric(firstMarkAsRunningTillRan)}]--> first run`
        );
        log.info(
          `markAsRunning ---[${descMetric(timeFromMarkAsRunTillRun)}]--> run ---[${descMetric(
            timeFromRunTillNextMarkAsRun
          )}]---> next markAsRunning`
        );
        log.info(`Duration of Perf Test: ${bright(perfTestDuration)}`);
        log.info(`Activity within Task Pool: ${bright(activityDuration)}`);
        log.info(`Inactivity due to Sleep: ${bright(sleepDuration)}`);
        log.info(
          `Polling Cycles: ${colorizeCycles(fillPoolStarts, fillPoolCycles, claimedOnRerunCycle)}`
        );
        if (fillPoolBail > 0) {
          log.info(`  ⮑ Bailed due to:`);
          if (fillPoolBailNoTasks > 0) {
            log.info(`     ⮑ No Tasks To Process:`);
            if (claimAvailableTasksNoTasks > 0) {
              log.info(`       ⮑ ${claimAvailableTasksNoTasks} Times, due to No Tasks Claimed`);
            }
            if (claimAvailableTasksNoAvailableWorkers > 0) {
              log.info(
                `       ⮑ ${claimAvailableTasksNoAvailableWorkers} Times, due to having No Available Worker Capacity`
              );
            }
          }
          if (fillPoolBail - fillPoolBailNoTasks > 0) {
            log.info(
              `     ⮑ Exhausted Available Workers due to on going Task runs ${
                fillPoolBail - fillPoolBailNoTasks
              }`
            );
          }
        }
        log.info(
          `average duration taken to Claim Available Tasks: ${descMetric(claimAvailableTasks)}`
        );
        log.info(
          `average duration taken to Mark claimed Tasks as Running in Task Pool: ${descMetric(
            taskPoolAttemptToRun
          )}`
        );
        log.info(
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

function colorizeCycles(
  fillPoolStarts: number,
  fillPoolCycles: number,
  claimedOnRerunCycle: number
) {
  const perc = (fillPoolCycles * 100) / fillPoolStarts;
  const colorFunc = perc >= 100 ? green : perc >= 50 ? cyan : red;
  return (
    `ran ` +
    bright(`${fillPoolStarts}`) +
    ` cycles, of which ` +
    colorFunc(`${fillPoolCycles}`) +
    ` were reran (of which ${claimedOnRerunCycle} resulted in claiming) before bailing`
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

function bright(str: string | number) {
  return `\x1b[1m${str}\x1b[0m`;
}
