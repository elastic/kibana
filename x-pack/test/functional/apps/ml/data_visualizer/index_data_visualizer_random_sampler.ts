/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { farequoteDataViewTestData, farequoteLuceneSearchTestData } from './index_test_data';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const browser = getService('browser');
  async function goToSourceForIndexBasedDataVisualizer(sourceIndexOrSavedSearch: string) {
    await ml.testExecution.logTestStep(`navigates to Data Visualizer page`);
    await ml.navigation.navigateToDataVisualizer();

    await ml.testExecution.logTestStep(`loads the saved search selection page`);
    await ml.dataVisualizer.navigateToIndexPatternSelection();

    await ml.testExecution.logTestStep(`loads the index data visualizer page`);
    await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(sourceIndexOrSavedSearch);
  }
  describe('index based random sampler controls', function () {
    this.tags(['ml']);
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/module_sample_logs');

      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createIndexPatternIfNeeded('ft_module_sample_logs', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteLuceneIfNeeded();
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
      // Start navigation from the base of the ML app.
      await ml.navigation.navigateToMl();
    });

    after(async () => {
      await ml.testResources.deleteSavedSearches();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
      await ml.testResources.deleteIndexPatternByTitle('ft_module_sample_logs');
      await browser.removeLocalStorageItem('dataVisualizer.randomSamplerPreference');
    });

    describe('with small data sets', function () {
      it(`has random sampler 'on - automatic' by default`, async () => {
        await goToSourceForIndexBasedDataVisualizer(
          farequoteDataViewTestData.sourceIndexOrSavedSearch
        );

        await ml.dataVisualizerIndexBased.assertRandomSamplingOption(
          'dvRandomSamplerOptionOnAutomatic',
          100
        );
      });

      it(`retains random sampler 'off' setting`, async () => {
        await ml.dataVisualizerIndexBased.setRandomSamplingOption('dvRandomSamplerOptionOff');

        await goToSourceForIndexBasedDataVisualizer(
          farequoteLuceneSearchTestData.sourceIndexOrSavedSearch
        );
        await ml.dataVisualizerIndexBased.assertRandomSamplingOption('dvRandomSamplerOptionOff');
      });

      it(`retains random sampler 'on - manual' setting`, async () => {
        await ml.dataVisualizerIndexBased.setRandomSamplingOption('dvRandomSamplerOptionOnManual');

        await goToSourceForIndexBasedDataVisualizer('ft_module_sample_logs');
        await ml.dataVisualizerIndexBased.assertRandomSamplingOption(
          'dvRandomSamplerOptionOnManual',
          50
        );
      });
    });
  });
}
