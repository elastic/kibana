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
import { logRateAnalysisTestData } from './test_data';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'console', 'header', 'home', 'security']);
  const elasticChart = getService('elasticChart');
  const aiops = getService('aiops');

  // AIOps / Log Rate Analysis lives in the ML UI so we need some related services.
  const ml = getService('ml');

  function runTests(testData: TestData) {
    it(`${testData.suiteTitle} loads the source data in log rate analysis`, async () => {
      await elasticChart.setNewChartUiDebugFlag(true);

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the saved search selection page`
      );
      await aiops.logRateAnalysisPage.navigateToIndexPatternSelection();

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

      await ml.testExecution.logTestStep('displays empty prompt');
      await aiops.logRateAnalysisPage.assertNoWindowParametersEmptyPromptExists();

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

      await aiops.logRateAnalysisPage.assertAnalysisComplete(testData.analysisType);

      // The group switch should be disabled by default
      await aiops.logRateAnalysisPage.assertLogRateAnalysisResultsGroupSwitchExists(false);

      if (!isTestDataExpectedWithSampleProbability(testData.expected)) {
        // Enabled grouping
        await aiops.logRateAnalysisPage.clickLogRateAnalysisResultsGroupSwitchOn();

        await aiops.logRateAnalysisResultsGroupsTable.assertLogRateAnalysisResultsTableExists();

        const analysisGroupsTable =
          await aiops.logRateAnalysisResultsGroupsTable.parseAnalysisTable();
        expect(orderBy(analysisGroupsTable, 'group')).to.be.eql(
          orderBy(testData.expected.analysisGroupsTable, 'group')
        );

        await ml.testExecution.logTestStep('expand table row');
        await aiops.logRateAnalysisResultsGroupsTable.assertExpandRowButtonExists();
        await aiops.logRateAnalysisResultsGroupsTable.expandRow();

        if (!isTestDataExpectedWithSampleProbability(testData.expected)) {
          const analysisTable = await aiops.logRateAnalysisResultsTable.parseAnalysisTable();
          expect(orderBy(analysisTable, ['fieldName', 'fieldValue'])).to.be.eql(
            orderBy(testData.expected.analysisTable, ['fieldName', 'fieldValue'])
          );
        }

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

          if (!isTestDataExpectedWithSampleProbability(testData.expected)) {
            const filteredAnalysisGroupsTable =
              await aiops.logRateAnalysisResultsGroupsTable.parseAnalysisTable();
            expect(orderBy(filteredAnalysisGroupsTable, 'group')).to.be.eql(
              orderBy(testData.expected.filteredAnalysisGroupsTable, 'group')
            );
          }
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
