/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlCommonNavigation = getService('svlCommonNavigation');

  describe('Avatar menu', function () {
    before(async () => {
      await svlCommonPage.loginWithRole('viewer');
    });

    it('is displayed', async () => {
      await svlCommonNavigation.navigateToKibanaHome();
      await svlCommonPage.assertUserAvatarExists();
    });

    it('displays User Menu when clicked', async () => {
      await svlCommonNavigation.navigateToKibanaHome();
      await svlCommonPage.clickUserAvatar();
      await svlCommonPage.assertUserMenuExists();
    });
  });
}
