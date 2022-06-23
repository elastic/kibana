/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects(['common', 'infraHome']);
  const find = getService('find');

  const setInitialTourState = async (activeStep?: number) => {
    await browser.setLocalStorageItem(
      'xpack.observability.tourState',
      JSON.stringify({
        activeStep: activeStep || 1,
        isTourActive: true,
      })
    );
    await browser.refresh();
  };

  describe('Onboarding Observability tour', function () {
    this.tags('includeFirefox');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await pageObjects.common.navigateToApp('observability');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await browser.removeLocalStorageItem('xpack.observability.tourState');
    });

    describe('Tour enabled', () => {
      it('can complete tour', async () => {
        await setInitialTourState();

        // Step 1: Overview
        await pageObjects.infraHome.waitForTourStep('overviewStep');
        await pageObjects.infraHome.clickTourNextButton();

        // Step 2: Streams
        await pageObjects.infraHome.waitForTourStep('streamStep');
        await pageObjects.infraHome.clickTourNextButton();

        // Step 3: Metrics explorer
        await pageObjects.infraHome.waitForTourStep('metricsExplorerStep');
        await pageObjects.infraHome.clickTourNextButton();

        // Step 4: Traces
        await pageObjects.infraHome.waitForTourStep('tracesStep');
        await pageObjects.infraHome.clickTourNextButton();

        // Step 5: Alerts
        await pageObjects.infraHome.waitForTourStep('alertStep');
        await pageObjects.infraHome.clickTourNextButton();

        // Step 6: Guided setup
        await pageObjects.infraHome.waitForTourStep('guidedSetupStep');
        await pageObjects.infraHome.clickTourEndButton();
        await pageObjects.infraHome.ensureTourStepIsClosed('guidedSetupStep');
      });

      it('can skip tour', async () => {
        await setInitialTourState();

        await pageObjects.infraHome.waitForTourStep('overviewStep');
        await pageObjects.infraHome.clickTourSkipButton();

        // Verify current step ("Overview") is not displayed
        await pageObjects.infraHome.ensureTourStepIsClosed('overviewStep');
        // Verify next step ("Streams") is not displayed
        await pageObjects.infraHome.ensureTourStepIsClosed('streamStep');

        await browser.refresh();

        // Verify current step ("Overview") is not displayed after browser refresh,
        // i.e., localStorage has been updated to not show the tour again
        await pageObjects.infraHome.ensureTourStepIsClosed('overviewStep');
      });

      it('can start mid-tour', async () => {
        await setInitialTourState(5);

        // Step 5: Alerts
        await pageObjects.infraHome.waitForTourStep('alertStep');
        await pageObjects.infraHome.clickTourNextButton();

        // Step 6: Guided setup
        await pageObjects.infraHome.waitForTourStep('guidedSetupStep');
        await pageObjects.infraHome.clickTourEndButton();
        await pageObjects.infraHome.ensureTourStepIsClosed('guidedSetupStep');
      });

      it('navigates the user to the guided setup step', async () => {
        // For brevity, starting the tour at step 5
        await setInitialTourState(5);

        await pageObjects.infraHome.waitForTourStep('alertStep');

        // Click on Alerts link
        await (await find.byCssSelector('[data-nav-id="alerts"]')).click();

        // Verify user correctly navigated to the Alerts page
        const alertsPageUrl = await browser.getCurrentUrl();
        expect(alertsPageUrl).to.contain('/app/observability/alerts');

        // Verify Step 5 persists on Alerts page, then continue with tour
        await pageObjects.infraHome.waitForTourStep('alertStep');
        await pageObjects.infraHome.clickTourNextButton();

        // Verify user navigated back to the overview page, and guided setup step renders (Step 6)
        await pageObjects.infraHome.waitForTourStep('guidedSetupStep');
        const overviewPageUrl = await browser.getCurrentUrl();
        expect(overviewPageUrl).to.contain('/app/observability/overview');
      });
    });
  });
};
