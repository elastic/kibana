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

  describe('Notifications list', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      const datafeedConfig = ml.commonConfig.getADFqDatafeedConfig('fg_001');

      // Set small frequency to fail faster
      datafeedConfig.frequency = '5s';

      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig('fg_001')
      );
      await ml.api.openAnomalyDetectionJob('fg_001');
      await ml.api.createDatafeed(datafeedConfig);
      await ml.api.startDatafeed(datafeedConfig.datafeed_id);

      await ml.securityUI.loginAsMlPowerUser();
      await ml.navigation.navigateToMl();
    });

    after(async () => {
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

    it('does not show notifications from another space', async () => {});

    it('display a number of errors in the notification indicator', async () => {
      await ml.navigation.navigateToOverview();
      // triggers an error
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
      await PageObjects.common.sleep(6000);
      await browser.refresh();
      // refresh the page to avoid 1m wait
      await ml.notifications.assertNotificationErrorsCount(1);
    });
  });
}
