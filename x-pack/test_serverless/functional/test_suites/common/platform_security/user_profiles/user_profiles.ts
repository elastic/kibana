/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

const VIEWER_ROLE = 'viewer';
const DARK_MODE_TAG = 'v8dark';
const LIGHT_MODE_TAG = 'v8light';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'svlUserProfile']);
  const svlUserManager = getService('svlUserManager');

  describe('User Profile Page', async () => {
    before(async () => {
      await pageObjects.svlCommonPage.loginWithRole('viewer');
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    describe('Theme', async () => {
      it('should change theme based on the User Profile Theme control', async () => {
        await pageObjects.common.navigateToApp('security_account');

        const changeTo = (currentMode: string): string => {
          return currentMode === LIGHT_MODE_TAG ? DARK_MODE_TAG : LIGHT_MODE_TAG;
        };

        const modeTag = await pageObjects.svlUserProfile.getThemeTag();

        const expectedModeFirst = changeTo(modeTag);
        await pageObjects.svlUserProfile.changeUserProfileTheme();
        const modeChangeFirst = await pageObjects.svlUserProfile.getThemeTag();
        expect(modeChangeFirst).to.be(expectedModeFirst);

        const expectedModeSecond = changeTo(modeChangeFirst);
        await pageObjects.svlUserProfile.changeUserProfileTheme();
        const modeChangeSecond = await pageObjects.svlUserProfile.getThemeTag();
        expect(modeChangeSecond).to.be(expectedModeSecond);
      });
    });

    describe('User details', async () => {
      it('should change theme based on the User Profile Theme control', async () => {
        await pageObjects.common.navigateToApp('security_account');

        const userData = await svlUserManager.getUserData(VIEWER_ROLE);

        const actualFullname = await pageObjects.svlUserProfile.getProfileFullname();
        const actualEmail = await pageObjects.svlUserProfile.getProfileEmail();

        expect(actualFullname).to.be(userData.fullname);
        expect(actualEmail).to.be(userData.email);
      });
    });
  });
}
