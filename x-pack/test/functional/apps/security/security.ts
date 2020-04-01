/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { parse } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const spaces = getService('spaces');

  describe('Security', function() {
    this.tags('smoke');
    describe('Login Page', () => {
      before(async () => {
        await esArchiver.load('empty_kibana');
        await PageObjects.security.forceLogout();
      });

      after(async () => {
        await esArchiver.unload('empty_kibana');
      });

      afterEach(async () => {
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
        expect(errorMessage).to.be('Invalid username or password. Please try again.');
      });

      it('displays message acknowledging logout', async () => {
        await PageObjects.security.login();
        await PageObjects.security.logout();

        const logoutMessage = await testSubjects.getVisibleText('loginInfoMessage');
        expect(logoutMessage).to.eql('You have logged out of Kibana.');
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
          await PageObjects.security.login(null, null, {
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
