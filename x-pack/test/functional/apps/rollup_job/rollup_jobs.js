/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import datemath from '@elastic/datemath';
import expect from '@kbn/expect';
import { mockIndices } from './rollup_helpers';

export default function ({ getService, getPageObjects }) {

  const es = getService('es');
  const PageObjects = getPageObjects(['security', 'rollup', 'common', 'indexManagement', 'settings', 'discover']);

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
        await es.index(mockIndices(day));
      });

      await PageObjects.common.navigateToApp('rollupJob');
      await PageObjects.rollup.createNewRollUpJob(rollupJobName, indexPattern, indexName,
        interval, ' ', true, { time: '*/10 * * * * ?', cron: true });

      await PageObjects.common.navigateToApp('indexManagement');

      await PageObjects.indexManagement.toggleRollupIndices();

      const indices = await PageObjects.indexManagement.getIndexList();

      //If the index exists then the rollup job has successfully' +
      //been created and is waiting to or has triggered.

      //If the index exists then the rollup job has successfully been created and is waiting to or has triggered.
      const filteredIndices = indices.filter(i => i.indexName === indexName);
      expect(filteredIndices.length).to.be.greaterThan(0);

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
      await es.indices.delete({ index: 'live*,rollup-to-be*' });
    });
  });
}
