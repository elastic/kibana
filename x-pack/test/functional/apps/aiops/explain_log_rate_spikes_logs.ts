/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';
import type { TestData } from './types';
import { artificialLogDataViewTestData } from './test_data';

const REFERENCE_TS = 1669018354793;
const DAY_MS = 86400000;
const ES_INDEX = 'aiops_frequent_items_test';

const DEVIATION_TS = REFERENCE_TS - DAY_MS * 2;
const BASELINE_TS = DEVIATION_TS - DAY_MS * 1;

interface SampleDoc {
  user: string;
  response_code: string;
  url: string;
  version: string;
  '@timestamp': number;
}

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const es = getService('es');
  const headerPage = getPageObject('header');
  const elasticChart = getService('elasticChart');
  const aiops = getService('aiops');
  const log = getService('log');

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
        DEVIATION_TS + DAY_MS / 2
      );

      // Adjust the right brush handle
      await aiops.explainLogRateSpikesPage.adjustBrushHandler(
        'aiopsBrushDeviation',
        'handle--e',
        targetPx + intervalPx * 10
      );

      // Adjust the left brush handle
      await aiops.explainLogRateSpikesPage.adjustBrushHandler(
        'aiopsBrushDeviation',
        'handle--w',
        targetPx - intervalPx * 10
      );

      // Get the px values for the timestamp we want to move the brush to.
      const { targetPx: targetBaselinePx } = await aiops.explainLogRateSpikesPage.getPxForTimestamp(
        BASELINE_TS + DAY_MS / 2
      );

      // Adjust the right brush handle
      await aiops.explainLogRateSpikesPage.adjustBrushHandler(
        'aiopsBrushBaseline',
        'handle--e',
        targetBaselinePx + intervalPx * 10
      );

      // Adjust the left brush handle
      await aiops.explainLogRateSpikesPage.adjustBrushHandler(
        'aiopsBrushBaseline',
        'handle--w',
        targetBaselinePx - intervalPx * 10
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
      expect(brushSelectionWidthAfter).not.to.be.greaterThan(intervalPx * 21);

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

  describe('explain log rate spikes - artificial log data', function () {
    this.tags(['aiops']);

    before(async () => {
      try {
        await es.indices.delete({ index: ES_INDEX });
      } catch (e) {
        log.error(`Error deleting index '${ES_INDEX}' in before() callback`);
      }
      // Create index with mapping
      await es.indices.create({
        index: ES_INDEX,
        mappings: {
          properties: {
            user: { type: 'keyword' },
            response_code: { type: 'keyword' },
            url: { type: 'keyword' },
            version: { type: 'keyword' },
            '@timestamp': { type: 'date' },
          },
        },
      });

      const bulkBody: estypes.BulkRequest<SampleDoc, SampleDoc>['body'] = [];
      const action = { index: { _index: ES_INDEX } };
      let tsOffset = 0;

      // Creates docs evenly spread across baseline and deviation time frame
      [BASELINE_TS, DEVIATION_TS].forEach((ts) => {
        ['Peter', 'Paul', 'Mary'].forEach((user) => {
          ['200', '404', '500'].forEach((responseCode) => {
            ['login.php', 'user.php', 'home.php'].forEach((url) => {
              // Don't add docs that match the exact pattern of the filter we want to base the test queries on
              if (
                !(
                  user === 'Peter' &&
                  responseCode === '500' &&
                  (url === 'home.php' || url === 'login.php')
                )
              ) {
                tsOffset = 0;
                [...Array(100)].forEach(() => {
                  tsOffset += DAY_MS / 100;
                  const doc: SampleDoc = {
                    user,
                    response_code: responseCode,
                    url,
                    version: 'v1.0.0',
                    '@timestamp': ts + tsOffset,
                  };

                  bulkBody.push(action);
                  bulkBody.push(doc);
                });
              }
            });
          });
        });
      });

      // Now let's add items to the dataset to make some specific significant terms being returned as results
      ['200', '404'].forEach((responseCode) => {
        ['login.php', 'user.php', 'home.php'].forEach((url) => {
          tsOffset = 0;
          [...Array(300)].forEach(() => {
            tsOffset += DAY_MS / 300;
            bulkBody.push(action);
            bulkBody.push({
              user: 'Peter',
              response_code: responseCode,
              url,
              version: 'v1.0.0',
              '@timestamp': DEVIATION_TS + tsOffset,
            });
          });
        });
      });

      ['Paul', 'Mary'].forEach((user) => {
        ['login.php', 'home.php'].forEach((url) => {
          tsOffset = 0;
          [...Array(400)].forEach(() => {
            tsOffset += DAY_MS / 400;
            bulkBody.push(action);
            bulkBody.push({
              user,
              response_code: '500',
              url,
              version: 'v1.0.0',
              '@timestamp': DEVIATION_TS + tsOffset,
            });
          });
        });
      });

      await es.bulk({
        refresh: 'wait_for',
        body: bulkBody,
      });

      await ml.testResources.createIndexPatternIfNeeded(ES_INDEX, '@timestamp');

      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await elasticChart.setNewChartUiDebugFlag(false);
      await ml.testResources.deleteIndexPatternByTitle(ES_INDEX);
      try {
        await es.indices.delete({ index: ES_INDEX });
      } catch (e) {
        log.error(`Error deleting index '${ES_INDEX}' in after() callback`);
      }
    });

    describe('with artificial logs', function () {
      // Run tests on full farequote index.
      it(`${artificialLogDataViewTestData.suiteTitle} loads the explain log rate spikes page`, async () => {
        // Start navigation from the base of the ML app.
        await ml.navigation.navigateToMl();
        await elasticChart.setNewChartUiDebugFlag(true);
      });

      runTests(artificialLogDataViewTestData);
    });
  });
}
