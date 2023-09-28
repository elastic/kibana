/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ml = getService('ml');
  const svlMml = getService('svlMl');
  const PageObjects = getPageObjects([
    'discover',
    'observabilityLogExplorer',
    'svlCommonPage',
    'svlCommonNavigation',
  ]);
  const adJobId = 'fq_single_permission';

  describe('Anomaly detection jobs list', () => {
    before(async () => {
      await PageObjects.svlCommonPage.login();

      await ml.api.createAnomalyDetectionJob(ml.commonConfig.getADFqMultiMetricJobConfig(adJobId));
    });

    after(async () => {
      await PageObjects.svlCommonPage.forceLogout();
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    describe('page navigation', () => {
      it('renders job list and finds created job', async () => {
        await ml.navigation.navigateToMl();

        await ml.testExecution.logTestStep('loads the anomaly detection area');
        await svlMml.navigation.security.navigateToAnomalyDetection();

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
    });
  });
}
// await svlCommonNavigation.search.searchFor('discover');
// await svlCommonNavigation.search.clickOnOption(0);
// await svlCommonNavigation.search.hideSearch();
