/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function AccountSettingProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const userMenu = getService('userMenu');

  class AccountSettingsPage {
    async verifyAccountSettings(expectedEmail: string, expectedUserName: string) {
      await userMenu.clickProvileLink();

      const usernameField = await testSubjects.find('username');
      const userName = await usernameField.getVisibleText();
      expect(userName).to.be(expectedUserName);

      const emailIdField = await testSubjects.find('email');
      const emailField = await emailIdField.getVisibleText();
      expect(emailField).to.be(expectedEmail);
      await userMenu.closeMenu();
    }

    async changePassword(currentPassword: string, newPassword: string) {
      await testSubjects.setValue('currentPassword', currentPassword);
      await testSubjects.setValue('newPassword', newPassword);
      await testSubjects.setValue('confirmNewPassword', newPassword);
      await testSubjects.click('changePasswordButton');
      await testSubjects.existOrFail('passwordUpdateSuccess');
    }
  }
  return new AccountSettingsPage();
}
