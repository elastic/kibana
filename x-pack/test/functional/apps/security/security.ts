/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['security']);
  const testSubjects = getService('testSubjects');
  const security = getService('security');
  const retry = getService('retry');

  describe('Security', function() {
    (this as any).tags('smoke');

    describe('Login Page', () => {
      before(async () => {
        await esArchiver.load('empty_kibana');
        await security.logout();
      });

      after(async () => {
        await esArchiver.unload('empty_kibana');
      });

      afterEach(async () => {
        await security.logout();
      });

      it('can login', async () => {
        await security.loginAsSuperUser();
      });

      it('displays message if login fails', async () => {
        await security.loginAs({
          username: 'wrong-user',
          password: 'wrong-password',
          expect: null,
        });

        const errorMessage = await retry.try(async () => {
          const errorMessageContainer = await retry.try(() =>
            testSubjects.find('loginErrorMessage')
          );
          const errorMessageText = await errorMessageContainer.getVisibleText();

          if (!errorMessageText) {
            throw new Error('Login Error Message not present yet');
          }

          return errorMessageText;
        });
        expect(errorMessage).to.be('Invalid username or password. Please try again.');
      });

      it('displays message acknowledging logout', async () => {
        await security.loginAsSuperUser();
        await PageObjects.security.logoutWithUserMenu();

        const logoutMessage = await testSubjects.getVisibleText('loginInfoMessage');
        expect(logoutMessage).to.eql('You have logged out of Kibana.');
      });
    });
  });
}
