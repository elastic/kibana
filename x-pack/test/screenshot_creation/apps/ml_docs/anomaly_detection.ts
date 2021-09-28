/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

import { ECOMMERCE_INDEX_PATTERN } from './index';

export default function ({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const ml = getService('ml');
  const screenshot = getService('screenshots');

  async function takeScreenshot(name: string) {
    await screenshot.take(`${name}_new`, undefined, ['ml_docs', 'anomaly_detection']);
  }

  async function removeFocusFromElement() {
    // open and close the Kibana nav to un-focus the last used element
    await ml.navigation.openKibanaNav();
    await ml.navigation.closeKibanaNav();
  }

  describe('anomaly detection', function () {
    this.tags(['mlqa']);

    before(async () => {
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

      await ml.testExecution.logTestStep('load the advanced wizard');
      await ml.jobManagement.navigateToNewJobSourceSelection();
      await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(ECOMMERCE_INDEX_PATTERN);
      await ml.jobTypeSelection.selectAdvancedJob();

      await ml.testExecution.logTestStep('continue to the pick fields step');
      await ml.jobWizardCommon.assertConfigureDatafeedSectionExists();
      await ml.jobWizardCommon.advanceToPickFieldsSection();

      await ml.testExecution.logTestStep('add detector');
      await ml.jobWizardAdvanced.openCreateDetectorModal();
      await ml.jobWizardAdvanced.selectDetectorFunction('lat_long');
      await ml.jobWizardAdvanced.selectDetectorField('geoip.location');
      await ml.jobWizardAdvanced.selectDetectorByField('user');
      await ml.jobWizardAdvanced.confirmAddDetectorModal();

      await ml.testExecution.logTestStep('set the bucket span');
      await ml.jobWizardCommon.assertBucketSpanInputExists();
      await ml.jobWizardCommon.setBucketSpan('15m');

      await ml.testExecution.logTestStep('set influencers');
      await ml.jobWizardCommon.assertInfluencerInputExists();
      await ml.jobWizardCommon.assertInfluencerSelection([]);
      for (const influencer of ['geoip.country_iso_code', 'day_of_week', 'category.keyword']) {
        await ml.jobWizardCommon.addInfluencer(influencer);
      }

      await ml.testExecution.logTestStep('set the model memory limit');
      await ml.jobWizardCommon.assertModelMemoryLimitInputExists({
        withAdvancedSection: false,
      });
      await ml.jobWizardCommon.setModelMemoryLimit('12MB', {
        withAdvancedSection: false,
      });

      await ml.testExecution.logTestStep('take screenshot');
      await removeFocusFromElement();
      await takeScreenshot('ecommerce-advanced-wizard-geopoint');
    });
  });
}
