/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class AccountSettingsPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly userMenu = this.ctx.getService('userMenu');

  async verifyAccountSettings(expectedUserName: string) {
    await this.userMenu.clickProvileLink();

    const usernameField = await this.testSubjects.find('username');
    const userName = await usernameField.getVisibleText();
    expect(userName).to.be(expectedUserName);

    await this.userMenu.closeMenu();
  }

  async changePassword(currentPassword: string, newPassword: string) {
    await this.testSubjects.setValue('currentPassword', currentPassword);
    await this.testSubjects.setValue('newPassword', newPassword);
    await this.testSubjects.setValue('confirmNewPassword', newPassword);
    await this.testSubjects.click('changePasswordButton');
    await this.testSubjects.existOrFail('passwordUpdateSuccess');
  }
}
