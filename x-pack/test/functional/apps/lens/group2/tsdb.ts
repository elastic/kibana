/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'lens', 'dashboard']);
  const testSubjects = getService('testSubjects');
  const es = getService('es');
  const log = getService('log');
  const indexPatterns = getService('indexPatterns');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  describe('lens tsdb', function () {
    const dataViewTitle = 'sample-01';
    const rollupDataViewTitle = 'sample-01,sample-01-rollup';
    const fromTime = 'Jun 17, 2022 @ 00:00:00.000';
    const toTime = 'Jun 23, 2022 @ 00:00:00.000';
    const testArchive = 'test/functional/fixtures/es_archiver/search/downsampled';
    const testIndex = 'sample-01';
    const testRollupIndex = 'sample-01-rollup';

    before(async () => {
      // create rollup data
      log.info(`loading ${testIndex} index...`);
      await esArchiver.loadIfNeeded(testArchive);
      log.info(`add write block to ${testIndex} index...`);
      await es.indices.addBlock({ index: testIndex, block: 'write' });
      try {
        log.info(`rolling up ${testIndex} index...`);
        // es client currently does not have method for downsample
        await es.transport.request<void>({
          method: 'POST',
          path: '/sample-01/_downsample/sample-01-rollup',
          body: { fixed_interval: '1h' },
        });
      } catch (err) {
        log.info(`ignoring resource_already_exists_exception...`);
        if (!err.message.match(/resource_already_exists_exception/)) {
          throw err;
        }
      }

      log.info(`creating ${rollupDataViewTitle} data view...`);
      await indexPatterns.create(
        {
          title: rollupDataViewTitle,
          timeFieldName: '@timestamp',
        },
        { override: true }
      );
      await indexPatterns.create(
        {
          title: dataViewTitle,
          timeFieldName: '@timestamp',
        },
        { override: true }
      );
      await kibanaServer.uiSettings.update({
        'dateFormat:tz': 'UTC',
        defaultIndex: '0ae0bc7a-e4ca-405c-ab67-f2b5913f2a51',
        'timepicker:timeDefaults': '{ "from": "now-1y", "to": "now" }',
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
      await es.indices.delete({ index: [testIndex, testRollupIndex] });
    });

    describe('for regular metric', () => {
      it('defaults to median for non-rolled up metric', async () => {
        await PageObjects.common.navigateToApp('lens');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.lens.switchDataPanelIndexPattern(dataViewTitle);
        await PageObjects.lens.waitForField('kubernetes.container.memory.available.bytes');
        await PageObjects.lens.dragFieldToWorkspace(
          'kubernetes.container.memory.available.bytes',
          'xyVisChart'
        );
        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
          'Median of kubernetes.container.memory.available.bytes'
        );
      });

      it('does not show a warning', async () => {
        await PageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel');
        await testSubjects.missingOrFail('median-partial-warning');
        await PageObjects.lens.assertNoEditorWarning();
        await PageObjects.lens.closeDimensionEditor();
      });
    });

    describe('for rolled up metric', () => {
      it('defaults to average for rolled up metric', async () => {
        await PageObjects.lens.switchDataPanelIndexPattern(rollupDataViewTitle);
        await PageObjects.lens.removeLayer();
        await PageObjects.lens.waitForField('kubernetes.container.memory.available.bytes');
        await PageObjects.lens.dragFieldToWorkspace(
          'kubernetes.container.memory.available.bytes',
          'xyVisChart'
        );
        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
          'Average of kubernetes.container.memory.available.bytes'
        );
      });
      it('shows warnings in editor when using median', async () => {
        await PageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel');
        await testSubjects.existOrFail('median-partial-warning');
        await testSubjects.click('lns-indexPatternDimension-median');
        await PageObjects.lens.waitForVisualization('xyVisChart');
        await PageObjects.lens.assertMessageListContains(
          'Median of kubernetes.container.memory.available.bytes uses a function that is unsupported by rolled up data. Select a different function or change the time range.'
        );
      });
      it('shows warnings in dashboards as well', async () => {
        await PageObjects.lens.save('New', false, false, false, 'new');

        await PageObjects.dashboard.waitForRenderComplete();
        await PageObjects.lens.assertMessageListContains(
          'Median of kubernetes.container.memory.available.bytes uses a function that is unsupported by rolled up data. Select a different function or change the time range.'
        );
      });
    });
  });
}
