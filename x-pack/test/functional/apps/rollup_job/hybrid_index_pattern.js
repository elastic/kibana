/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import expect from '@kbn/expect';
import mockRolledUpData, { mockIndices } from './hybrid_index_helper';

export default function({ getService, getPageObjects }) {
  const es = getService('legacyEs');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'settings']);

  describe('hybrid index pattern', function() {
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

    it('create hybrid index pattern', async () => {
      //Create data for rollup job to recognize.
      //Index past data to be used in the test.
      await pastDates.map(async day => {
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
        await es.transport.request({
          path: `/_rollup/job/${rollupJobName}`,
          method: 'PUT',
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

      await pastDates.map(async day => {
        await es.index(mockRolledUpData(rollupJobName, rollupTargetIndexName, day));
      });

      //Index live data to be used in the test.
      await es.index(mockIndices(datemath.parse('now', { forceNow: now }), regularIndexPrefix));

      await PageObjects.common.navigateToApp('settings');
      await PageObjects.settings.createIndexPattern(rollupIndexPatternName, '@timestamp', false);

      await PageObjects.settings.clickKibanaIndexPatterns();
      const indexPattern = (await PageObjects.settings.getIndexPatternList()).pop();
      const indexPatternText = await indexPattern.getVisibleText();
      expect(indexPatternText).to.contain(rollupIndexPatternName);
      expect(indexPatternText).to.contain('Rollup');
    });

    after(async () => {
      // Delete the rollup job.
      await es.transport.request({
        path: `/_rollup/job/${rollupJobName}`,
        method: 'DELETE',
      });

      await es.indices.delete({ index: rollupTargetIndexName });
      await es.indices.delete({ index: `${regularIndexPrefix}*` });
      await es.indices.delete({ index: `${rollupSourceIndexPrefix}*` });
      await esArchiver.load('empty_kibana');
    });
  });
}
