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
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('Notifications list', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      // Prepare jobs to generate notifications
      await Promise.all(
        [
          { jobId: 'fq_001', spaceId: undefined },
          { jobId: 'fq_002', spaceId: 'space1' },
        ].map(async (v) => {
          const datafeedConfig = ml.commonConfig.getADFqDatafeedConfig(v.jobId);

          // Set small frequency to fail faster
          datafeedConfig.frequency = '5s';

          await ml.api.createAnomalyDetectionJob(
            ml.commonConfig.getADFqSingleMetricJobConfig(v.jobId),
            v.spaceId
          );
          await ml.api.openAnomalyDetectionJob(v.jobId);
          await ml.api.createDatafeed(datafeedConfig, v.spaceId);
          await ml.api.startDatafeed(datafeedConfig.datafeed_id);
        })
      );

      await ml.securityUI.loginAsMlPowerUser();
      await PageObjects.common.navigateToApp('ml', {
        basePath: '',
      });
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
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

    it.skip('display a number of errors in the notification indicator', async () => {
      await ml.navigation.navigateToOverview();
      // triggers an error
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
      await esDeleteAllIndices('ft_farequote');
      await PageObjects.common.sleep(10000);
      await browser.refresh();
      // refresh the page to avoid 1m wait
      await ml.notifications.assertNotificationErrorsCount(1);
    });
  });
}
