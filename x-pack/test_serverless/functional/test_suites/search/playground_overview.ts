/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlCommonPage', 'svlCommonNavigation', 'svlPlaygroundUI']);
  describe('Playground', function () {
    before(async () => {
      await pageObjects.svlCommonPage.login();
      await pageObjects.svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'searchPlayground' });
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    it('playground app is loaded', async () => {
      await pageObjects.svlPlaygroundUI.PlaygrounStartChatPage.expectPlaygroundStartChatPageComponentsToExist();
      await pageObjects.svlPlaygroundUI.PlaygrounStartChatPage.expectPlaygroundHeaderComponentsToExist();
    });
  });
}
