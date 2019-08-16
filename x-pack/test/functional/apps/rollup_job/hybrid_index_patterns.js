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
  const PageObjects = getPageObjects(['security', 'rollup', 'common', 'indexManagement']);

  describe('rollup jobs', function () {
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

      const jobName = 'rollup-to-be';
      const indexPattern = 'to-be*';
      const indexName = 'rollup-to-be';
      const interval = '1000ms';

      await PageObjects.rollup.createNewRollUpJob(jobName, indexPattern, indexName,
        interval, ' ', true, { time: '*/30 * * * * ?', cron: true });

      await PageObjects.common.navigateToApp('indexManagement');

      await PageObjects.indexManagement.toggleRollupIndices();
      const indices = await PageObjects.indexManagement.getIndexList();

      indices.filter(i => i.indexName === indexName);

      expect(indices[0].indexDocuments).to.be.ok;
      expect(indices[0].indexDocuments).not.to.be('0');

      log.debug(es);
      es.transport.request({
        path: `/_rollup/job/${jobName}`,
        method: 'DELETE',
      });

    });
    after(async () => {
      await es.indices.delete({ index: 'to-be*' });
      await es.indices.delete({ index: 'rollup*' });
    });
  });
}
