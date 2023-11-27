/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { FtrProviderContext } from '../../../../ftr_provider_context';

const timepickerFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker']);
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const browser = getService('browser');
  const spacesService = getService('spaces');

  const idSpace1 = 'space1';

  const configs = [
    { jobId: 'fq_001', spaceId: undefined },
    { jobId: 'fq_002', spaceId: idSpace1 },
  ];

  const failConfig = { jobId: 'fq_fail', spaceId: undefined };

  describe('Notifications list', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();

      // Prepare jobs to generate notifications
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      for (const config of configs) {
        await ml.api.createAnomalyDetectionJob(
          ml.commonConfig.getADFqSingleMetricJobConfig(config.jobId),
          config.spaceId
        );
      }

      await PageObjects.common.navigateToApp('ml', {
        basePath: '',
      });
    });

    after(async () => {
      for (const { jobId } of [...configs, failConfig]) {
        await ml.api.deleteAnomalyDetectionJobES(jobId);
      }
      await spacesService.delete(idSpace1);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
      await ml.testResources.deleteDataViewByTitle('ft_farequote');
    });

    it('displays a generic notification indicator', async () => {
      await ml.notifications.assertNotificationIndicatorExist();
    });

    it('opens the Notifications page', async () => {
      await ml.navigation.navigateToNotifications();

      await ml.notifications.table.waitForTableToLoad();
      await ml.notifications.table.assertRowsNumberPerPage(25);
      await ml.notifications.table.assertTableSorting('timestamp', 0, 'desc');
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

    it('supports custom sorting for notifications level', async () => {
      await ml.navigation.navigateToNotifications();
      await ml.notifications.table.waitForTableToLoad();

      await PageObjects.timePicker.pauseAutoRefresh();
      const fromTime = moment().subtract(1, 'week').format(timepickerFormat);
      const toTime = moment().format(timepickerFormat);
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

      await ml.notifications.table.waitForTableToLoad();

      await ml.notifications.table.sortByField('level', 1, 'desc');
      const rowsDesc = await ml.notifications.table.parseTable();
      expect(rowsDesc[0].level).to.eql('error');

      await ml.notifications.table.sortByField('level', 1, 'asc');
      const rowsAsc = await ml.notifications.table.parseTable();
      expect(rowsAsc[0].level).to.eql('info');
    });
  });
}
