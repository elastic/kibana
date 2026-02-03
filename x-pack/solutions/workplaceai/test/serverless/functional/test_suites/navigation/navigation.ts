/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlWorkplaceAINavigation = getService('svlWorkplaceAINavigation');
  const svlCommonPage = getPageObject('svlCommonPage');

  describe('navigation', function () {
    before(async () => {
      await svlCommonPage.loginWithRole('developer');
    });

    it('navigates to landing page', async () => {
      await svlWorkplaceAINavigation.navigateToLandingPage();
    });
  });
}
