/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const security = getService('security');
  const PageObjects = getPageObjects(['common']);

  describe('Security', () => {
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

      it('meets a11y requirements', async () => {
        await PageObjects.common.navigateToApp('login');

        await retry.waitFor(
          'login page visible',
          async () => await testSubjects.exists('loginSubmit')
        );

        await a11y.testAppSnapshot();
      });
    });
  });
}
