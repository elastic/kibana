/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const VIEWER_ROLE = 'viewer';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  describe(`Login as ${VIEWER_ROLE}`, function () {
    const svlCommonPage = getPageObject('svlCommonPage');
    const testSubjects = getService('testSubjects');
    const svlUserManager = getService('svlUserManager');

    before(async () => {
      await svlCommonPage.loginWithRole(VIEWER_ROLE);
    });

    it('should be able to see correct profile', async () => {
      await svlCommonPage.assertProjectHeaderExists();
      await svlCommonPage.assertUserAvatarExists();
      await svlCommonPage.clickUserAvatar();
      await svlCommonPage.assertUserMenuExists();
      const actualFullname = await testSubjects.getVisibleText('contextMenuPanelTitle');
      const userData = await svlUserManager.getUserData(VIEWER_ROLE);
      expect(actualFullname).to.be(userData.fullname);
    });
  });
}
