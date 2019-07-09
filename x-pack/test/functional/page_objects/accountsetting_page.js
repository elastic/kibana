/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

//import { map as mapAsync } from 'bluebird';
import expect from '@kbn/expect';

export function AccountSettingProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const userMenu = getService('userMenu');

  class AccountSettingsPage {
    async verifyAccountSettings(expectedEmail, expectedUserName) {
      await userMenu.clickProvileLink();

      const usernameField = await testSubjects.find('username');
      const userName = await usernameField.getVisibleText();
      expect(userName).to.be(expectedUserName);

      const emailIdField = await testSubjects.find('email');
      const emailField = await emailIdField.getVisibleText();
      expect(emailField).to.be(expectedEmail);
      await userMenu.closeMenu();
    }

    async changePassword(currentPassword, newPassword) {
      await testSubjects.setValue('currentPassword', currentPassword);
      await testSubjects.setValue('newPassword', newPassword);
      await testSubjects.setValue('confirmNewPassword', newPassword);
      await testSubjects.click('changePasswordButton');
      await testSubjects.existOrFail('passwordUpdateSuccess');
    }
  }
  return new AccountSettingsPage();
}
