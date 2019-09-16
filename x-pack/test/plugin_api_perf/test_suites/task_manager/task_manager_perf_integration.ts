/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import url from 'url';
import supertestAsPromised from 'supertest-as-promised';

export default function({ getService }: { getService: (service: string) => any }) {
  const log = getService('log');
  const config = getService('config');
  const supertest = supertestAsPromised(url.format(config.get('servers.kibana')));

  describe('stressing task manager', () => {
    beforeEach(() =>
      supertest
        .delete('/api/sample_tasks')
        .set('kbn-xsrf', 'xxx')
        .expect(200)
    );

    it('should run 10 tasks every second for a minute', async () => {
      const stressTestResult = await supertest
        .post('/api/perf_tasks')
        .set('kbn-xsrf', 'xxx')
        .send({ tasksToSpawn: 10, durationInSeconds: 60 })
        .expect(200)
        .then((response: any) => response.body);

      log.debug(`Stress Test Result: ${JSON.stringify(stressTestResult)}`);

      expect(stressTestResult.runningAverageTasks).to.be.greaterThan(0);
      expect(stressTestResult.runningAverageLeadTime).to.be.greaterThan(0);
    });
  });
}
