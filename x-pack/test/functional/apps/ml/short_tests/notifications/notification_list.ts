/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const browser = getService('browser');

  const configs = [
    { jobId: 'fq_001', spaceId: undefined },
    { jobId: 'fq_002', spaceId: 'space1' },
  ];

  const failConfig = { jobId: 'fq_fail', spaceId: undefined };

  describe('Notifications list', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      // Prepare jobs to generate notifications
      for (const config of configs) {
        await ml.api.createAnomalyDetectionJob(
          ml.commonConfig.getADFqSingleMetricJobConfig(config.jobId),
          config.spaceId
        );
      }

      await ml.securityUI.loginAsMlPowerUser();
      await PageObjects.common.navigateToApp('ml', {
        basePath: '',
      });
    });

    after(async () => {
      for (const { jobId } of [...configs, failConfig]) {
        await ml.api.deleteAnomalyDetectionJobES(jobId);
      }
      await ml.testResources.cleanMLSavedObjects();
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
    });

    it('displays a generic notification indicator', async () => {
      await ml.notifications.assertNotificationIndicatorExist();
    });

    it('opens the Notifications page', async () => {
      await ml.navigation.navigateToNotifications();

      await ml.notifications.table.waitForTableToLoad();
      await ml.notifications.table.assertRowsNumberPerPage(25);
    });

    it('does not show notifications from another space', async () => {
      await ml.notifications.table.filterWithSearchString('Job created', 1);
    });

    it('display a number of errors in the notification indicator', async () => {
      await ml.navigation.navigateToOverview();

      const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(failConfig.jobId);
      jobConfig.analysis_config = {
        bucket_span: '15m',
        influencers: ['airline'],
        detectors: [
          { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
          { function: 'min', field_name: 'responsetime', partition_field_name: 'airline' },
          { function: 'max', field_name: 'responsetime', partition_field_name: 'airline' },
        ],
      };
      // Set extremely low memory limit to trigger an error
      jobConfig.analysis_limits!.model_memory_limit = '1024kb';

      const datafeedConfig = ml.commonConfig.getADFqDatafeedConfig(jobConfig.job_id);

      await ml.api.createAnomalyDetectionJob(jobConfig);
      await ml.api.openAnomalyDetectionJob(jobConfig.job_id);
      await ml.api.createDatafeed(datafeedConfig);
      await ml.api.startDatafeed(datafeedConfig.datafeed_id);
      await ml.api.waitForJobMemoryStatus(jobConfig.job_id, 'hard_limit');

      // refresh the page to avoid 1m wait
      await browser.refresh();
      await ml.notifications.assertNotificationErrorsCount(0);
    });
  });
}
