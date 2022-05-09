/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import expect from '@kbn/expect';
import mockRolledUpData, { mockIndices } from './hybrid_index_helper';

export default function ({ getService, getPageObjects }) {
  const es = getService('es');
  const retry = getService('retry');
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'settings']);
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('hybrid index pattern', function () {
    //Since rollups can only be created once with the same name (even if you delete it),
    //we add the Date.now() to avoid name collision if you run the tests locally back to back.
    const rollupJobName = `hybrid-index-pattern-test-rollup-job-${Date.now()}`;
    const rollupTargetIndexName = `rollup-target-data`;
    const regularIndexPrefix = `regular-index`;
    const rollupSourceIndexPrefix = `rollup-source-data`;
    const rollupIndexPatternName = `${regularIndexPrefix}*,${rollupTargetIndexName}`;
    const now = new Date();
    const pastDates = [
      datemath.parse('now-1d', { forceNow: now }),
      datemath.parse('now-2d', { forceNow: now }),
      datemath.parse('now-3d', { forceNow: now }),
    ];

    before(async () => {
      // load visualize to have an index pattern ready, otherwise visualize will redirect
      await security.testUser.setRoles([
        'global_index_pattern_management_all',
        'test_rollup_reader',
      ]);
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/rollup/rollup_hybrid'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'rollup',
      });
    });

    it('create hybrid index pattern', async () => {
      //Create data for rollup job to recognize.
      //Index past data to be used in the test.
      await pastDates.map(async (day) => {
        await es.index(mockIndices(day, rollupSourceIndexPrefix));
      });

      await retry.waitForWithTimeout(
        'waiting for 3 records to be loaded into elasticsearch.',
        10000,
        async () => {
          const response = await es.indices.get({
            index: `${rollupSourceIndexPrefix}*`,
            allow_no_indices: false,
          });
          return Object.keys(response).length === 3;
        }
      );

      await retry.try(async () => {
        //Create a rollup for kibana to recognize
        await es.rollup.putJob({
          id: rollupJobName,
          body: {
            index_pattern: `${rollupSourceIndexPrefix}*`,
            rollup_index: rollupTargetIndexName,
            cron: '*/10 * * * * ?',
            groups: {
              date_histogram: {
                fixed_interval: '1000ms',
                field: '@timestamp',
                time_zone: 'UTC',
              },
            },
            timeout: '20s',
            page_size: 1000,
          },
        });
      });

      await pastDates.map(async (day) => {
        await es.index(mockRolledUpData(rollupJobName, rollupTargetIndexName, day));
      });

      //Index live data to be used in the test.
      await es.index(mockIndices(datemath.parse('now', { forceNow: now }), regularIndexPrefix));

      await PageObjects.common.navigateToApp('settings');
      await PageObjects.settings.createIndexPattern(rollupIndexPatternName, '@timestamp', false);

      await PageObjects.settings.clickKibanaIndexPatterns();
      const indexPatternNames = await PageObjects.settings.getAllIndexPatternNames();
      //The assertion is going to check that the string has the right name and that the text Rollup
      //is included (since there is a Rollup tag).
      const filteredIndexPatternNames = indexPatternNames.filter(
        (i) => i.includes(rollupIndexPatternName) && i.includes('Rollup')
      );
      expect(filteredIndexPatternNames.length).to.be(1);

      // ensure all fields are available
      await PageObjects.settings.clickIndexPatternByName(rollupIndexPatternName);
      const fields = await PageObjects.settings.getFieldNames();
      expect(fields).to.eql(['@timestamp', '_id', '_index', '_score', '_source', '_type']);
    });

    after(async () => {
      // Delete the rollup job.
      await es.rollup.deleteJob({ id: rollupJobName });

      await esDeleteAllIndices([
        rollupTargetIndexName,
        `${regularIndexPrefix}*`,
        `${rollupSourceIndexPrefix}*`,
      ]);
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/rollup/rollup_hybrid'
      );
    });
  });
}
