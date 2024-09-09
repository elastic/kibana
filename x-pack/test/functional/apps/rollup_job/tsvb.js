/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import mockRolledUpData from './hybrid_index_helper';
import { MOCK_ROLLUP_INDEX_NAME, createMockRollupIndex } from './test_helpers';

export default function ({ getService, getPageObjects }) {
  const es = getService('es');
  const retry = getService('retry');
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const PageObjects = getPageObjects([
    'common',
    'settings',
    'visualize',
    'visualBuilder',
    'timePicker',
  ]);
  const fromTime = 'Oct 15, 2019 @ 00:00:01.000';
  const toTime = 'Oct 15, 2019 @ 19:31:44.000';

  describe('tsvb integration', function () {
    //Since rollups can only be created once with the same name (even if you delete it),
    //we add the Date.now() to avoid name collision if you run the tests locally back to back.
    const rollupJobName = `tsvb-test-rollup-job-${Date.now()}`;
    const rollupSourceIndexName = 'rollup-source-data';
    const rollupTargetIndexName = 'rollup-target-data';
    const pastDates = [
      new Date('October 15, 2019 05:35:32'),
      new Date('October 15, 2019 05:34:32'),
      new Date('October 15, 2019 05:33:32'),
    ];

    before(async () => {
      // load visualize to have an index pattern ready, otherwise visualize will redirect
      await security.testUser.setRoles(['global_visualize_all', 'test_rollup_reader']);
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/rollup/rollup.json'
      );
      await kibanaServer.uiSettings.update({
        defaultIndex: 'rollup',
        'metrics:allowStringIndices': true,
        'timepicker:timeDefaults': `{ "from": "${fromTime}", "to": "${toTime}"}`,
      });

      // From 8.15, Es only allows creating a new rollup job when there is existing rollup usage in the cluster
      // We will simulate rollup usage by creating a mock-up rollup index
      await createMockRollupIndex(es);
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
        await es.rollup.putJob({
          id: rollupJobName,
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

      await pastDates.map(async (day) => {
        await es.index(mockRolledUpData(rollupJobName, rollupTargetIndexName, day));
      });

      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisualBuilder();
      await PageObjects.visualBuilder.checkVisualBuilderIsPresent();
      await PageObjects.visualBuilder.clickMetric();
      await PageObjects.visualBuilder.checkMetricTabIsPresent();
      await PageObjects.visualBuilder.clickPanelOptions('metric');
      await PageObjects.visualBuilder.setIndexPatternValue(rollupTargetIndexName, false);
      await PageObjects.visualBuilder.selectIndexPatternTimeField('@timestamp');
      await PageObjects.visualBuilder.setMetricsDataTimerangeMode('Last value');
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

      await esDeleteAllIndices([
        rollupTargetIndexName,
        rollupSourceIndexName,
        MOCK_ROLLUP_INDEX_NAME,
      ]);
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/rollup/rollup.json'
      );
      await kibanaServer.uiSettings.update({ 'metrics:allowStringIndices': false });
      await kibanaServer.uiSettings.replace({});
      await security.testUser.restoreDefaults();
    });
  });
}
