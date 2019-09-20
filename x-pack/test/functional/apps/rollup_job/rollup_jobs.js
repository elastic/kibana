/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import datemath from '@elastic/datemath';
import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {

  const log = getService('log');
  const es = getService('es');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['security', 'rollup', 'common', 'indexManagement', 'settings', 'discover']);

  describe('rollup job', function () {
    const rollupJobName = 'rollup-to-be-' + Math.floor(Math.random() * 10000);
    const indexName = 'rollup-to-be';
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
      await log.debug('make sure all dates have the same concept of "now"');
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
      const interval = '1000ms';

      await PageObjects.rollup.createNewRollUpJob(rollupJobName, indexPattern, indexName,
        interval, ' ', true, { time: '*/10 * * * * ?', cron: true });

      await PageObjects.common.navigateToApp('indexManagement');

      await PageObjects.indexManagement.toggleRollupIndices();

      await log.debug('If the index exists then the rollup job has successfully' +
        'been created and is waiting to or has triggered.');
      await retry.waitForWithTimeout('Wait for job to be triggered', 20000,
        async () => {
          await PageObjects.indexManagement.reloadIndices();

          const indices = await PageObjects.indexManagement.getIndexList();
          const filteredIndices = indices.filter(i => i.indexName === indexName);
          await log.debug(filteredIndices);

          expect(filteredIndices.length).to.be.greaterThan(0);
          return (filteredIndices[0].indexName === indexName) && (filteredIndices[0].indexDocuments !== '0');
        }
      );


    });

    it('create hybrid index pattern', async () => {
      await log.debug('Stop the rollup job created in the previous test.');

      await log.debug('Add data for 1,2 and 3 days into the future.');
      const now = new Date();
      const futureDates = [
        datemath.parse('now', { forceNow: now }),
        datemath.parse('now+1d', { forceNow: now }),
        datemath.parse('now+2d', { forceNow: now }),
        datemath.parse('now+3d', { forceNow: now }),
      ];

      await loadDates(futureDates, 'live-data');

      await PageObjects.common.navigateToApp('settings');
      await PageObjects.settings.createIndexPattern('live*,' + indexName, '@timestamp', false);

      await PageObjects.common.navigateToApp('discover');
      const hits = await PageObjects.discover.getHitCount();
      expect(Number.parseInt(hits)).to.be.greaterThan(6);
    });

    after(async () => {
      //Stop the running rollup job.
      await es.transport.request({
        path: `/_rollup/job/${rollupJobName}/_stop?wait_for_completion=true`,
        method: 'POST',
      });
      //Delete the rollup job.
      es.transport.request({
        path: `/_rollup/job/${rollupJobName}`,
        method: 'DELETE',
      });

      await es.indices.delete({ index: 'rollup*' });
      await es.indices.delete({ index: 'live*' });
      await es.indices.delete({ index: 'live*,rollup-to-be*' });
    });
  });
}
