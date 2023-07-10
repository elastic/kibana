/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const commonPage = getPageObject('common');
  const testSubjects = getService('testSubjects');

  // This is a dummy test. Replace with something useful!
  describe('home page', function () {
    it('navigates to home page', async () => {
      await commonPage.navigateToApp('home');
      await testSubjects.existOrFail('homeApp', { timeout: 2000 });
    });
  });
}
