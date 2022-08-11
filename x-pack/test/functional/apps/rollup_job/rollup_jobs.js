/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import expect from '@kbn/expect';
import { mockIndices } from './hybrid_index_helper';

export default function ({ getService, getPageObjects }) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['rollup', 'common', 'security']);
  const security = getService('security');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('rollup job', function () {
    //Since rollups can only be created once with the same name (even if you delete it),
    //we add the Date.now() to avoid name collision.
    const rollupJobName = 'rollup-to-be-' + Date.now();
    const targetIndexName = 'rollup-to-be';
    const rollupSourceIndexPattern = 'to-be*';
    const rollupSourceDataPrepend = 'to-be';

    //make sure all dates have the same concept of "now"
    const now = new Date();
    const pastDates = [
      datemath.parse('now-1d', { forceNow: now }),
      datemath.parse('now-2d', { forceNow: now }),
      datemath.parse('now-3d', { forceNow: now }),
    ];
    before(async () => {
      await security.testUser.setRoles(['manage_rollups_role']);
      await PageObjects.common.navigateToApp('rollupJob');
    });

    it('create new rollup job', async () => {
      const interval = '1000ms';

      for (const day of pastDates) {
        await es.index(mockIndices(day, rollupSourceDataPrepend));
      }

      await PageObjects.rollup.createNewRollUpJob(
        rollupJobName,
        rollupSourceIndexPattern,
        targetIndexName,
        interval,
        ' ',
        true,
        { time: '*/10 * * * * ?', cron: true }
      );

      const jobList = await PageObjects.rollup.getJobList();
      expect(jobList.length).to.be(1);
    });

    after(async () => {
      //Stop the running rollup job.
      await es.transport.request({
        path: `/_rollup/job/${rollupJobName}/_stop?wait_for_completion=true`,
        method: 'POST',
      });
      // Delete the rollup job.
      await es.transport.request({
        path: `/_rollup/job/${rollupJobName}`,
        method: 'DELETE',
      });

      //Delete all data indices that were created.
      await esDeleteAllIndices([targetIndexName, rollupSourceIndexPattern]);
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await security.testUser.restoreDefaults();
    });
  });
}
