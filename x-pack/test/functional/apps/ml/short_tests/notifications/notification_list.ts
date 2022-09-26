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
  const spacesService = getService('spaces');
  const browser = getService('browser');

  describe('Notifications list', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      for (const { jobId, spaceId } of [
        { spaceId: undefined, jobId: 'fq_01' },
        // { spaceId: 'ml_02', jobId: 'fq_02' },
      ]) {
        if (spaceId) {
          await spacesService.create({
            id: spaceId,
            name: spaceId,
            disabledFeatures: [],
          });
        }

        const datafeedConfig = ml.commonConfig.getADFqDatafeedConfig(jobId);

        // Set small frequency to fail faster
        datafeedConfig.frequency = '5s';

        await ml.api.createAnomalyDetectionJob(ml.commonConfig.getADFqSingleMetricJobConfig(jobId));
        await ml.api.openAnomalyDetectionJob(jobId);
        await ml.api.createDatafeed(datafeedConfig);
        await ml.api.startDatafeed(datafeedConfig.datafeed_id);
      }

      await ml.securityUI.loginAsMlPowerUser();
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToNotifications();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('opens the Notifications page', async () => {
      await ml.notifications.table.waitForTableToLoad();
      await ml.notifications.table.assertRowsNumberPerPage(25);
    });

    it('does not show notifications from another space', async () => {});

    it('displays a generic notification indicator', async () => {
      await ml.notifications.assertNotificationIndicatorExist();
    });

    it('display a number of errors in the notification indicator', async () => {
      // triggers an error
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
      // refresh the page to avoid 1m wait
      await browser.refresh();
      await ml.notifications.assertNotificationErrorsCount(1);
    });
  });
}
