/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('index based actions panel', function () {
    this.tags(['mlqa']);

    const indexPatternName = 'ft_farequote';
    const advancedJobWizardDatafeedQuery = `{
  "bool": {
    "must": [
      {
        "match_all": {}
      }
    ]
  }
}`; // Note query is not currently passed to the wizard

    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded(indexPatternName, '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
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

        // Note the search is not currently passed to the wizard, just the index.
        await ml.testExecution.logTestStep('displays the actions panel with advanced job card');
        await ml.dataVisualizerIndexBased.clickCreateAdvancedJobButton();
        await ml.jobTypeSelection.assertAdvancedJobWizardOpen();
        await ml.jobWizardAdvanced.assertDatafeedQueryEditorExists();
        await ml.jobWizardAdvanced.assertDatafeedQueryEditorValue(advancedJobWizardDatafeedQuery);
      });
    });
  });
}
