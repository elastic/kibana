/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

const VIEWER_ROLE = 'viewer';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'userProfiles']);
  const svlUserManager = getService('svlUserManager');

  describe('User Profile Page', async () => {
    before(async () => {
      await pageObjects.svlCommonPage.loginWithRole(VIEWER_ROLE);
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    describe('User details', async () => {
      it('should display correct user details', async () => {
        await pageObjects.common.navigateToApp('security_account');

        const userData = await svlUserManager.getUserData(VIEWER_ROLE);

        const actualFullname = await pageObjects.userProfiles.getProfileFullname();
        const actualEmail = await pageObjects.userProfiles.getProfileEmail();

        expect(actualFullname).to.be(userData.full_name);
        expect(actualEmail).to.be(userData.email);
      });

      it('should not have edit actions', async () => {
        const fullNameInputField = await testSubjects.findAll('userProfileFullName');

        const emailInputField = await testSubjects.findAll('userProfileEmail');
        const changePasswordButton = await testSubjects.findAll('openChangePasswordForm');

        expect(fullNameInputField).to.have.length(0);
        expect(emailInputField).to.have.length(0);
        expect(changePasswordButton).to.have.length(0);
      });
    });
  });
}
