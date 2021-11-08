/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'security']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Login', () => {
    it('login and navigate to homepage', async () => {
      await PageObjects.common.navigateToApp('login');

      await retry.waitFor('login page visible', () => testSubjects.exists('loginSubmit'));

      await PageObjects.security.login();
    });
  });
}
