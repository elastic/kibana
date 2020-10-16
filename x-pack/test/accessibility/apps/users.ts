/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// a11y tests for spaces, space selection and spacce creation and feature controls

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['security', 'settings']);
  const a11y = getService('a11y');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Kibana users page a11y tests', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
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
      await testSubjects.setValue('userFormUserNameInput', 'a11y');
      await testSubjects.setValue('passwordInput', 'password');
      await testSubjects.setValue('passwordConfirmationInput', 'password');
      await testSubjects.setValue('userFormFullNameInput', 'a11y user');
      await testSubjects.setValue('userFormEmailInput', 'example@example.com');
      await testSubjects.click('rolesDropdown');
      await a11y.testAppSnapshot();
    });

    it('a11y test for display of delete button on users page ', async () => {
      await testSubjects.setValue('userFormUserNameInput', 'deleteA11y');
      await testSubjects.setValue('passwordInput', 'password');
      await testSubjects.setValue('passwordConfirmationInput', 'password');
      await testSubjects.setValue('userFormFullNameInput', 'DeleteA11y user');
      await testSubjects.setValue('userFormEmailInput', 'example@example.com');
      await testSubjects.click('rolesDropdown');
      await testSubjects.setValue('rolesDropdown', 'roleOption-apm_user');
      await testSubjects.click('userFormSaveButton');
      await testSubjects.click('checkboxSelectRow-deleteA11y');
      await a11y.testAppSnapshot();
    });

    it('a11y test for delete user panel ', async () => {
      await testSubjects.click('deleteUserButton');
      await a11y.testAppSnapshot();
    });

    it('a11y test for edit user panel', async () => {
      await testSubjects.click('confirmModalCancelButton');
      await PageObjects.settings.clickLinkText('deleteA11y');
      await a11y.testAppSnapshot();
    });

    it('a11y test for Change password screen', async () => {
      await PageObjects.settings.clickLinkText('deleteA11y');
      await testSubjects.click('changePassword');
      await a11y.testAppSnapshot();
    });
  });
}
