/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SvlObltNavigationServiceProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);

  return {
    async navigateToLandingPage() {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('landingPage');
        await testSubjects.existOrFail('obltOnboardingHomeTitle', { timeout: 2000 });
      });
    },
    async navigateToDiscoverPage() {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('discover');
        await testSubjects.exists('discoverQueryTotalHits', { timeout: 20_000 });
      });
    },

    async navigateToObsCases() {
      await PageObjects.common.navigateToUrl('observability', 'cases');
    },

    async expectNotFoundPage() {
      await testSubjects.existOrFail('observabilityPageNotFoundBanner', {
        timeout: 20_000,
      });
    },
  };
}
