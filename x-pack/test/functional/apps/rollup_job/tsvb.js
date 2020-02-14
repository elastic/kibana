/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import expect from '@kbn/expect';
import mockRolledUpData from './hybrid_index_helper';

export default function({ getService, getPageObjects }) {
  const es = getService('legacyEs');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'common',
    'settings',
    'visualize',
    'visualBuilder',
    'timePicker',
  ]);

  // https://github.com/elastic/kibana/issues/56816
  describe.skip('tsvb integration', function() {
    //Since rollups can only be created once with the same name (even if you delete it),
    //we add the Date.now() to avoid name collision if you run the tests locally back to back.
    const rollupJobName = `tsvb-test-rollup-job-${Date.now()}`;
    const rollupSourceIndexName = 'rollup-source-data';
    const rollupTargetIndexName = `rollup-target-data`;
    const now = new Date();
    const pastDates = [
      datemath.parse('now-1m', { forceNow: now }),
      datemath.parse('now-2m', { forceNow: now }),
      datemath.parse('now-3m', { forceNow: now }),
    ];

    before(async () => {
      // load visualize to have an index pattern ready, otherwise visualize will redirect
      await esArchiver.load('visualize/default');
    });

    it('create rollup tsvb', async () => {
      //Create data for rollup job so it doesn't fail
      await es.index({
        index: rollupSourceIndexName,
        body: {
          '@timestamp': new Date().toISOString(),
        },
      });

      await retry.try(async () => {
        //Create a rollup for kibana to recognize
        await es.transport.request({
          path: `/_rollup/job/${rollupJobName}`,
          method: 'PUT',
          body: {
            index_pattern: rollupSourceIndexName,
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

      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisualBuilder();
      await PageObjects.visualBuilder.checkVisualBuilderIsPresent();
      await PageObjects.timePicker.openQuickSelectTimeMenu();
      await testSubjects.click('superDatePickerCommonlyUsed_Last_24 hours');
      await PageObjects.visualBuilder.clickMetric();
      await PageObjects.visualBuilder.checkMetricTabIsPresent();
      await PageObjects.visualBuilder.clickPanelOptions('metric');
      await PageObjects.visualBuilder.setIndexPatternValue(rollupTargetIndexName);
      await PageObjects.visualBuilder.setIntervalValue('1d');
      await PageObjects.visualBuilder.setDropLastBucket(false);
      await PageObjects.common.sleep(3000);
      const newValue = await PageObjects.visualBuilder.getMetricValue();
      expect(newValue).to.eql('3');
    });

    after(async () => {
      // Delete the rollup job.
      await es.transport.request({
        path: `/_rollup/job/${rollupJobName}`,
        method: 'DELETE',
      });

      await es.indices.delete({ index: rollupTargetIndexName });
      await es.indices.delete({ index: rollupSourceIndexName });
      await esArchiver.load('empty_kibana');
    });
  });
}
