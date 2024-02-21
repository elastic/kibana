/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'userProfiles']);

  describe('User Profile Page', async () => {
    before(async () => {
      // TODO: migrate to SAML role when profile page displays the data
      await pageObjects.svlCommonPage.login();
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    describe('Theme', async () => {
      it('should change theme based on the User Profile Theme control', async () => {
        await pageObjects.common.navigateToApp('security_account');

        const themeKeyPadMenu = await pageObjects.userProfiles.getThemeKeypadMenu();
        expect(themeKeyPadMenu).not.to.be(null);

        await pageObjects.userProfiles.changeUserProfileTheme('Dark');
        const darkModeTag = await pageObjects.userProfiles.getThemeTag();
        expect(darkModeTag).to.be('v8dark');

        await pageObjects.userProfiles.changeUserProfileTheme('Light');
        const lightModeTag = await pageObjects.userProfiles.getThemeTag();
        expect(lightModeTag).to.be('v8light');

        await pageObjects.userProfiles.changeUserProfileTheme('Space default');
        const spaceDefaultModeTag = await pageObjects.userProfiles.getThemeTag();
        expect(spaceDefaultModeTag).to.be('v8light');
      });
    });
  });
}
