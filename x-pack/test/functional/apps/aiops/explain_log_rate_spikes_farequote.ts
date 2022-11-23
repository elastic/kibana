/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';
import type { TestDataEsArchive } from './types';
import { farequoteDataViewTestData } from './test_data';

const ES_INDEX = 'ft_farequote';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const es = getService('es');
  const headerPage = getPageObject('header');
  const elasticChart = getService('elasticChart');
  const esArchiver = getService('esArchiver');
  const aiops = getService('aiops');

  // aiops / Explain Log Rate Spikes lives in the ML UI so we need some related services.
  const ml = getService('ml');

  function runTests(testData: TestDataEsArchive) {
    it(`${testData.suiteTitle} loads the source data in explain log rate spikes`, async () => {
      await elasticChart.setNewChartUiDebugFlag(true);

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the saved search selection page`
      );
      await aiops.explainLogRateSpikesPage.navigateToIndexPatternSelection();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the explain log rate spikes page`
      );
      await ml.jobSourceSelection.selectSourceForExplainLogRateSpikes(
        testData.sourceIndexOrSavedSearch
      );
    });

    it(`${testData.suiteTitle} displays index details`, async () => {
      await ml.testExecution.logTestStep(`${testData.suiteTitle} displays the time range step`);
      await aiops.explainLogRateSpikesPage.assertTimeRangeSelectorSectionExists();

      await ml.testExecution.logTestStep(`${testData.suiteTitle} loads data for full time range`);
      await aiops.explainLogRateSpikesPage.clickUseFullDataButton(
        testData.expected.totalDocCountFormatted
      );
      await headerPage.waitUntilLoadingHasFinished();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the doc count panel correctly`
      );
      await aiops.explainLogRateSpikesPage.assertTotalDocCountHeaderExists();
      await aiops.explainLogRateSpikesPage.assertTotalDocCountChartExists();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the page correctly`
      );
      await aiops.explainLogRateSpikesPage.assertSearchPanelExists();

      await ml.testExecution.logTestStep('displays empty prompt');
      await aiops.explainLogRateSpikesPage.assertNoWindowParametersEmptyPromptExists();

      await ml.testExecution.logTestStep('clicks the document count chart to start analysis');
      await aiops.explainLogRateSpikesPage.clickDocumentCountChart(testData.chartClickCoordinates);
      await aiops.explainLogRateSpikesPage.assertAnalysisSectionExists();

      await ml.testExecution.logTestStep('displays the no results found prompt');
      await aiops.explainLogRateSpikesPage.assertNoResultsFoundEmptyPromptExists();

      await ml.testExecution.logTestStep('adjusts the brushes to get analysis results');
      await aiops.explainLogRateSpikesPage.assertRerunAnalysisButtonExists(false);

      // Get the current width of the deviation brush for later comparison.
      const brushSelectionWidthBefore = await aiops.explainLogRateSpikesPage.getBrushSelectionWidth(
        'aiopsBrushDeviation'
      );

      // Get the px values for the timestamp we want to move the brush to.
      const { targetPx, intervalPx } = await aiops.explainLogRateSpikesPage.getPxForTimestamp(
        testData.brushDeviationTargetTimestamp
      );

      // Adjust the right brush handle
      await aiops.explainLogRateSpikesPage.adjustBrushHandler(
        'aiopsBrushDeviation',
        'handle--e',
        targetPx + intervalPx
      );

      // Adjust the left brush handle
      await aiops.explainLogRateSpikesPage.adjustBrushHandler(
        'aiopsBrushDeviation',
        'handle--w',
        targetPx
      );

      // Get the new brush selection width for later comparison.
      const brushSelectionWidthAfter = await aiops.explainLogRateSpikesPage.getBrushSelectionWidth(
        'aiopsBrushDeviation'
      );

      // Assert the adjusted brush: The selection width should have changed and
      // we test if the selection is smaller than two bucket intervals.
      // Finally, the adjusted brush should trigger
      // a warning on the "Rerun analysis" button.
      expect(brushSelectionWidthBefore).not.to.be(brushSelectionWidthAfter);
      expect(brushSelectionWidthAfter).not.to.be.greaterThan(intervalPx * 2);

      await aiops.explainLogRateSpikesPage.assertRerunAnalysisButtonExists(true);

      await ml.testExecution.logTestStep('rerun the analysis with adjusted settings');

      await aiops.explainLogRateSpikesPage.clickRerunAnalysisButton(true);
      await aiops.explainLogRateSpikesPage.assertProgressTitle('Progress: 100% — Done.');

      // The group switch should be disabled by default
      await aiops.explainLogRateSpikesPage.assertSpikeAnalysisGroupSwitchExists(false);

      // Enabled grouping
      await aiops.explainLogRateSpikesPage.clickSpikeAnalysisGroupSwitch(false);

      await aiops.explainLogRateSpikesAnalysisGroupsTable.assertSpikeAnalysisTableExists();

      const analysisGroupsTable =
        await aiops.explainLogRateSpikesAnalysisGroupsTable.parseAnalysisTable();

      expect(analysisGroupsTable).to.be.eql(testData.expected.analysisGroupsTable);

      await ml.testExecution.logTestStep('expand table row');
      await aiops.explainLogRateSpikesAnalysisGroupsTable.assertExpandRowButtonExists();
      await aiops.explainLogRateSpikesAnalysisGroupsTable.expandRow();

      const analysisTable = await aiops.explainLogRateSpikesAnalysisTable.parseAnalysisTable();
      expect(analysisTable).to.be.eql(testData.expected.analysisTable);
    });
  }

  describe('explain log rate spikes', function () {
    this.tags(['aiops']);
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');

      await ml.testResources.createIndexPatternIfNeeded(ES_INDEX, '@timestamp');

      await es.updateByQuery({
        index: ES_INDEX,
        body: {
          script: {
            // @ts-expect-error
            inline: 'ctx._source.custom_field = "default"',
            lang: 'painless',
          },
        },
      });

      await es.bulk({
        refresh: 'wait_for',
        body: [...Array(100)].flatMap((i) => {
          return [
            { index: { _index: ES_INDEX } },
            {
              '@timestamp': '2016-02-09T16:19:59.000Z',
              '@version': i,
              airline: 'UAL',
              custom_field: 'deviation',
              responsetime: 10,
              type: 'farequote',
            },
          ];
        }),
      });

      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await elasticChart.setNewChartUiDebugFlag(false);
      await ml.testResources.deleteIndexPatternByTitle(ES_INDEX);
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
