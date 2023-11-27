/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'userProfiles', 'settings']);

  describe('User Profile Page', async () => {
    before(async () => {});

    describe('Details', async () => {
      before(async () => {
        await pageObjects.common.navigateToApp('security_account');
      });

      it('should set the full name', async () => {
        await pageObjects.userProfiles.setFullNameInputField('Test User 2');

        await pageObjects.userProfiles.saveUserProfileChanges();

        let toast = await pageObjects.common.closeToast();

        expect(toast).to.be('Profile updated');

        await pageObjects.userProfiles.setFullNameInputField('test user');

        await pageObjects.userProfiles.saveUserProfileChanges();

        toast = await pageObjects.common.closeToast();

        expect(toast).to.be('Profile updated');
      });

      it('should set the email', async () => {
        await pageObjects.userProfiles.setEmailInputField('test@test.com');

        await pageObjects.userProfiles.saveUserProfileChanges();

        let toast = await pageObjects.common.closeToast();

        expect(toast).to.be('Profile updated');

        await pageObjects.userProfiles.setEmailInputField('', true);

        await pageObjects.userProfiles.saveUserProfileChanges();

        toast = await pageObjects.common.closeToast();

        expect(toast).to.be('Profile updated');
      });
    });

    describe('Change Password', async () => {
      before(async () => {
        await pageObjects.common.navigateToApp('security_account');
      });

      it('should set the current password and enter a new password, then submit', async () => {
        const changePasswordButton = await pageObjects.userProfiles.getChangePasswordButton();
        await changePasswordButton.click();

        await pageObjects.userProfiles.setCurrentPasswordField('changeme');
        await pageObjects.userProfiles.setNewPasswordField('changeme2');
        await pageObjects.userProfiles.setConfirmPasswordField('changeme2');

        const submitButton = await pageObjects.userProfiles.getChangePasswordFormSubmitButton();
        await submitButton.click();

        const initialToast = await pageObjects.common.closeToast();

        expect(initialToast).to.be('Password successfully changed');

        await changePasswordButton.click();

        await pageObjects.userProfiles.setCurrentPasswordField('changeme2');
        await pageObjects.userProfiles.setNewPasswordField('changeme');
        await pageObjects.userProfiles.setConfirmPasswordField('changeme');

        await submitButton.click();

        const resetToast = await pageObjects.common.closeToast();

        expect(resetToast).to.be('Password successfully changed');
      });
    });

    describe('Theme', async () => {
      it('should change theme based on the User Profile Theme control with default Adv. Settings value (light)', async () => {
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

      it('should change theme based on the User Profile Theme control with default Adv. Settings value set to dark', async () => {
        await pageObjects.common.navigateToUrl('management', 'kibana/settings', {
          basePath: '',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });

        let advancedSetting = await pageObjects.settings.getAdvancedSettingCheckbox(
          'theme:darkMode'
        );
        expect(advancedSetting).to.be(null);

        await pageObjects.settings.toggleAdvancedSettingCheckbox('theme:darkMode', true);
        advancedSetting = await pageObjects.settings.getAdvancedSettingCheckbox('theme:darkMode');
        expect(advancedSetting).to.be('true');

        await pageObjects.common.navigateToApp('security_account');

        let spaceDefaultModeTag = await pageObjects.userProfiles.getThemeTag();
        expect(spaceDefaultModeTag).to.be('v8dark');

        await pageObjects.userProfiles.changeUserProfileTheme('Light');
        const lightModeTag = await pageObjects.userProfiles.getThemeTag();
        expect(lightModeTag).to.be('v8light');

        await pageObjects.userProfiles.changeUserProfileTheme('Dark');
        const darkModeTag = await pageObjects.userProfiles.getThemeTag();
        expect(darkModeTag).to.be('v8dark');

        await pageObjects.userProfiles.changeUserProfileTheme('Space default');
        spaceDefaultModeTag = await pageObjects.userProfiles.getThemeTag();
        expect(spaceDefaultModeTag).to.be('v8dark');

        await pageObjects.common.navigateToUrl('management', 'kibana/settings', {
          basePath: '',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });

        await pageObjects.settings.toggleAdvancedSettingCheckbox('theme:darkMode', false);
        advancedSetting = await pageObjects.settings.getAdvancedSettingCheckbox('theme:darkMode');
        expect(advancedSetting).to.be(null);
      });
    });
  });
};
