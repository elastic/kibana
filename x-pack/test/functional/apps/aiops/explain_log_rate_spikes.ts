/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';
import type { TestData } from './types';
import { farequoteDataViewTestData } from './test_data';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const headerPage = getPageObject('header');
  const browser = getService('browser');
  const elasticChart = getService('elasticChart');
  const esArchiver = getService('esArchiver');
  const aiops = getService('aiops');
  const testSubjects = getService('testSubjects');

  // aiops / Explain Log Rate Spikes lives in the ML UI so we need some related services.
  const ml = getService('ml');

  function runTests(testData: TestData) {
    it(`${testData.suiteTitle} loads the source data in explain log rate spikes`, async () => {
      await elasticChart.setNewChartUiDebugFlag(true);

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the saved search selection page`
      );
      await aiops.explainLogRateSpikes.navigateToIndexPatternSelection();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the explain log rate spikes page`
      );
      await ml.jobSourceSelection.selectSourceForExplainLogRateSpikes(
        testData.sourceIndexOrSavedSearch
      );
    });

    it(`${testData.suiteTitle} displays index details`, async () => {
      await ml.testExecution.logTestStep(`${testData.suiteTitle} displays the time range step`);
      await aiops.explainLogRateSpikes.assertTimeRangeSelectorSectionExists();

      await ml.testExecution.logTestStep(`${testData.suiteTitle} loads data for full time range`);
      await aiops.explainLogRateSpikes.clickUseFullDataButton(
        testData.expected.totalDocCountFormatted
      );
      await headerPage.waitUntilLoadingHasFinished();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the doc count panel correctly`
      );
      await aiops.explainLogRateSpikes.assertTotalDocCountHeaderExist();
      await aiops.explainLogRateSpikes.assertTotalDocCountChartExist();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the page correctly`
      );

      await aiops.explainLogRateSpikes.assertSearchPanelExist();

      await ml.testExecution.logTestStep('displays empty prompt');
      await aiops.explainLogRateSpikes.assertNoWindowParametersEmptyPromptExist();

      await ml.testExecution.logTestStep('clicks the document count chart to start analysis');

      await aiops.explainLogRateSpikes.clickDocumentCountChart();
      await aiops.explainLogRateSpikes.assertAnalysisSectionExist();

      await ml.testExecution.logTestStep('displays the no results found prompt');

      await aiops.explainLogRateSpikes.assertNoResultsFoundEmptyPromptExist();

      // aiopsDualBrush

      await elasticChart.waitForRenderComplete('aiopsDocumentCountChart');
      const chartDebugData = await elasticChart.getChartDebugData('aiopsDocumentCountChart');

      const dualBrushWrapper = await testSubjects.find('aiopsDualBrush');
      const dualBrushWrapperRect = await dualBrushWrapper._webElement.getRect();
      // console.log('dualBrushWidth', dualBrushWrapperRect.width);

      const bars = chartDebugData?.bars?.[0].bars ?? [];
      const barsCount = bars.length;
      const targetDeviationBarIndex = bars.findIndex((b) => b.x === 1455033600000);
      // console.log('chartDebugData', targetDeviationBarIndex);

      const targetPx = Math.round(
        (targetDeviationBarIndex / barsCount) * dualBrushWrapperRect.width
      );
      const intervalPx = Math.round((1 / barsCount) * dualBrushWrapperRect.width);
      // console.log('targetPx', targetPx);

      // #aiops-brush-deviation .handle--e
      const brush = await testSubjects.find('aiopsBrushDeviation');

      const rightHandle = (await brush.findAllByClassName('handle--e'))[0];
      const rightHandleRect = await rightHandle._webElement.getRect();
      const rightHandlePx = rightHandleRect.x - dualBrushWrapperRect.x;
      const rightHandleFactor = rightHandlePx > targetPx ? 1 : -1;
      const rightDragAndDropOffsetPx = (targetPx - rightHandlePx) * rightHandleFactor;

      await browser.dragAndDrop(
        { location: rightHandle, offset: { x: 0, y: 0 } },
        { location: rightHandle, offset: { x: rightDragAndDropOffsetPx, y: 0 } }
      );

      const leftHandle = (await brush.findAllByClassName('handle--w'))[0];
      const leftHandleRect = await leftHandle._webElement.getRect();
      const leftHandlePx = leftHandleRect.x - dualBrushWrapperRect.x;
      const leftHandleFactor = leftHandlePx > targetPx ? 1 : -1;
      const leftDragAndDropOffsetPx = (targetPx - leftHandlePx) * leftHandleFactor - intervalPx;

      await browser.dragAndDrop(
        { location: leftHandle, offset: { x: 0, y: 0 } },
        { location: leftHandle, offset: { x: leftDragAndDropOffsetPx, y: 0 } }
      );

      await aiops.explainLogRateSpikes.assertNoWindowParametersEmptyPromptExist();
    });
  }

  describe('explain log rate spikes', function () {
    this.tags(['aiops']);
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');

      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      // await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
    });

    describe('with farequote', function () {
      // Run tests on full farequote index.
      it(`${farequoteDataViewTestData.suiteTitle} loads the explain log rate spikes page`, async () => {
        // Start navigation from the base of the ML app.
        await ml.navigation.navigateToMl();
        await elasticChart.setNewChartUiDebugFlag(true);
      });

      runTests(farequoteDataViewTestData);
    });
  });
}
