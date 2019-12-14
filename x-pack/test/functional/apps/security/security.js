/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['security']);
  const testSubjects = getService('testSubjects');

  describe('Security', function() {
    this.tags('smoke');
    describe('Login Page', () => {
      before(async () => {
        await esArchiver.load('empty_kibana');
        await PageObjects.security.logout();
      });

      after(async () => {
        await esArchiver.unload('empty_kibana');
      });

      afterEach(async () => {
        await PageObjects.security.logout();
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
    });
  });
}
