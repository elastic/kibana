/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('index based actions panel on trial license', function () {
    this.tags(['mlqa']);

    const indexPatternName = 'ft_farequote';

    const advancedJobWizardDatafeedQuery = JSON.stringify(
      {
        bool: {
          must: [
            {
              match_all: {},
            },
          ],
        },
      },
      null,
      2
    );
    // Note query is not currently passed to the wizard

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded(indexPatternName, '@timestamp');
      await ml.testResources.createSavedSearchFarequoteKueryIfNeeded();
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteSavedSearches();
      await ml.testResources.deleteIndexPatternByTitle(indexPatternName);
    });

    describe('create advanced job action', function () {
      it('loads the source data in the data visualizer', async () => {
        await ml.testExecution.logTestStep('loads the data visualizer selector page');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataVisualizer();

        await ml.testExecution.logTestStep('loads the saved search selection page');
        await ml.dataVisualizer.navigateToIndexPatternSelection();

        await ml.testExecution.logTestStep('loads the index data visualizer page');
        await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(indexPatternName);
      });

      it('opens the advanced job wizard', async () => {
        await ml.testExecution.logTestStep('displays the actions panel with advanced job card');
        await ml.dataVisualizerIndexBased.assertActionsPanelExists();
        await ml.dataVisualizerIndexBased.assertCreateAdvancedJobCardExists();
        await ml.dataVisualizerIndexBased.assertCreateDataFrameAnalyticsCardExists();

        // Note the search is not currently passed to the wizard, just the index.
        await ml.testExecution.logTestStep('displays the actions panel with advanced job card');
        await ml.dataVisualizerIndexBased.clickCreateAdvancedJobButton();
        await ml.jobTypeSelection.assertAdvancedJobWizardOpen();
        await ml.jobWizardAdvanced.assertDatafeedQueryEditorExists();
        await ml.jobWizardAdvanced.assertDatafeedQueryEditorValue(advancedJobWizardDatafeedQuery);
      });
    });

    describe('view in discover page action', function () {
      const savedSearch = 'ft_farequote_kuery';
      const expectedQuery = 'airline: A* and responsetime > 5';
      const docCountFormatted = '34,415';

      it('loads the source data in the data visualizer', async () => {
        await ml.testExecution.logTestStep('loads the data visualizer selector page');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataVisualizer();

        await ml.testExecution.logTestStep('loads the saved search selection page');
        await ml.dataVisualizer.navigateToIndexPatternSelection();

        await ml.testExecution.logTestStep('loads the index data visualizer page');
        await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(savedSearch);

        await ml.testExecution.logTestStep(`loads data for full time range`);
        await ml.dataVisualizerIndexBased.assertTimeRangeSelectorSectionExists();
        await ml.dataVisualizerIndexBased.clickUseFullDataButton(docCountFormatted);
      });

      it('navigates to Discover page', async () => {
        await ml.testExecution.logTestStep('displays the actions panel with view in Discover card');
        await ml.dataVisualizerIndexBased.assertActionsPanelExists();
        await ml.dataVisualizerIndexBased.assertViewInDiscoverCardExists();

        await ml.testExecution.logTestStep('retains the query in Discover page');
        await ml.dataVisualizerIndexBased.clickViewInDiscoverButton();
        await ml.dataVisualizerIndexBased.assertDiscoverPageQuery(expectedQuery);
        await ml.dataVisualizerIndexBased.assertDiscoverHitCount(docCountFormatted);
      });
    });
  });
}
