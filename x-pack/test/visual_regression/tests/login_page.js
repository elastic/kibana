/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const visualTesting = getService('visualTesting');
  const PageObjects = getPageObjects(['security']);

  describe('Security', () => {
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

      it('renders login page', async () => {
        await visualTesting.snapshot();
      });

      it('failed login', async () => {
        await PageObjects.security.loginPage.login('wrong-user', 'wrong-password', {
          expectSuccess: false,
        });

        await visualTesting.snapshot();
      });

      it('logout message', async () => {
        await PageObjects.security.login();
        await PageObjects.security.logout();

        await visualTesting.snapshot();
      });
    });
  });
}
