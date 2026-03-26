/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlObltNavigation = getService('svlObltNavigation');
  const retry = getService('retry');

  describe('navigation - streams entry', function () {
    before(async () => {
      await svlCommonPage.loginWithPrivilegedRole();
      await svlObltNavigation.navigateToDiscoverPage();
    });

    it('shows the Streams entry in side nav (experimental)', async () => {
      await svlCommonNavigation.expectExists();
      await retry.tryForTime(30 * 1000, async () => {
        await svlCommonNavigation.sidenav.expectLinkExists({ deepLinkId: 'streams' });
      });
    });
  });
}
