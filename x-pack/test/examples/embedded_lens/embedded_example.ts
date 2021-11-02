/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['lens', 'common', 'dashboard', 'timeToVisualize']);
  const elasticChart = getService('elasticChart');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  async function checkData() {
    await retry.try(async () => {
      const data = await elasticChart.getChartDebugData();
      expect(data!.bars![0].bars.length).to.eql(24);
    });
  }

  describe('show and save', () => {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('embedded_lens_example');
      await elasticChart.setNewChartUiDebugFlag(true);
      await testSubjects.click('lns-example-change-time-range');
      await PageObjects.lens.waitForVisualization();
    });

    it('should show chart', async () => {
      await testSubjects.click('lns-example-change-color');
      await PageObjects.lens.waitForVisualization();
      await checkData();
    });

    it('should save to dashboard', async () => {
      await testSubjects.click('lns-example-save');
      await PageObjects.timeToVisualize.setSaveModalValues('From example', {
        saveAsNew: true,
        redirectToOrigin: false,
        addToDashboard: 'new',
        dashboardId: undefined,
        saveToLibrary: false,
      });

      await testSubjects.click('confirmSaveSavedObjectButton');
      await retry.waitForWithTimeout('Save modal to disappear', 1000, () =>
        testSubjects
          .missingOrFail('confirmSaveSavedObjectButton')
          .then(() => true)
          .catch(() => false)
      );
      await PageObjects.lens.goToTimeRange();
      await PageObjects.dashboard.waitForRenderComplete();
      await checkData();
    });

    it('should load Lens editor', async () => {
      await testSubjects.click('lns-example-open-editor');
      await PageObjects.lens.waitForVisualization();
      await checkData();
    });
  });
}
