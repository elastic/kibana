/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';
import type { TestData } from './types';
import { farequoteDataViewTestData } from './test_data';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const headerPage = getPageObject('header');
  const elasticChart = getService('elasticChart');
  const esArchiver = getService('esArchiver');
  const aiops = getService('aiops');

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
      await aiops.explainLogRateSpikes.assertTotalDocCountHeaderExists();
      await aiops.explainLogRateSpikes.assertTotalDocCountChartExists();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the page correctly`
      );
      await aiops.explainLogRateSpikes.assertSearchPanelExists();

      await ml.testExecution.logTestStep('displays empty prompt');
      await aiops.explainLogRateSpikes.assertNoWindowParametersEmptyPromptExists();

      await ml.testExecution.logTestStep('clicks the document count chart to start analysis');
      await aiops.explainLogRateSpikes.clickDocumentCountChart();
      await aiops.explainLogRateSpikes.assertAnalysisSectionExists();

      await ml.testExecution.logTestStep('displays the no results found prompt');
      await aiops.explainLogRateSpikes.assertNoResultsFoundEmptyPromptExists();

      await ml.testExecution.logTestStep('adjusts the brushes to get analysis results');
      await aiops.explainLogRateSpikes.assertRerunAnalysisButtonExists(false);

      // Get the current width of the deviation brush for later comparison.
      const brushSelectionWidthBefore = await aiops.explainLogRateSpikes.getBrushSelectionWidth(
        'aiopsBrushDeviation'
      );

      // Get the px values for the timestamp we want to move the brush to.
      const { targetPx, intervalPx } = await aiops.explainLogRateSpikes.getPxForTimestamp(
        testData.brushTargetTimestamp
      );

      // Adjust the right brush handle
      await aiops.explainLogRateSpikes.adjustBrushHandler(
        'aiopsBrushDeviation',
        'handle--e',
        targetPx
      );

      // Adjust the left brush handle
      await aiops.explainLogRateSpikes.adjustBrushHandler(
        'aiopsBrushDeviation',
        'handle--w',
        targetPx - intervalPx
      );

      // Get the new brush selection width for later comparison.
      const brushSelectionWidthAfter = await aiops.explainLogRateSpikes.getBrushSelectionWidth(
        'aiopsBrushDeviation'
      );

      // Assert the adjusted brush: The selection width should have changed and
      // we test if the selection is smaller than two bucket intervals.
      // Finally, the adjusted brush should trigger
      // a warning on the "Rerun analysis" button.
      expect(brushSelectionWidthBefore).not.to.be(brushSelectionWidthAfter);
      expect(brushSelectionWidthAfter).not.to.be.greaterThan(intervalPx * 2);

      await aiops.explainLogRateSpikes.assertRerunAnalysisButtonExists(true);

      await ml.testExecution.logTestStep('rerun the analysis with adjusted settings');

      await aiops.explainLogRateSpikes.clickRerunAnalysisButton(true);
      await aiops.explainLogRateSpikes.assertProgressTitle('Progress: 100% — Done.');

      await aiops.explainLogRateSpikesAnalysisTable.assertSpikeAnalysisTableExists();

      const analysisTable = await aiops.explainLogRateSpikesAnalysisTable.parseAnalysisTable();

      expect(analysisTable).to.be.eql(testData.expected.analysisTable);
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
      await elasticChart.setNewChartUiDebugFlag(false);
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
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
