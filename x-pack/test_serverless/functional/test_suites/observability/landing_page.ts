/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlObltOnboardingPage = getPageObject('svlObltOnboardingPage');
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlObltNavigation = getService('svlObltNavigation');
  const SvlObltOnboardingStreamLogFilePage = getPageObject('SvlObltOnboardingStreamLogFilePage');

  // FLAKY: https://github.com/elastic/kibana/issues/168037
  describe.skip('landing page', function () {
    before(async () => {
      await svlCommonPage.loginWithPrivilegedRole();
    });

    it('has quickstart badge', async () => {
      await svlObltNavigation.navigateToLandingPage();
      await svlObltOnboardingPage.assertQuickstartBadgeExists();
    });

    it('stream log files onboarding', async () => {
      await svlObltOnboardingPage.goToStreamLogFiles();
      await SvlObltOnboardingStreamLogFilePage.assertPageHeaderExists();
    });
  });
}
