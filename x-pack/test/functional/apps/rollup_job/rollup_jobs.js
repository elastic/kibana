/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import datemath from '@elastic/datemath';
import expect from '@kbn/expect';
import { mockIndices } from './hybrid_index_helper';

export default function ({ getService, getPageObjects }) {

  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['rollup', 'common']);

  describe('rollup job', function () {
    const rollupJobName = 'rollup-to-be-' + Math.floor(Math.random() * 10000);
    const indexName = 'rollup-to-be';
    //make sure all dates have the same concept of "now"
    const now = new Date();
    const pastDates = [
      datemath.parse('now-1d', { forceNow: now }),
      datemath.parse('now-2d', { forceNow: now }),
      datemath.parse('now-3d', { forceNow: now }),
    ];

    it('create new rollup job', async () => {
      const indexPattern = 'to-be*';
      const interval = '1000ms';

      pastDates.map(async (day) => {
        await es.index(mockIndices(day, 'to-be'));
      });

      await PageObjects.common.navigateToApp('rollupJob');
      await PageObjects.rollup.createNewRollUpJob(rollupJobName, indexPattern, indexName,
        interval, ' ', true, { time: '*/10 * * * * ?', cron: true });

      const jobList = await PageObjects.rollup.getJobList();
      expect(jobList.length).to.be(1);

      //Stop the running rollup job.
      await es.transport.request({
        path: `/_rollup/job/${rollupJobName}/_stop?wait_for_completion=true`,
        method: 'POST',
      });
    });

    after(async () => {
      // Delete the rollup job.
      es.transport.request({
        path: `/_rollup/job/${rollupJobName}`,
        method: 'DELETE',
      });

      await es.indices.delete({ index: 'rollup*' });
      await es.indices.delete({ index: 'to-be*' });
      await es.indices.delete({ index: 'live*' });
      await esArchiver.load('empty_kibana');
    });
  });
}
