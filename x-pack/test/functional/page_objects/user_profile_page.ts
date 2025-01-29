/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DarkModeValue as ColorMode } from '@kbn/user-profile-components';
import { FtrProviderContext } from '../ftr_provider_context';

export function UserProfilePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');
  const retry = getService('retry');

  const getThemeTag = async (): Promise<void> => {
    return await browser.execute('return __kbnThemeTag__');
  };

  const getSaveProfileChangesButton = async () => {
    return await testSubjects.find('saveProfileChangesButton');
  };

  const getReloadWindowButton = async () => {
    return await testSubjects.find('windowReloadButton');
  };

  const getThemeKeypadButton = async (colorMode: ColorMode) => {
    return await testSubjects.find(`themeKeyPadItem${colorMode}`);
  };

  const saveUserProfileChanges = async (): Promise<void> => {
    let saveProfileChangesButton;
    await retry.try(async () => {
      saveProfileChangesButton = await getSaveProfileChangesButton();
      expect(saveProfileChangesButton).not.to.be(null);
      await saveProfileChangesButton.click();
    });
  };

  const changeUserProfileTheme = async (colorMode: ColorMode): Promise<void> => {
    const themeModeButton = await getThemeKeypadButton(colorMode);
    expect(themeModeButton).not.to.be(null);
    await themeModeButton.click();

    await saveUserProfileChanges();

    let reloadWindowButton;
    await retry.try(async () => {
      reloadWindowButton = await getReloadWindowButton();
      expect(reloadWindowButton).not.to.be(null);
      await reloadWindowButton.click();
    });
  };

  return {
    async getThemeKeypadMenu() {
      return await find.byCssSelector('.euiKeyPadMenu');
    },

    async getProfileEmail() {
      return await testSubjects.getVisibleText('email');
    },

    async getProfileFullname() {
      return await testSubjects.getVisibleText('full_name');
    },

    async setFullNameInputField(newFullName: string) {
      return await testSubjects.setValue('userProfileFullName', newFullName);
    },

    async setEmailInputField(newEmailAddress: string, clearWithKeyboard: boolean = false) {
      return await testSubjects.setValue('userProfileEmail', newEmailAddress, {
        clearWithKeyboard,
      });
    },

    async getChangePasswordButton() {
      return await testSubjects.find('openChangePasswordForm');
    },

    async setCurrentPasswordField(currentPassword: string) {
      return await testSubjects.setValue(
        'editUserChangePasswordCurrentPasswordInput',
        currentPassword
      );
    },

    async setNewPasswordField(newPassword: string) {
      return await testSubjects.setValue('editUserChangePasswordNewPasswordInput', newPassword);
    },

    async setConfirmPasswordField(newPassword: string) {
      return await testSubjects.setValue('editUserChangePasswordConfirmPasswordInput', newPassword);
    },

    async getChangePasswordFormSubmitButton() {
      return await testSubjects.find('changePasswordFormSubmitButton');
    },
    getThemeTag,
    saveUserProfileChanges,
    changeUserProfileTheme,
  };
}
