/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlObltNavigation = getService('svlObltNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');

  describe('navigation', function () {
    before(async () => {
      await svlCommonPage.loginWithPrivilegedRole();
      await svlObltNavigation.navigateToDiscoverPage();
    });

    it('shows the alerts entry', async () => {
      await svlCommonNavigation.expectExists();

      await svlCommonNavigation.sidenav.expectLinkExists({
        deepLinkId: 'observability-overview:alerts',
      });
    });

    it('does not show the SLO entry', async () => {
      await svlCommonNavigation.expectExists();

      await svlCommonNavigation.sidenav.expectLinkMissing({
        deepLinkId: 'slo',
      });
    });

    it('does not show the Cases entry', async () => {
      await svlCommonNavigation.expectExists();
      await svlCommonNavigation.sidenav.expectLinkMissing({
        deepLinkId: 'observability-overview:cases',
      });
    });

    it('shows 404 when loading cases', async () => {
      await svlCommonNavigation.expectExists();
      await svlObltNavigation.navigateToObsCases();
      await svlObltNavigation.expectNotFoundPage();
    });
  });
}
