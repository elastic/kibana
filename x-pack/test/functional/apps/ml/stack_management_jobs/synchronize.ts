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

  const adJobId1 = 'fq_single_1';
  const adJobId2 = 'fq_single_2';
  const adJobId3 = 'fq_single_3';
  const adJobIdES = 'fq_single_es';

  describe('synchronize', function () {
    this.tags(['mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
      await ml.testResources.cleanMLSavedObjects();
    });

    after(async () => {
      for (const jobId of [adJobId1, adJobId2, adJobId3, adJobIdES]) {
        await ml.api.deleteAnomalyDetectionJobES(jobId);
      }
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should have nothing to sync initially', async () => {
      // no sync required warning displayed
      await ml.navigation.navigateToMl();
      await ml.overviewPage.assertJobSyncRequiredWarningNotExists();

      // object counts in sync flyout are all 0, sync button is disabled
      await ml.navigation.navigateToStackManagement();
      await ml.navigation.navigateToStackManagementJobsListPage();
      await ml.stackManagementJobs.openSyncFlyout();
      await ml.stackManagementJobs.assertAllSyncFlyoutObjectCounts(0);
      await ml.stackManagementJobs.assertSyncFlyoutSyncButtonEnabled(false);
    });

    it('should prepare test data', async () => {
      // create jobs

      // create via Kibana API so saved objects are auto-generated
      for (const jobId of [adJobId1, adJobId2, adJobId3]) {
        await ml.api.createAnomalyDetectionJob(ml.commonConfig.getADFqSingleMetricJobConfig(jobId));
      }

      // create via ES API so saved objects are missing
      await ml.api.createAnomalyDetectionJobES(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobIdES)
      );

      // modify jobs

      // datafeed SO should be added with the sync later
      const datafeedConfig2 = ml.commonConfig.getADFqDatafeedConfig(adJobId2);
      await ml.api.createDatafeedES(datafeedConfig2);

      // left-over datafeed SO should be removed with the sync later
      const datafeedConfig3 = ml.commonConfig.getADFqDatafeedConfig(adJobId3);
      await ml.api.createDatafeed(datafeedConfig3);
      await ml.api.deleteDatafeedES(datafeedConfig3.datafeed_id);

      // corresponding SO should be created with the sync later
      await ml.api.assertJobSpaces(adJobIdES, 'anomaly-detector', []);

      // left-over SO should be removed with the sync later
      await ml.api.deleteAnomalyDetectionJobES(adJobId1);
    });

    it('should have objects to sync', async () => {
      // sync required warning is displayed
      await ml.navigation.navigateToMl();
      await ml.overviewPage.assertJobSyncRequiredWarningExists();

      // object counts in sync flyout are all 1, sync button is enabled
      await ml.navigation.navigateToStackManagement();
      await ml.navigation.navigateToStackManagementJobsListPage();
      await ml.stackManagementJobs.openSyncFlyout();
      await ml.stackManagementJobs.assertAllSyncFlyoutObjectCounts(1);
      await ml.stackManagementJobs.assertSyncFlyoutSyncButtonEnabled(true);
    });

    it('should synchronize datafeeds and saved objects', async () => {
      await ml.stackManagementJobs.executeSync();
      await ml.stackManagementJobs.closeSyncFlyout();
    });

    it('should have nothing to sync anymore', async () => {
      // object counts in sync flyout are all 0, sync button is disabled
      await ml.stackManagementJobs.openSyncFlyout();
      await ml.stackManagementJobs.assertAllSyncFlyoutObjectCounts(0);
      await ml.stackManagementJobs.assertSyncFlyoutSyncButtonEnabled(false);
      await ml.stackManagementJobs.closeSyncFlyout();

      // no sync required warning displayed
      await ml.navigation.navigateToMl();
      await ml.overviewPage.assertJobSyncRequiredWarningNotExists();
    });
  });
}
