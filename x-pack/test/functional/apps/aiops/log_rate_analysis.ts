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
import { logRateAnalysisTestData } from './log_rate_analysis_test_data';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'console', 'header', 'home', 'security']);
  const browser = getService('browser');
  const elasticChart = getService('elasticChart');
  const aiops = getService('aiops');
  const retry = getService('retry');

  // AIOps / Log Rate Analysis lives in the ML UI so we need some related services.
  const ml = getService('ml');

  function runTests(testData: TestData) {
    it(`${testData.suiteTitle} loads the source data in log rate analysis`, async () => {
      await elasticChart.setNewChartUiDebugFlag(true);

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the saved search selection page`
      );
      await aiops.logRateAnalysisPage.navigateToDataViewSelection();

      await ml.testExecution.logTestStep(`${testData.suiteTitle} loads the log rate analysis page`);
      await ml.jobSourceSelection.selectSourceForLogRateAnalysis(testData.sourceIndexOrSavedSearch);
    });

    it(`${testData.suiteTitle} displays index details`, async () => {
      await ml.testExecution.logTestStep(`${testData.suiteTitle} displays the time range step`);
      await aiops.logRateAnalysisPage.assertTimeRangeSelectorSectionExists();

      await ml.testExecution.logTestStep(`${testData.suiteTitle} loads data for full time range`);
      if (testData.query) {
        await aiops.logRateAnalysisPage.setQueryInput(testData.query);
      }
      await aiops.logRateAnalysisPage.clickUseFullDataButton(
        testData.expected.totalDocCountFormatted
      );

      if (isTestDataExpectedWithSampleProbability(testData.expected)) {
        await aiops.logRateAnalysisPage.assertSamplingProbability(
          testData.expected.sampleProbabilityFormatted
        );
      } else {
        await aiops.logRateAnalysisPage.assertSamplingProbabilityMissing();
      }

      await PageObjects.header.waitUntilLoadingHasFinished();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the doc count panel correctly`
      );
      await aiops.logRateAnalysisPage.assertTotalDocCountHeaderExists();
      await aiops.logRateAnalysisPage.assertTotalDocCountChartExists();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the page correctly`
      );
      await aiops.logRateAnalysisPage.assertSearchPanelExists();

      await ml.testExecution.logTestStep('displays prompt');
      if (testData.expected.prompt === 'empty') {
        await aiops.logRateAnalysisPage.assertNoWindowParametersEmptyPromptExists();
      } else if (testData.expected.prompt === 'change-point') {
        await aiops.logRateAnalysisPage.assertChangePointDetectedPromptExists();
      } else {
        throw new Error('Invalid prompt');
      }

      await ml.testExecution.logTestStep('clicks the document count chart to start analysis');
      await aiops.logRateAnalysisPage.clickDocumentCountChart(testData.chartClickCoordinates);
      await aiops.logRateAnalysisPage.assertAnalysisSectionExists();

      if (testData.brushDeviationTargetTimestamp) {
        await ml.testExecution.logTestStep('displays the no results found prompt');
        await aiops.logRateAnalysisPage.assertNoResultsFoundEmptyPromptExists();

        await ml.testExecution.logTestStep('adjusts the brushes to get analysis results');
        await aiops.logRateAnalysisPage.assertRerunAnalysisButtonExists(false);

        // Get the current width of the deviation brush for later comparison.
        const brushSelectionWidthBefore = await aiops.logRateAnalysisPage.getBrushSelectionWidth(
          'aiopsBrushDeviation'
        );

        // Get the px values for the timestamp we want to move the brush to.
        const { targetPx, intervalPx } = await aiops.logRateAnalysisPage.getPxForTimestamp(
          testData.brushDeviationTargetTimestamp
        );

        // Adjust the right brush handle
        await aiops.logRateAnalysisPage.adjustBrushHandler(
          'aiopsBrushDeviation',
          'handle--e',
          targetPx + intervalPx * testData.brushIntervalFactor
        );

        // Adjust the left brush handle
        await aiops.logRateAnalysisPage.adjustBrushHandler(
          'aiopsBrushDeviation',
          'handle--w',
          targetPx - intervalPx * (testData.brushIntervalFactor - 1)
        );

        if (testData.brushBaselineTargetTimestamp) {
          // Get the px values for the timestamp we want to move the brush to.
          const { targetPx: targetBaselinePx } = await aiops.logRateAnalysisPage.getPxForTimestamp(
            testData.brushBaselineTargetTimestamp
          );

          // Adjust the right brush handle
          await aiops.logRateAnalysisPage.adjustBrushHandler(
            'aiopsBrushBaseline',
            'handle--e',
            targetBaselinePx + intervalPx * testData.brushIntervalFactor
          );

          // Adjust the left brush handle
          await aiops.logRateAnalysisPage.adjustBrushHandler(
            'aiopsBrushBaseline',
            'handle--w',
            targetBaselinePx - intervalPx * (testData.brushIntervalFactor - 1)
          );
        }

        // Get the new brush selection width for later comparison.
        const brushSelectionWidthAfter = await aiops.logRateAnalysisPage.getBrushSelectionWidth(
          'aiopsBrushDeviation'
        );

        // Assert the adjusted brush: The selection width should have changed and
        // we test if the selection is smaller than two bucket intervals.
        // Finally, the adjusted brush should trigger
        // a warning on the "Rerun analysis" button.
        expect(brushSelectionWidthBefore).not.to.be(brushSelectionWidthAfter);
        expect(brushSelectionWidthAfter).not.to.be.greaterThan(
          intervalPx * 2 * testData.brushIntervalFactor
        );

        await aiops.logRateAnalysisPage.assertRerunAnalysisButtonExists(true);

        await ml.testExecution.logTestStep('rerun the analysis with adjusted settings');

        await aiops.logRateAnalysisPage.clickRerunAnalysisButton(true);
      }

      // Wait for the analysis to finish
      await aiops.logRateAnalysisPage.assertAnalysisComplete(
        testData.analysisType,
        testData.dataGenerator
      );

      // At this stage the baseline and deviation brush position should be stored in
      // the url state and a full browser refresh should restore the analysis.
      await browser.refresh();
      await aiops.logRateAnalysisPage.assertAnalysisComplete(
        testData.analysisType,
        testData.dataGenerator
      );

      await aiops.logRateAnalysisPage.assertUrlState(
        testData.expected.globalState,
        testData.expected.appState
      );

      // The group switch should be disabled by default
      await aiops.logRateAnalysisPage.assertLogRateAnalysisResultsGroupSwitchExists(false);

      await retry.tryForTime(30 * 1000, async () => {
        if (!isTestDataExpectedWithSampleProbability(testData.expected)) {
          // Enabled grouping
          await aiops.logRateAnalysisPage.clickLogRateAnalysisResultsGroupSwitchOn();

          await aiops.logRateAnalysisResultsGroupsTable.assertLogRateAnalysisResultsTableExists();
          await aiops.logRateAnalysisResultsGroupsTable.scrollAnalysisTableIntoView();

          const analysisGroupsTable =
            await aiops.logRateAnalysisResultsGroupsTable.parseAnalysisTable();

          const actualAnalysisGroupsTable = orderBy(analysisGroupsTable, 'group');
          const expectedAnalysisGroupsTable = orderBy(
            testData.expected.analysisGroupsTable,
            'group'
          );

          expect(actualAnalysisGroupsTable).to.be.eql(
            expectedAnalysisGroupsTable,
            `Expected analysis groups table to be ${JSON.stringify(
              expectedAnalysisGroupsTable
            )}, got ${JSON.stringify(actualAnalysisGroupsTable)}`
          );
        }
      });

      if (!isTestDataExpectedWithSampleProbability(testData.expected)) {
        await ml.testExecution.logTestStep('expand table row');
        await aiops.logRateAnalysisResultsGroupsTable.assertExpandRowButtonExists();
        await aiops.logRateAnalysisResultsGroupsTable.expandRow();
        await aiops.logRateAnalysisResultsGroupsTable.scrollAnalysisTableIntoView();

        const analysisTable = await aiops.logRateAnalysisResultsTable.parseAnalysisTable();

        const actualAnalysisTable = orderBy(analysisTable, ['fieldName', 'fieldValue']);
        const expectedAnalysisTable = orderBy(testData.expected.analysisTable, [
          'fieldName',
          'fieldValue',
        ]);

        expect(actualAnalysisTable).to.be.eql(
          expectedAnalysisTable,
          `Expected analysis table results to be ${JSON.stringify(
            expectedAnalysisTable
          )}, got ${JSON.stringify(actualAnalysisTable)}`
        );

        await ml.testExecution.logTestStep('open the field filter');
        await aiops.logRateAnalysisPage.assertFieldFilterPopoverButtonExists(false);
        await aiops.logRateAnalysisPage.clickFieldFilterPopoverButton(true);
        await aiops.logRateAnalysisPage.assertFieldSelectorFieldNameList(
          testData.expected.fieldSelectorPopover
        );

        await ml.testExecution.logTestStep('filter fields');
        await aiops.logRateAnalysisPage.setFieldSelectorSearch(testData.fieldSelectorSearch);
        await aiops.logRateAnalysisPage.assertFieldSelectorFieldNameList([
          testData.fieldSelectorSearch,
        ]);
        await aiops.logRateAnalysisPage.clickFieldSelectorDisableAllSelectedButton();
        await aiops.logRateAnalysisPage.assertFieldFilterApplyButtonExists(
          !testData.fieldSelectorApplyAvailable
        );

        if (testData.fieldSelectorApplyAvailable) {
          await ml.testExecution.logTestStep('regroup results');
          await aiops.logRateAnalysisPage.clickFieldFilterApplyButton();

          const filteredAnalysisGroupsTable =
            await aiops.logRateAnalysisResultsGroupsTable.parseAnalysisTable();

          const actualFilteredAnalysisGroupsTable = orderBy(filteredAnalysisGroupsTable, 'group');
          const expectedFilteredAnalysisGroupsTable = orderBy(
            testData.expected.filteredAnalysisGroupsTable,
            'group'
          );

          expect(actualFilteredAnalysisGroupsTable).to.be.eql(
            expectedFilteredAnalysisGroupsTable,
            `Expected filtered analysis groups table to be ${JSON.stringify(
              expectedFilteredAnalysisGroupsTable
            )}, got ${JSON.stringify(actualFilteredAnalysisGroupsTable)}`
          );
        }

        if (testData.action !== undefined) {
          await ml.testExecution.logTestStep('check all table row actions are present');
          await aiops.logRateAnalysisResultsGroupsTable.assertRowActions(
            testData.action.tableRowId
          );

          await ml.testExecution.logTestStep('click log pattern analysis action');
          await aiops.logRateAnalysisResultsGroupsTable.clickRowAction(
            testData.action.tableRowId,
            testData.action.type
          );

          await ml.testExecution.logTestStep('check log pattern analysis page loaded correctly');
          await aiops.logPatternAnalysisPage.assertLogPatternAnalysisPageExists();
          await aiops.logPatternAnalysisPage.assertTotalDocumentCount(
            testData.action.expected.totalDocCount
          );
          await aiops.logPatternAnalysisPage.assertQueryInput(testData.action.expected.queryBar);
        }
      }
    });
  }

  describe('log rate analysis', async function () {
    for (const testData of logRateAnalysisTestData) {
      describe(`with '${testData.sourceIndexOrSavedSearch}'`, function () {
        before(async () => {
          await aiops.logRateAnalysisDataGenerator.generateData(testData.dataGenerator);

          await ml.testResources.setKibanaTimeZoneToUTC();

          await ml.securityUI.loginAsMlPowerUser();
          await ml.testResources.createDataViewIfNeeded(
            testData.sourceIndexOrSavedSearch,
            '@timestamp'
          );
        });

        after(async () => {
          await elasticChart.setNewChartUiDebugFlag(false);
          await ml.testResources.deleteDataViewByTitle(testData.sourceIndexOrSavedSearch);
          await aiops.logRateAnalysisDataGenerator.removeGeneratedData(testData.dataGenerator);
        });

        it(`${testData.suiteTitle} loads the log rate analysis page`, async () => {
          // Start navigation from the base of the ML app.
          await ml.navigation.navigateToMl();
          await elasticChart.setNewChartUiDebugFlag(true);
        });

        runTests(testData);
      });
    }
  });
}
