/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ml = getService('ml');
  const svlMl = getService('svlMl');
  const PageObjects = getPageObjects(['svlCommonPage']);
  const adJobId = 'fq_single_permission';
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('Anomaly detection jobs list', function () {
    // Error: Failed to delete all indices with pattern [.ml-*]
    this.tags(['failsOnMKI']);
    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole('admin');

      // Load logstash* data and create dataview for logstash*, logstash-2015.09.22
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/visualize/default'
      );

      await ml.api.createAnomalyDetectionJob(ml.commonConfig.getADFqMultiMetricJobConfig(adJobId));
    });

    after(async () => {
      await PageObjects.svlCommonPage.forceLogout();
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('page navigation', () => {
      it('renders job list and finds created job', async () => {
        await ml.navigation.navigateToMl();
        await ml.testExecution.logTestStep('loads the anomaly detection area');
        await svlMl.navigation.observability.navigateToAnomalyDetection();

        await ml.testExecution.logTestStep('should display the stats bar and the AD job table');
        await ml.jobManagement.assertJobStatsBarExists();
        await ml.jobManagement.assertJobTableExists();

        await ml.testExecution.logTestStep('should display an enabled "Create job" button');
        await ml.jobManagement.assertCreateNewJobButtonExists();
        await ml.jobManagement.assertCreateNewJobButtonEnabled(true);

        await ml.testExecution.logTestStep('should display the AD job in the list');
        await ml.jobTable.filterWithSearchString(adJobId, 1);

        await ml.testExecution.logTestStep('should display enabled AD job result links');
        await ml.jobTable.assertJobActionSingleMetricViewerButtonEnabled(adJobId, true);
        await ml.jobTable.assertJobActionAnomalyExplorerButtonEnabled(adJobId, true);
      });
      describe('job creation', () => {
        it('does not show exclude frozen data tier control in wizard', async () => {
          await ml.testExecution.logTestStep('loads the anomaly detection creation wizard');
          await ml.navigation.navigateToMl();
          await svlMl.navigation.observability.navigateToAnomalyDetection();
          await ml.jobManagement.navigateToNewJobSourceSelection();
          await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob('logstash-2015.09.22');
          await ml.jobTypeSelection.selectCategorizationJob();

          await ml.testExecution.logTestStep('shows full data button, but not data tier control');
          await ml.jobWizardCommon.assertUseFullDataButtonVisible(true);
          await ml.commonUI.assertDatePickerDataTierOptionsVisible(false);
        });
      });
    });
  });
}
