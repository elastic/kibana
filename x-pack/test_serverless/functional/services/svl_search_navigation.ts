/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SvlSearchNavigationServiceProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateToLandingPage() {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('landingPage');
        await testSubjects.existOrFail('svlSearchOverviewPage', { timeout: 2000 });
      });
    },
  };
}
