/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlObltOnboardingPage = getPageObject('svlObltOnboardingPage');
  const svlObltOverviewPage = getPageObject('svlObltOverviewPage');
  const svlObltNavigation = getService('svlObltNavigation');

  describe('landing page', function () {
    it('has button to skip onboarding', async () => {
      await svlObltNavigation.navigateToLandingPage();
      await svlObltOnboardingPage.assertSkipButtonExists();
    });

    it('skips onboarding', async () => {
      await svlObltOnboardingPage.skipOnboarding();
      await svlObltOverviewPage.assertPageHeaderExists();
      await svlObltOverviewPage.assertAlertsSectionExists();
    });
  });
}
