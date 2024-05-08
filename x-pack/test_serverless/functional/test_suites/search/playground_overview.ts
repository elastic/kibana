/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlCommonPage', 'svlCommonNavigation', 'svlPlaygroundUI']);
  const browser = getService('browser');

  describe('Playground', function () {
    // playground UI is currently disabled in MKI
    this.tags(['failsOnMKI']);

    before(async () => {
      await pageObjects.svlCommonPage.login();
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    it('navigate to playground from side nav', async () => {
      await pageObjects.svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'searchPlayground' });
      await pageObjects.svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts([
        'Build',
        'Playground',
      ]);

      await pageObjects.svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'searchPlayground',
      });

      expect(await browser.getCurrentUrl()).contain('/app/search_playground/chat');
    });

    it('playground app is loaded', async () => {
      await pageObjects.svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'searchPlayground' });
      await pageObjects.svlPlaygroundUI.PlaygrounStartChatPage.expectPlaygroundStartChatPageComponentsToExist();
      await pageObjects.svlPlaygroundUI.PlaygrounStartChatPage.expectPlaygroundHeaderComponentsToExist();
    });
  });
}
