/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';
import { isTestDataExpectedWithSampleProbability, type TestData } from './types';
import { explainLogRateSpikesTestData } from './test_data';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'console', 'header', 'home', 'security']);
  const elasticChart = getService('elasticChart');
  const aiops = getService('aiops');

  // aiops / Explain Log Rate Spikes lives in the ML UI so we need some related services.
  const ml = getService('ml');

  function runTests(testData: TestData) {
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
      if (testData.query) {
        await aiops.explainLogRateSpikesPage.setQueryInput(testData.query);
      }
      await aiops.explainLogRateSpikesPage.clickUseFullDataButton(
        testData.expected.totalDocCountFormatted
      );

      if (isTestDataExpectedWithSampleProbability(testData.expected)) {
        await aiops.explainLogRateSpikesPage.assertSamplingProbability(
          testData.expected.sampleProbabilityFormatted
        );
      } else {
        await aiops.explainLogRateSpikesPage.assertSamplingProbabilityMissing();
      }

      await PageObjects.header.waitUntilLoadingHasFinished();

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

      if (testData.brushDeviationTargetTimestamp) {
        await ml.testExecution.logTestStep('displays the no results found prompt');
        await aiops.explainLogRateSpikesPage.assertNoResultsFoundEmptyPromptExists();

        await ml.testExecution.logTestStep('adjusts the brushes to get analysis results');
        await aiops.explainLogRateSpikesPage.assertRerunAnalysisButtonExists(false);

        // Get the current width of the deviation brush for later comparison.
        const brushSelectionWidthBefore =
          await aiops.explainLogRateSpikesPage.getBrushSelectionWidth('aiopsBrushDeviation');

        // Get the px values for the timestamp we want to move the brush to.
        const { targetPx, intervalPx } = await aiops.explainLogRateSpikesPage.getPxForTimestamp(
          testData.brushDeviationTargetTimestamp
        );

        // Adjust the right brush handle
        await aiops.explainLogRateSpikesPage.adjustBrushHandler(
          'aiopsBrushDeviation',
          'handle--e',
          targetPx + intervalPx * testData.brushIntervalFactor
        );

        // Adjust the left brush handle
        await aiops.explainLogRateSpikesPage.adjustBrushHandler(
          'aiopsBrushDeviation',
          'handle--w',
          targetPx - intervalPx * (testData.brushIntervalFactor - 1)
        );

        if (testData.brushBaselineTargetTimestamp) {
          // Get the px values for the timestamp we want to move the brush to.
          const { targetPx: targetBaselinePx } =
            await aiops.explainLogRateSpikesPage.getPxForTimestamp(
              testData.brushBaselineTargetTimestamp
            );

          // Adjust the right brush handle
          await aiops.explainLogRateSpikesPage.adjustBrushHandler(
            'aiopsBrushBaseline',
            'handle--e',
            targetBaselinePx + intervalPx * testData.brushIntervalFactor
          );

          // Adjust the left brush handle
          await aiops.explainLogRateSpikesPage.adjustBrushHandler(
            'aiopsBrushBaseline',
            'handle--w',
            targetBaselinePx - intervalPx * (testData.brushIntervalFactor - 1)
          );
        }

        // Get the new brush selection width for later comparison.
        const brushSelectionWidthAfter =
          await aiops.explainLogRateSpikesPage.getBrushSelectionWidth('aiopsBrushDeviation');

        // Assert the adjusted brush: The selection width should have changed and
        // we test if the selection is smaller than two bucket intervals.
        // Finally, the adjusted brush should trigger
        // a warning on the "Rerun analysis" button.
        expect(brushSelectionWidthBefore).not.to.be(brushSelectionWidthAfter);
        expect(brushSelectionWidthAfter).not.to.be.greaterThan(
          intervalPx * 2 * testData.brushIntervalFactor
        );

        await aiops.explainLogRateSpikesPage.assertRerunAnalysisButtonExists(true);

        await ml.testExecution.logTestStep('rerun the analysis with adjusted settings');

        await aiops.explainLogRateSpikesPage.clickRerunAnalysisButton(true);
      }

      await aiops.explainLogRateSpikesPage.assertProgressTitle('Progress: 100% — Done.');

      // The group switch should be disabled by default
      await aiops.explainLogRateSpikesPage.assertSpikeAnalysisGroupSwitchExists(false);

      if (!isTestDataExpectedWithSampleProbability(testData.expected)) {
        // Enabled grouping
        await aiops.explainLogRateSpikesPage.clickSpikeAnalysisGroupSwitch(false);

        await aiops.explainLogRateSpikesAnalysisGroupsTable.assertSpikeAnalysisTableExists();

        const analysisGroupsTable =
          await aiops.explainLogRateSpikesAnalysisGroupsTable.parseAnalysisTable();
        expect(orderBy(analysisGroupsTable, 'group')).to.be.eql(
          orderBy(testData.expected.analysisGroupsTable, 'group')
        );

        await ml.testExecution.logTestStep('expand table row');
        await aiops.explainLogRateSpikesAnalysisGroupsTable.assertExpandRowButtonExists();
        await aiops.explainLogRateSpikesAnalysisGroupsTable.expandRow();

        if (!isTestDataExpectedWithSampleProbability(testData.expected)) {
          const analysisTable = await aiops.explainLogRateSpikesAnalysisTable.parseAnalysisTable();
          expect(orderBy(analysisTable, ['fieldName', 'fieldValue'])).to.be.eql(
            orderBy(testData.expected.analysisTable, ['fieldName', 'fieldValue'])
          );
        }

        await ml.testExecution.logTestStep('open the field filter');
        await aiops.explainLogRateSpikesPage.assertFieldFilterPopoverButtonExists(false);
        await aiops.explainLogRateSpikesPage.clickFieldFilterPopoverButton(true);
        await aiops.explainLogRateSpikesPage.assertFieldSelectorFieldNameList(
          testData.expected.fieldSelectorPopover
        );

        await ml.testExecution.logTestStep('filter fields');
        await aiops.explainLogRateSpikesPage.setFieldSelectorSearch(testData.fieldSelectorSearch);
        await aiops.explainLogRateSpikesPage.assertFieldSelectorFieldNameList([
          testData.fieldSelectorSearch,
        ]);
        await aiops.explainLogRateSpikesPage.clickFieldSelectorDisableAllSelectedButton();
        await aiops.explainLogRateSpikesPage.assertFieldFilterApplyButtonExists(
          !testData.fieldSelectorApplyAvailable
        );

        if (testData.fieldSelectorApplyAvailable) {
          await ml.testExecution.logTestStep('regroup results');
          await aiops.explainLogRateSpikesPage.clickFieldFilterApplyButton();

          if (!isTestDataExpectedWithSampleProbability(testData.expected)) {
            const filteredAnalysisGroupsTable =
              await aiops.explainLogRateSpikesAnalysisGroupsTable.parseAnalysisTable();
            expect(orderBy(filteredAnalysisGroupsTable, 'group')).to.be.eql(
              orderBy(testData.expected.filteredAnalysisGroupsTable, 'group')
            );
          }
        }

        if (testData.action !== undefined) {
          await ml.testExecution.logTestStep('check all table row actions are present');
          await aiops.explainLogRateSpikesAnalysisGroupsTable.assertRowActions(
            testData.action.tableRowId
          );

          await ml.testExecution.logTestStep('click log pattern analysis action');
          await aiops.explainLogRateSpikesAnalysisGroupsTable.clickRowAction(
            testData.action.tableRowId,
            testData.action.type
          );

          await ml.testExecution.logTestStep('check log pattern analysis page loaded correctly');
          await aiops.logPatternAnalysisPageProvider.assertLogCategorizationPageExists();
          await aiops.logPatternAnalysisPageProvider.assertTotalDocumentCount(
            testData.action.expected.totalDocCount
          );
          await aiops.logPatternAnalysisPageProvider.assertQueryInput(
            testData.action.expected.queryBar
          );
        }
      }
    });
  }

  describe('explain log rate spikes', async function () {
    for (const testData of explainLogRateSpikesTestData) {
      describe(`with '${testData.sourceIndexOrSavedSearch}'`, function () {
        before(async () => {
          await aiops.explainLogRateSpikesDataGenerator.generateData(testData.dataGenerator);

          await ml.testResources.createIndexPatternIfNeeded(
            testData.sourceIndexOrSavedSearch,
            '@timestamp'
          );

          await ml.testResources.setKibanaTimeZoneToUTC();

          if (testData.dataGenerator === 'kibana_sample_data_logs') {
            await PageObjects.security.login('elastic', 'changeme', {
              expectSuccess: true,
            });

            await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
              useActualUrl: true,
            });
            await PageObjects.header.waitUntilLoadingHasFinished();
            await PageObjects.home.addSampleDataSet('logs');
            await PageObjects.header.waitUntilLoadingHasFinished();
          } else {
            await ml.securityUI.loginAsMlPowerUser();
          }
        });

        after(async () => {
          await elasticChart.setNewChartUiDebugFlag(false);
          if (testData.dataGenerator !== 'kibana_sample_data_logs') {
            await ml.testResources.deleteIndexPatternByTitle(testData.sourceIndexOrSavedSearch);
          }
          await aiops.explainLogRateSpikesDataGenerator.removeGeneratedData(testData.dataGenerator);
        });

        it(`${testData.suiteTitle} loads the explain log rate spikes page`, async () => {
          // Start navigation from the base of the ML app.
          await ml.navigation.navigateToMl();
          await elasticChart.setNewChartUiDebugFlag(true);
        });

        runTests(testData);
      });
    }
  });
}
