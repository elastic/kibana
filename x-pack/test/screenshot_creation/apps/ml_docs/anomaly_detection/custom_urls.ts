/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Job, Datafeed } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { TIME_RANGE_TYPE } from '@kbn/ml-plugin/public/application/jobs/components/custom_url_editor/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';

import { ECOMMERCE_INDEX_PATTERN } from '..';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const mlScreenshots = getService('mlScreenshots');

  const screenshotDirectories = ['ml_docs', 'anomaly_detection'];

  const ecommerceJobConfig = {
    job_id: `ecommerce-custom-url`,
    analysis_config: {
      bucket_span: '2h',
      influencers: ['geoip.country_iso_code', 'day_of_week', 'category.keyword', 'user'],
      detectors: [
        {
          detector_description: 'mean("products.base_price") over "customer_full_name.keyword"',
          function: 'mean',
          field_name: 'products.base_price',
          over_field_name: 'customer_full_name.keyword',
        },
      ],
    },
    data_description: { time_field: 'order_date' },
  };

  const ecommerceDatafeedConfig = {
    datafeed_id: 'datafeed-ecommerce-custom-url',
    indices: [ECOMMERCE_INDEX_PATTERN],
    job_id: 'ecommerce-custom-url',
    query: { bool: { must: [{ match_all: {} }] } },
  };

  const testDashboardCustomUrl = {
    label: 'Data dashboard',
    dashboardName: '[eCommerce] Revenue Dashboard',
    queryEntityFieldNames: ['customer_full_name.keyword'],
    timeRange: TIME_RANGE_TYPE.AUTO,
  };

  describe('custom urls', function () {
    before(async () => {
      await ml.api.createAndRunAnomalyDetectionLookbackJob(
        ecommerceJobConfig as Job,
        ecommerceDatafeedConfig as Datafeed
      );
    });

    after(async () => {
      await ml.api.deleteAnomalyDetectionJobES(ecommerceJobConfig.job_id);
      await ml.api.cleanMlIndices();
    });

    it('custom url config screenshot', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.testExecution.logTestStep(
        'fill in the dashboard custom url form and take screenshot'
      );
      await ml.jobTable.closeEditJobFlyout();
      await ml.jobTable.openEditCustomUrlsForJobTab(ecommerceJobConfig.job_id);
      const existingCustomUrlCount = await ml.jobTable.getExistingCustomUrlCount();
      await ml.jobTable.fillInDashboardUrlForm(testDashboardCustomUrl);
      await mlScreenshots.takeScreenshot('ml-customurl-edit', screenshotDirectories);

      await ml.testExecution.logTestStep('add the custom url and save the job');
      await ml.jobTable.saveCustomUrl(testDashboardCustomUrl.label, existingCustomUrlCount);
      await ml.jobTable.saveEditJobFlyoutChanges();
    });

    it('anomaly list screenshot', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.testExecution.logTestStep('open job in anomaly explorer');
      await ml.jobTable.filterWithSearchString(ecommerceJobConfig.job_id, 1);
      await ml.jobTable.clickOpenJobInAnomalyExplorerButton(ecommerceJobConfig.job_id);
      await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

      await ml.testExecution.logTestStep('open anomaly list actions and take screenshot');
      await ml.anomaliesTable.scrollTableIntoView();
      await ml.anomaliesTable.ensureAnomalyActionsMenuOpen(0);

      await mlScreenshots.takeScreenshot('ml-population-results', screenshotDirectories);
    });
  });
}
