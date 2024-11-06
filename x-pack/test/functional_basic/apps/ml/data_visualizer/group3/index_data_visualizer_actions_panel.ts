/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('index based actions panel on basic license', function () {
    this.tags(['ml', 'skipFIPS']);

    const indexPatternName = 'ft_farequote';
    const savedSearch = 'ft_farequote_kuery';
    const expectedQuery = 'airline: A* and responsetime > 5';

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded(indexPatternName, '@timestamp');
      await ml.testResources.createSavedSearchFarequoteKueryIfNeeded();
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    describe('view in discover page action', function () {
      it('loads the source data in the data visualizer', async () => {
        await ml.testExecution.logTestStep('loads the data visualizer selector page');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataVisualizer();

        await ml.testExecution.logTestStep('loads the saved search selection page');
        await ml.dataVisualizer.navigateToDataViewSelection();

        await ml.testExecution.logTestStep('loads the index data visualizer page');
        await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(savedSearch);
      });

      it('navigates to Discover page', async () => {
        await ml.testExecution.logTestStep('should not display create job cards');
        await ml.dataVisualizerIndexBased.assertCreateAdvancedJobCardNotExists();
        await ml.dataVisualizerIndexBased.assertCreateDataFrameAnalyticsCardNotExists();

        await ml.testExecution.logTestStep('displays the actions panel with view in Discover card');
        await ml.dataVisualizerIndexBased.assertActionsPanelExists();
        await ml.dataVisualizerIndexBased.assertViewInDiscoverCardExists();

        await ml.testExecution.logTestStep('retains the query in Discover page');
        await ml.dataVisualizerIndexBased.clickViewInDiscoverButton();
        await ml.dataVisualizerIndexBased.assertDiscoverPageQuery(expectedQuery);
      });
    });
  });
}
