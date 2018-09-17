/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map as mapAsync } from 'bluebird';

export function AccountSettingProvider({ getService, getPageObjects }) {
  const remote = getService('remote');
  const config = getService('config');
  const retry = getService('retry');
  const find = getService('find');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header', 'settings', 'home']);

  class AccountSettingsPage {
    async verifyAccountSettings(user) {
      log.info(user.username);
      log.info(user.email);
    }
    async changePasswordLink(passwords) {
      return await testSubjects.exists('change-Password-link');
      return await testSubjects.click('change-Password-link');
      return await testSubjects.exists('current-Password-input');
      const currentPasswordField =  await testSubjects.find('currentPasswordInput');
      await currentPasswordField.click();
      await currentPasswordField.type(passwords.currentPassword);

      const newPasswordField =  await testSubjects.find('newPasswordInput');
      await newPasswordField.click();
      await currentPasswordField.type(passwords.newPassword);

      const confirmPasswordField =  await testSubjects.find('confirmPasswordInput');
      await newPasswordField.click();
      await confirmPasswordField.type(passwords.newPassword);

      const savePasswordButton =  await testSubjects.find('saveChangesButton');
      await savePasswordButton.click();

    }
  }
  return new AccountSettingsPage();
}
