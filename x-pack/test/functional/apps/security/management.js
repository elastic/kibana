/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import {
  USERS_PATH,
  EDIT_USERS_PATH,
  ROLES_PATH,
  EDIT_ROLES_PATH,
} from '../../../../plugins/security/public/views/management/management_urls';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const remote = getService('remote');
  const find = getService('find');
  const PageObjects = getPageObjects(['security', 'settings', 'common', 'header']);

  describe('Management', () => {
    before(async () => {
      await PageObjects.security.login('elastic', 'changeme');
      await PageObjects.security.initTests();
      await kibanaServer.uiSettings.update({
        'dateFormat:tz': 'UTC',
        'defaultIndex': 'logstash-*'
      });
      await PageObjects.settings.navigateTo();
    });

    describe('Security', async () => {
      describe('navigation', async () => {
        it('Can navigate to create user section', async () => {
          await PageObjects.security.clickElasticsearchUsers();
          await PageObjects.security.clickCreateNewUser();
          const currentUrl = await remote.getCurrentUrl();
          expect(currentUrl).to.contain(EDIT_USERS_PATH);
        });

        it('Clicking cancel in create user section brings user back to listing', async () => {
          await PageObjects.security.clickCancelEditUser();
          const currentUrl = await remote.getCurrentUrl();
          expect(currentUrl).to.contain(USERS_PATH);
          expect(currentUrl).to.not.contain(EDIT_USERS_PATH);
        });

        it('Clicking save in create user section brings user back to listing', async () => {
          await PageObjects.security.clickCreateNewUser();

          await testSubjects.setValue('userFormUserNameInput', 'new-user');
          await testSubjects.setValue('passwordInput', '123456');
          await testSubjects.setValue('passwordConfirmationInput', '123456');
          await testSubjects.setValue('userFormFullNameInput', 'Full User Name');
          await testSubjects.setValue('userFormEmailInput', 'my@email.com');

          await PageObjects.security.clickSaveEditUser();

          const currentUrl = await remote.getCurrentUrl();
          expect(currentUrl).to.contain(USERS_PATH);
          expect(currentUrl).to.not.contain(EDIT_USERS_PATH);
        });

        it('Can navigate to edit user section', async () => {
          await PageObjects.settings.clickLinkText('new-user');
          const currentUrl = await remote.getCurrentUrl();
          expect(currentUrl).to.contain(EDIT_USERS_PATH);

          const userNameInput = await testSubjects.find('userFormUserNameInput');
          const userName = await userNameInput.getProperty('value');
          expect(userName).to.equal('new-user');
        });

        it('Can navigate to roles section', async () => {
          await PageObjects.settings.clickLinkText('Roles');
          const currentUrl = await remote.getCurrentUrl();
          expect(currentUrl).to.contain(ROLES_PATH);
        });

        it('Can navigate to create role section', async () => {
          await PageObjects.security.clickCreateNewRole();
          const currentUrl = await remote.getCurrentUrl();
          expect(currentUrl).to.contain(EDIT_ROLES_PATH);
        });

        it('Clicking cancel in create role section brings user back to listing', async () => {
          await PageObjects.security.clickCancelEditRole();
          const currentUrl = await remote.getCurrentUrl();
          expect(currentUrl).to.contain(ROLES_PATH);
          expect(currentUrl).to.not.contain(EDIT_ROLES_PATH);
        });

        it('Clicking save in create role section brings user back to listing', async () => {
          await PageObjects.security.clickCreateNewRole();

          await testSubjects.setValue('roleFormNameInput', 'my-new-role');

          await PageObjects.security.clickSaveEditRole();

          const currentUrl = await remote.getCurrentUrl();
          expect(currentUrl).to.contain(ROLES_PATH);
          expect(currentUrl).to.not.contain(EDIT_ROLES_PATH);
        });

        it('Can navigate to edit role section', async () => {
          await PageObjects.settings.clickLinkText('my-new-role');
          const currentUrl = await remote.getCurrentUrl();
          expect(currentUrl).to.contain(EDIT_ROLES_PATH);

          const userNameInput = await testSubjects.find('roleFormNameInput');
          const userName = await userNameInput.getProperty('value');
          expect(userName).to.equal('my-new-role');
        });

        it('Can navigate to edit role section from users page', async () => {
          await PageObjects.settings.navigateTo();
          await PageObjects.security.clickUsersSection();
          await PageObjects.security.clickCreateNewUser();

          await testSubjects.setValue('userFormUserNameInput', 'dashuser');
          await testSubjects.setValue('passwordInput', '123456');
          await testSubjects.setValue('passwordConfirmationInput', '123456');
          await testSubjects.setValue('userFormFullNameInput', 'dashuser');
          await testSubjects.setValue('userFormEmailInput', 'my@email.com');
          await PageObjects.security.assignRoleToUser('kibana_dashboard_only_user');
          await PageObjects.security.assignRoleToUser('logstash-data');

          await PageObjects.security.clickSaveEditUser();

          await PageObjects.settings.navigateTo();
          await PageObjects.settings.clickLinkText('Users');
          await PageObjects.settings.clickLinkText('kibana_dashboard_only_user');
          const currentUrl = await remote.getCurrentUrl();
          expect(currentUrl).to.contain(EDIT_ROLES_PATH);
        });

        it('Reserved roles are not editable', async () => {
          const allInputs = await find.allByCssSelector('input');
          for (let i = 0; i < allInputs.length; i++) {
            const input = allInputs[i];
            expect(await input.getProperty('disabled')).to.be(true);
          }

          const allCheckboxes = await find.allByCssSelector('checkbox');
          for (let i = 0; i < allCheckboxes.length; i++) {
            const checkbox = allCheckboxes[i];
            expect(await checkbox.getProperty('disabled')).to.be(true);
          }
        });
      });
    });
  });
}
