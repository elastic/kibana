/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// a11y tests for spaces, space selection and spacce creation and feature controls

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['security', 'settings', 'common', 'header']);
  const a11y = getService('a11y');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const toasts = getService('toasts');

  describe('Kibana users page meets a11y validations', () => {
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
      await a11y.testAppSnapshot();
    });
  });
}
