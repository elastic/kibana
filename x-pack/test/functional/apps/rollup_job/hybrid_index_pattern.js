/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import datemath from '@elastic/datemath';
import expect from '@kbn/expect';
import mockRolledUpData, { mockIndices } from './hybrid_index_helper';

export default function ({ getService, getPageObjects }) {

  const log = getService('log');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
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

    before(async () => {
      //Create data for rollup job to recognize.
      //Index past data to be used in the test.
      await pastDates.map(async (day) => {
        await es.index(mockIndices(day));
      });

      await retry.waitForWithTimeout('waiting for 3 records to be loaded into elasticsearch.', 10000, async () => {
        const response = await es.indices.get({
          index: 'to-be*',
          allow_no_indices: false
        });
        await log.debug(response);
        return Object.keys(response).length === 3;
      });
    });

    it('create hybrid index pattern', async () => {
      await retry.try(async () => {
        //Create a rollup for kibana to recognize
        await es.transport.request({
          path: `/_rollup/job/${rollupJobName}`,
          method: 'PUT',
          body: {
            'index_pattern': 'to-be*',
            'rollup_index': indexName,
            'cron': '*/10 * * * * ?',
            'groups': {
              'date_histogram': {
                'fixed_interval': '1000ms',
                'field': '@timestamp',
                'time_zone': 'UTC'
              }
            },
            'timeout': '20s',
            'page_size': 1000
          }
        });
      });


      pastDates.map(async (day) => {
        await es.index(mockRolledUpData(rollupJobName, day));
      });

      //Add data for today, 1,2 and 3 days into the future.
      const futureDates = [
        datemath.parse('now', { forceNow: now }),
        datemath.parse('now+1d', { forceNow: now }),
        datemath.parse('now+2d', { forceNow: now }),
        datemath.parse('now+3d', { forceNow: now }),
      ];

      //Index live data to be used in the test.
      await futureDates.map(async (day) => {
        await es.index(mockIndices(day, 'live-data'));
      });

      await PageObjects.common.navigateToApp('settings');
      await PageObjects.settings.createIndexPattern('live*,' + indexName, '@timestamp', false);

      await PageObjects.common.navigateToApp('discover');
      const hits = await PageObjects.discover.getHitCount();

      //Number of hits should be at least 7. Due to CI being slow, the legacy data may not be there.
      //3 for rolled up data, 3 for legacy data that was rolled up, and 4 for the live data.
      expect(Number.parseInt(hits)).to.equal(7);
    });

    after(async () => {
      await es.indices.delete({ index: 'rollup*' });
      await es.indices.delete({ index: 'live*' });
      await es.indices.delete({ index: 'live*,rollup-to-be*' });
      await esArchiver.load('empty_kibana');
    });
  });
}
