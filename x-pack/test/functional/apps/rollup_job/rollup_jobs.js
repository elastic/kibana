/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import expect from '@kbn/expect';
import { mockIndices } from './hybrid_index_helper';
import { MOCK_ROLLUP_INDEX_NAME, createMockRollupIndex } from './test_helpers';

export default function ({ getService, getPageObjects }) {
  const config = getService('config');
  const PageObjects = getPageObjects(['rollup', 'common', 'security']);
  const security = getService('security');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const testSubjects = getService('testSubjects');
  const isRunningCcs = config.get('esTestCluster.ccs') ? true : false;
  let remoteEs;
  if (isRunningCcs) {
    remoteEs = getService('remoteEs');
  }

  describe('rollup job', function () {
    // Since rollups can only be created once with the same name (even if you delete it),
    // we add the Date.now() to avoid name collision.
    const rollupJobName = 'rollup-to-be-' + Date.now();
    const targetIndexName = 'rollup-to-be';
    const indexPatternToUse = 'to-be*';
    const rollupSourceIndexPattern = isRunningCcs
      ? 'ftr-remote:' + indexPatternToUse
      : indexPatternToUse;
    const rollupSourceDataPrepend = 'to-be';

    // make sure all dates have the same concept of "now"
    const now = new Date();
    const pastDates = [
      datemath.parse('now-1d', { forceNow: now }),
      datemath.parse('now-2d', { forceNow: now }),
      datemath.parse('now-3d', { forceNow: now }),
    ];
    before(async () => {
      // <issue for security roles not working as expected>
      // https://github.com/elastic/kibana/issues/143720
      // await security.testUser.setRoles(['manage_rollups_role', 'global_ccr_role']);
      await security.testUser.setRoles(['superuser']);
      await PageObjects.common.navigateToApp('rollupJob');

      // From 8.15, Es only allows creating a new rollup job when there is existing rollup usage in the cluster
      // We will simulate rollup usage by creating a mock-up rollup index
      await createMockRollupIndex(es);
    });

    it('shows deprecation prompt when there are no existing rollup jobs', async () => {
      expect(await testSubjects.exists('jobListDeprecatedPrompt')).to.be(true);
    });

    it('create new rollup job', async () => {
      const interval = '1000ms';
      const esNode = isRunningCcs ? remoteEs : es;
      for (const day of pastDates) {
        await esNode.index(mockIndices(day, rollupSourceDataPrepend));
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
      // Stop the running rollup job.
      await es.transport.request({
        path: `/_rollup/job/${rollupJobName}/_stop?wait_for_completion=true`,
        method: 'POST',
      });
      // Delete the rollup job.
      await es.transport.request({
        path: `/_rollup/job/${rollupJobName}`,
        method: 'DELETE',
      });

      // Delete all data indices that were created.
      await esDeleteAllIndices([targetIndexName, MOCK_ROLLUP_INDEX_NAME], false);
      if (isRunningCcs) {
        await esDeleteAllIndices([indexPatternToUse], true);
      } else {
        await esDeleteAllIndices([indexPatternToUse], false);
      }
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.restoreDefaults();
    });
  });
}
