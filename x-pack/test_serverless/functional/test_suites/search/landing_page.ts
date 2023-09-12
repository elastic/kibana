/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlSearchLandingPage', 'svlCommonPage']);
  const svlSearchNavigation = getService('svlSearchNavigation');

  describe('landing page', function () {
    before(async () => {
      await pageObjects.svlCommonPage.login();
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    it('has serverless side nav', async () => {
      await svlSearchNavigation.navigateToLandingPage();
      await pageObjects.svlSearchLandingPage.assertSvlSearchSideNavExists();
    });
  });
}
