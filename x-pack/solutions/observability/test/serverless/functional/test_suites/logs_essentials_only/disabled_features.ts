/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObject, getService, getPageObjects }: FtrProviderContext) {
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlObltNavigation = getService('svlObltNavigation');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common']);

  describe('disabled features - navigation visibility', function () {
    before(async () => {
      await svlCommonPage.loginWithPrivilegedRole();
      await svlObltNavigation.navigateToDiscoverPage();
      await svlCommonNavigation.expectExists();
    });

    it('hides AI Assistant', async () => {
      await svlCommonNavigation.sidenav.expectLinkMissing({ navId: 'observabilityAIAssistant' });
    });

    it('hides Infrastructure (Inventory and Hosts)', async () => {
      await svlCommonNavigation.sidenav.expectLinkMissing({ deepLinkId: 'metrics:inventory' });
      await svlCommonNavigation.sidenav.expectLinkMissing({ deepLinkId: 'metrics:hosts' });
    });

    it('direct nav to logs anomalies shows Not Found', async () => {
      await svlCommonPage.loginWithPrivilegedRole();
      await PageObjects.common.navigateToApp('logs', { hash: '/anomalies' });
      await retry.tryForTime(60 * 1000, async () => {
        const obsNotFound = await testSubjects.exists('observabilityPageNotFoundBanner');
        const infraNotFound = await testSubjects.exists('infraNotFoundPage');
        const coreNotFound = await testSubjects.exists('appNotFoundPageContent');
        if (!obsNotFound && !infraNotFound && !coreNotFound) {
          throw new Error('Expected a not found page for logs anomalies');
        }
      });
    });

    it('direct nav to logs categories shows Not Found', async () => {
      await svlCommonPage.loginWithPrivilegedRole();
      await PageObjects.common.navigateToApp('logs', { hash: '/log-categories' });
      await retry.tryForTime(60 * 1000, async () => {
        const obsNotFound = await testSubjects.exists('observabilityPageNotFoundBanner');
        const infraNotFound = await testSubjects.exists('infraNotFoundPage');
        const coreNotFound = await testSubjects.exists('appNotFoundPageContent');
        if (!obsNotFound && !infraNotFound && !coreNotFound) {
          throw new Error('Expected a not found page for logs categories');
        }
      });
    });
  });
}
