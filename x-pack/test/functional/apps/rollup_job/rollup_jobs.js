/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import datemath from '@elastic/datemath';
import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {

  // const log = getService('log');
  const es = getService('es');
  const PageObjects = getPageObjects(['security', 'rollup', 'common', 'indexManagement', 'settings']);

  describe('rollup jobs', function () {
    const rollupJobName = 'rollup-to-be-' + Math.floor(Math.random() * 10000);
    async function loadDates(dates, prepend = 'to-be-rolled-up') {
      for (const day of dates) {
        await es.index({
          index: `${prepend}-${day.format('MM-DD-YYYY')}`,
          body: {
            '@timestamp': day.toISOString(),
            foo_metric: 1
          }
        });
      }
    }
    before(async () => {
      // make sure all dates have the same concept of 'now'
      const now = new Date();
      const pastDates = [
        datemath.parse('now-1d', { forceNow: now }),
        datemath.parse('now-2d', { forceNow: now }),
        datemath.parse('now-3d', { forceNow: now }),
      ];
      await loadDates(pastDates);
      await PageObjects.common.navigateToApp('rollupJob');

    });
    it('create new rollup job', async () => {
      const indexPattern = 'to-be*';
      const indexName = 'rollup-to-be';
      const interval = '1000ms';

      await PageObjects.rollup.createNewRollUpJob(rollupJobName, indexPattern, indexName,
        interval, ' ', true, { time: '9,19,29,39,49,59 * * * * ?', cron: true });

      await PageObjects.common.navigateToApp('indexManagement');

      // Wait a 10 seconds to ensure that the job has triggered.
      await PageObjects.common.sleep(10000);
      await PageObjects.indexManagement.toggleRollupIndices();
      const indices = await PageObjects.indexManagement.getIndexList();

      indices.filter(i => i.indexName === indexName);
      expect(indices[0].indexDocuments).to.be('3');

    });

    it('create hybrid index pattern', async () => {
      //Stop the rollup job created in the previous test.
      await es.transport.request({
        path: `/_rollup/job/${rollupJobName}/_stop?wait_for_completion=true`,
        method: 'POST',
      });

      const now = new Date();
      const futureDates = [
        datemath.parse('now', { forceNow: now }),
        datemath.parse('now+1d', { forceNow: now }),
        datemath.parse('now+2d', { forceNow: now }),
        datemath.parse('now+3d', { forceNow: now }),
      ];

      await loadDates(futureDates, 'live-data');

      await PageObjects.common.navigateToApp('settings');
      await PageObjects.settings.createIndexPattern();



    });

    after(async () => {
      es.transport.request({
        path: `/_rollup/job/${rollupJobName}`,
        method: 'DELETE',
      });
      await es.indices.delete({ index: 'to-be*' });
      await es.indices.delete({ index: 'rollup*' });
      await es.indices.delete({ index: 'live*' });
    });
  });
}
