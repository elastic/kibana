/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'security']);
  const kibanaServer = getService('kibanaServer');

  describe('Security Accessibility', () => {
    describe('Login Page', () => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await PageObjects.security.forceLogout();
      });

      after(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
      });

      afterEach(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await PageObjects.security.forceLogout();
      });

      it('login page meets a11y requirements', async () => {
        await PageObjects.common.navigateToApp('login');

        await retry.waitFor(
          'login page visible',
          async () => await testSubjects.exists('loginSubmit')
        );
        await a11y.testAppSnapshot();
      });

      it('User can login with a11y requirements', async () => {
        await PageObjects.security.login();
        await a11y.testAppSnapshot();
      });

      it('Wrong credentials message meets a11y requirements', async () => {
        await PageObjects.security.loginPage.login('wrong-user', 'wrong-password', {
          expectSuccess: false,
        });
        await PageObjects.security.loginPage.getErrorMessage();
        await a11y.testAppSnapshot();
      });

      it('Logout message acknowledges a11y requirements', async () => {
        await PageObjects.security.login();
        await PageObjects.security.logout();
        await testSubjects.getVisibleText('loginInfoMessage');
        await a11y.testAppSnapshot();
      });
    });
  });
}
