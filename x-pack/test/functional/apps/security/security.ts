/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const spaces = getService('spaces');

  // FLAKY: https://github.com/elastic/kibana/issues/157722
  describe.skip('Security', function () {
    this.tags('includeFirefox');
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

      it('can login', async () => {
        await PageObjects.security.login();
      });

      it('displays message if login fails', async () => {
        await PageObjects.security.loginPage.login('wrong-user', 'wrong-password', {
          expectSuccess: false,
        });
        const errorMessage = await PageObjects.security.loginPage.getErrorMessage();
        expect(errorMessage).to.be('Username or password is incorrect. Please try again.');
      });

      it('displays message acknowledging logout', async () => {
        await PageObjects.security.login();
        await PageObjects.security.logout();

        const logoutMessage = await testSubjects.getVisibleText('loginInfoMessage');
        expect(logoutMessage).to.eql('You have logged out of Elastic.');
      });

      describe('within a non-default space', async () => {
        before(async () => {
          await PageObjects.security.forceLogout();

          await spaces.create({
            id: 'some-space',
            name: 'Some non-default space',
            disabledFeatures: [],
          });
        });

        after(async () => {
          await spaces.delete('some-space');
        });

        it('logging out of a non-default space redirects to the login page at the server root', async () => {
          await PageObjects.security.login(undefined, undefined, {
            expectSpaceSelector: true,
          });

          await PageObjects.spaceSelector.clickSpaceCard('some-space');
          await PageObjects.spaceSelector.expectHomePage('some-space');

          await PageObjects.security.logout();

          const currentUrl = await browser.getCurrentUrl();
          const url = parse(currentUrl);
          expect(url.pathname).to.eql('/login');
        });
      });
    });
  });
}
