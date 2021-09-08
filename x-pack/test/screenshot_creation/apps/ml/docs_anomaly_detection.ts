/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const screenshot = getService('screenshots');

  describe('docs anomaly detection', function () {
    this.tags(['mlqa']);

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await browser.setWindowSize(1920, 1080);

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('ecommerce-advanced-wizard-geopoint screenshot', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.testExecution.logTestStep('loads the advanced wizard');
      await ml.jobManagement.navigateToNewJobSourceSelection();
      await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob('ft_ecommerce');
      await ml.jobTypeSelection.selectAdvancedJob();

      await ml.testExecution.logTestStep('continues to the pick fields step');
      await ml.jobWizardCommon.assertConfigureDatafeedSectionExists();
      await ml.jobWizardCommon.advanceToPickFieldsSection();

      await ml.testExecution.logTestStep('adds detector');
      await ml.jobWizardAdvanced.openCreateDetectorModal();
      await ml.jobWizardAdvanced.selectDetectorFunction('lat_long');
      await ml.jobWizardAdvanced.selectDetectorField('geoip.location');
      await ml.jobWizardAdvanced.selectDetectorByField('user');
      await ml.jobWizardAdvanced.confirmAddDetectorModal();

      await ml.testExecution.logTestStep('sets the bucket span');
      await ml.jobWizardCommon.assertBucketSpanInputExists();
      await ml.jobWizardCommon.setBucketSpan('15m');

      await ml.testExecution.logTestStep('sets influencers');
      await ml.jobWizardCommon.assertInfluencerInputExists();
      await ml.jobWizardCommon.assertInfluencerSelection([]);
      for (const influencer of ['geoip.country_iso_code', 'day_of_week', 'category.keyword']) {
        await ml.jobWizardCommon.addInfluencer(influencer);
      }

      await ml.testExecution.logTestStep('sets the model memory limit');
      await ml.jobWizardCommon.assertModelMemoryLimitInputExists({
        withAdvancedSection: false,
      });
      await ml.jobWizardCommon.setModelMemoryLimit('12MB', {
        withAdvancedSection: false,
      });

      await ml.testExecution.logTestStep('takes the screenshot');
      await screenshot.take('ecommerce-advanced-wizard-geopoint_new');
    });
  });
}
