/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService }: { getService: (service: string) => any }) {
  const log = getService('log');
  const supertest = getService('supertest');

  describe('stressing task manager', () => {
    it('should run 10 tasks every second for a minute', async () => {
      const params = { tasksToSpawn: 50, trackExecutionTimeline: true, durationInSeconds: 60 };

      const {
        runningAverageTasksPerSecond,
        runningAverageLeadTime,
        numberOfTasksRanOverall,
        timeUntilFirstRun,
        timeUntilFirstMarkAsRun,
        timeFromMarkAsRunTillRun,
        timeFromRunTillNextMarkAsRun,
      } = await supertest
        .post('/api/perf_tasks')
        .set('kbn-xsrf', 'xxx')
        .send(params)
        .expect(200)
        .then((response: any) => response.body);

      log.debug(`Stress Test Result:`);
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
          `Schedule ---[${timeUntilFirstMarkAsRun}ms]--> first markAsRunning ---[${timeUntilFirstRun -
            timeUntilFirstMarkAsRun}ms]--> first run`
        );
        log.debug(
          `markAsRunning ---[${timeFromMarkAsRunTillRun}ms]--> run ---[${timeFromRunTillNextMarkAsRun}ms]---> next markAsRunning`
        );
      }

      expect(runningAverageTasksPerSecond).to.be.greaterThan(0);
      expect(runningAverageLeadTime).to.be.greaterThan(0);
    });
  });
}
