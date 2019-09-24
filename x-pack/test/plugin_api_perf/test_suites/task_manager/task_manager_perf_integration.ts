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
      const { runningAverageTasks, runningAverageLeadTime } = await supertest
        .post('/api/perf_tasks')
        .set('kbn-xsrf', 'xxx')
        .send({ tasksToSpawn: 10, durationInSeconds: 60 })
        .expect(200)
        .then((response: any) => response.body);

      log.debug(`Stress Test Result:`);
      log.debug(`Average number of tasks executed per second: ${runningAverageTasks}`);
      log.debug(
        `Average time it took from the moment a task's scheduled time was reached, until Task Manager picked it up: ${runningAverageLeadTime}`
      );

      expect(runningAverageTasks).to.be.greaterThan(0);
      expect(runningAverageLeadTime).to.be.greaterThan(0);
    });
  });
}
