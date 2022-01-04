/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for spaces, space selection and spacce creation and feature controls

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['security', 'settings']);
  const a11y = getService('a11y');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');

  describe('Kibana users page a11y tests', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await PageObjects.security.clickElasticsearchUsers();
    });

    it('a11y test for user page', async () => {
      await a11y.testAppSnapshot();
    });

    it('a11y test for search user bar', async () => {
      await testSubjects.click('searchUsers');
      await a11y.testAppSnapshot();
    });

    it('a11y test for searching a user', async () => {
      await testSubjects.setValue('searchUsers', 'test');
      await a11y.testAppSnapshot();
      await testSubjects.setValue('searchUsers', '');
    });

    it('a11y test for toggle button for show reserved users only', async () => {
      await retry.waitFor(
        'show reserved users toggle button is visible',
        async () => await testSubjects.exists('showReservedUsersSwitch')
      );
      await testSubjects.click('showReservedUsersSwitch');
      await a11y.testAppSnapshot();
      await testSubjects.click('showReservedUsersSwitch');
    });

    it('a11y test for create user panel', async () => {
      await testSubjects.click('createUserButton');
      await a11y.testAppSnapshot();
    });

    it('a11y test for roles drop down', async () => {
      await PageObjects.security.clickElasticsearchUsers();
      await PageObjects.security.clickCreateNewUser();
      await PageObjects.security.fillUserForm({
        username: 'a11y',
        password: 'password',
        confirm_password: 'password',
        full_name: 'a11y user',
        email: 'example@example.com',
        roles: ['apm_user'],
      });
      await testSubjects.click('rolesDropdown');
      await a11y.testAppSnapshot();
    });

    it('a11y test for display of delete button on users page', async () => {
      await PageObjects.security.createUser({
        username: 'deleteA11y',
        password: 'password',
        confirm_password: 'password',
        full_name: 'DeleteA11y user',
        email: 'example@example.com',
        roles: ['apm_user'],
      });
      await testSubjects.click('checkboxSelectRow-deleteA11y');
      await a11y.testAppSnapshot();
    });

    it('a11y test for delete user panel ', async () => {
      await testSubjects.click('deleteUserButton');
      await a11y.testAppSnapshot();
      await testSubjects.click('confirmModalCancelButton');
    });

    it('a11y test for edit user panel', async () => {
      await PageObjects.settings.clickLinkText('Users');
      await PageObjects.settings.clickLinkText('deleteA11y');
      await a11y.testAppSnapshot();
    });

    it('a11y test for change password screen', async () => {
      await PageObjects.settings.clickLinkText('Users');
      await PageObjects.settings.clickLinkText('deleteA11y');
      await find.clickByButtonText('Change password');
      await a11y.testAppSnapshot();
      await testSubjects.click('formFlyoutCancelButton');
    });

    it('a11y test for deactivate user screen', async () => {
      await PageObjects.settings.clickLinkText('Users');
      await PageObjects.settings.clickLinkText('deleteA11y');
      await find.clickByButtonText('Deactivate user');
      await a11y.testAppSnapshot();
    });
  });
}
