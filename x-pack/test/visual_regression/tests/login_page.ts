/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const visualTesting = getService('visualTesting');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'security']);

  describe.skip('Security', () => {
    describe('Login Page', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
        await PageObjects.security.forceLogout();
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
      });

      afterEach(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await PageObjects.security.forceLogout();
      });

      it('renders login page', async () => {
        await PageObjects.common.navigateToApp('login');

        await retry.waitFor(
          'login page visible',
          async () => await testSubjects.exists('loginSubmit')
        );

        await visualTesting.snapshot();
      });

      it('renders failed login', async () => {
        await PageObjects.security.loginPage.login('wrong-user', 'wrong-password', {
          expectSuccess: false,
        });

        await retry.waitFor(
          'login error visible',
          async () => await testSubjects.exists('loginErrorMessage')
        );

        await visualTesting.snapshot();
      });
    });
  });
}
