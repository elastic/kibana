/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['security', 'settings', 'common', 'header']);

  const USERS_PATH = 'security/users';
  const EDIT_USERS_PATH = `${USERS_PATH}/edit`;

  const ROLES_PATH = 'security/roles';
  const EDIT_ROLES_PATH = `${ROLES_PATH}/edit`;
  const CLONE_ROLES_PATH = `${ROLES_PATH}/clone`;

  // FLAKY: https://github.com/elastic/kibana/issues/61173
  describe.skip('Management', function () {
    this.tags(['skipFirefox']);

    before(async () => {
      // await PageObjects.security.login('elastic', 'changeme');
      await PageObjects.security.initTests();
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.settings.navigateTo();

      // Create logstash-readonly role
      await testSubjects.click('roles');
      await PageObjects.security.clickCreateNewRole();
      await testSubjects.setValue('roleFormNameInput', 'logstash-readonly');
      await PageObjects.security.addIndexToRole('logstash-*');
      await PageObjects.security.addPrivilegeToRole('read');
      await PageObjects.security.clickSaveEditRole();

      await PageObjects.settings.navigateTo();
    });

    describe('Security', () => {
      describe('navigation', () => {
        it('Can navigate to create user section', async () => {
          await PageObjects.security.clickElasticsearchUsers();
          await PageObjects.security.clickCreateNewUser();
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain(EDIT_USERS_PATH);
        });

        it('Clicking cancel in create user section brings user back to listing', async () => {
          await PageObjects.security.clickCancelEditUser();
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain(USERS_PATH);
          expect(currentUrl).to.not.contain(EDIT_USERS_PATH);
        });

        it('Clicking save in create user section brings user back to listing', async () => {
          await PageObjects.security.clickCreateNewUser();

          await testSubjects.setValue('userFormUserNameInput', 'new-user');
          await testSubjects.setValue('passwordInput', '123456');
          await testSubjects.setValue('passwordConfirmationInput', '123456');
          await testSubjects.setValue('userFormFullNameInput', 'Full User Name');
          await testSubjects.setValue('userFormEmailInput', 'example@example.com');

          await PageObjects.security.clickSaveEditUser();

          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain(USERS_PATH);
          expect(currentUrl).to.not.contain(EDIT_USERS_PATH);
        });

        it('Can navigate to edit user section', async () => {
          await PageObjects.settings.clickLinkText('new-user');
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain(EDIT_USERS_PATH);
          // allow time for user to load
          await PageObjects.common.sleep(500);
          const userName = await testSubjects.getAttribute('userFormUserNameInput', 'value');
          expect(userName).to.equal('new-user');
        });

        it('Can navigate to roles section', async () => {
          await PageObjects.security.clickElasticsearchRoles();
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain(ROLES_PATH);
        });

        it('Can navigate to create role section', async () => {
          await PageObjects.security.clickCreateNewRole();
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain(EDIT_ROLES_PATH);
        });

        it('Clicking cancel in create role section brings user back to listing', async () => {
          await PageObjects.security.clickCancelEditRole();
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain(ROLES_PATH);
          expect(currentUrl).to.not.contain(EDIT_ROLES_PATH);
        });

        it('Clicking save in create role section brings user back to listing', async () => {
          await PageObjects.security.clickCreateNewRole();

          await testSubjects.setValue('roleFormNameInput', 'a-my-new-role');

          await PageObjects.security.clickSaveEditRole();

          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain(ROLES_PATH);
          expect(currentUrl).to.not.contain(EDIT_ROLES_PATH);
        });

        it('Can navigate to edit role section', async () => {
          await PageObjects.settings.clickLinkText('a-my-new-role');
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain(EDIT_ROLES_PATH);

          const userName = await testSubjects.getAttribute('roleFormNameInput', 'value');
          expect(userName).to.equal('a-my-new-role');
        });

        it('Can navigate to clone role section', async () => {
          await PageObjects.settings.navigateTo();
          await PageObjects.security.clickElasticsearchRoles();
          await PageObjects.security.clickCloneRole('a-my-new-role');
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain(CLONE_ROLES_PATH);
        });

        it('Can navigate to edit role section from users page', async () => {
          await PageObjects.settings.navigateTo();
          await PageObjects.security.clickUsersSection();
          await PageObjects.security.clickCreateNewUser();

          await testSubjects.setValue('userFormUserNameInput', 'dashuser');
          await testSubjects.setValue('passwordInput', '123456');
          await testSubjects.setValue('passwordConfirmationInput', '123456');
          await testSubjects.setValue('userFormFullNameInput', 'dashuser');
          await testSubjects.setValue('userFormEmailInput', 'example@example.com');
          await PageObjects.security.assignRoleToUser('kibana_dashboard_only_user');
          await PageObjects.security.assignRoleToUser('logstash-readonly');

          await PageObjects.security.clickSaveEditUser();

          await PageObjects.settings.navigateTo();
          await testSubjects.click('users');
          await PageObjects.settings.clickLinkText('kibana_dashboard_only_user');
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain(EDIT_ROLES_PATH);
        });
      });
    });
  });
}
