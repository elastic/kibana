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
  const PageObjects = getPageObjects(['security', 'rollup', 'common', 'indexManagement', 'settings', 'discover']);

  describe('rollup jobs', function () {
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

      await log.debug('Wait a 10 seconds to ensure that the job has triggered.');
      await PageObjects.common.sleep(10000);
      await PageObjects.indexManagement.toggleRollupIndices();
      await PageObjects.common.sleep(2000);
      const indices = await PageObjects.indexManagement.getIndexList();

      await log.debug('If the index exists then the rollup job has successfully' +
        'been created and is waiting to or has triggered.');
      indices.filter(i => i.indexName === indexName);
      expect(indices.length).to.be.greaterThan(0);

    });

    it('create hybrid index pattern', async () => {
      await log.debug('Stop the rollup job created in the previous test.');
      await es.transport.request({
        path: `/_rollup/job/${rollupJobName}/_stop?wait_for_completion=true`,
        method: 'POST',
      });

      await log.debug('Add data for 1,2 and 3 days into the future.');
      const now = new Date();
      const futureDates = [
        datemath.parse('now', { forceNow: now }),
        datemath.parse('now+1d', { forceNow: now }),
        datemath.parse('now+2d', { forceNow: now }),
        datemath.parse('now+3d', { forceNow: now }),
      ];

      await loadDates(futureDates, 'live-data');
      await log.debug('Delete old data that was rolled up.');
      await es.indices.delete({ index: 'to-be*' });

      await PageObjects.common.navigateToApp('settings');
      await PageObjects.settings.createIndexPattern('live*,' + indexName, '@timestamp', false);

      await PageObjects.common.navigateToApp('discover');
      const hits = await PageObjects.discover.getHitCount();
      expect(hits).to.be('7');
    });

    after(async () => {
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
