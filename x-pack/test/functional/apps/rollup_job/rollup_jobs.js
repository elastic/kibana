/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import datemath from '@elastic/datemath';
import expect from '@kbn/expect';
import mockRolledUpData from './hybrid_index_helper';

export default function ({ getService, getPageObjects }) {

  const log = getService('log');
  const es = getService('es');
  const PageObjects = getPageObjects(['security', 'rollup', 'common', 'indexManagement', 'settings', 'discover']);

  describe('rollup job', function () {
    const rollupJobName = 'rollup-to-be-' + Math.floor(Math.random() * 10000);
    const indexName = 'rollup-to-be';
    const now = new Date();
    const pastDates = [
      datemath.parse('now-1d', { forceNow: now }),
      datemath.parse('now-2d', { forceNow: now }),
      datemath.parse('now-3d', { forceNow: now }),
    ];

    //This function just adds some stub indices that includes a timestamp and an arbritary metric. This is fine since we are not actually testing
    //rollup functionality.
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

    it('create new rollup job', async () => {
      const indexPattern = 'to-be*';
      const interval = '1000ms';

      await log.debug('make sure all dates have the same concept of "now"');
      await log.debug(pastDates);
      await loadDates(pastDates);

      await PageObjects.common.navigateToApp('rollupJob');
      await PageObjects.rollup.createNewRollUpJob(rollupJobName, indexPattern, indexName,
        interval, ' ', true, { time: '*/10 * * * * ?', cron: true });

      await PageObjects.common.navigateToApp('indexManagement');

      await PageObjects.indexManagement.toggleRollupIndices();

      const indices = await PageObjects.indexManagement.getIndexList();

      await log.debug('If the index exists then the rollup job has successfully' +
        'been created and is waiting to or has triggered.');

      //If the index exists then the rollup job has successfully been created and is waiting to or has triggered.
      const filteredIndices = indices.filter(i => i.indexName === indexName);
      expect(filteredIndices.length).to.be.greaterThan(0);

      //Stop the running rollup job.
      await es.transport.request({
        path: `/_rollup/job/${rollupJobName}/_stop?wait_for_completion=true`,
        method: 'POST',
      });


    });

    it('create hybrid index pattern', async () => {

      await log.debug('Create data for the rollup job to recognize.');

      await pastDates.map(async (day) => {
        await es.index(await mockRolledUpData(rollupJobName, day));
      });
      await PageObjects.common.navigateToApp('rollupJob');

      //Index live data to be used in the test.

      await log.debug('Add data for 1,2 and 3 days into the future.');
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

      // Delete the rollup job.
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
