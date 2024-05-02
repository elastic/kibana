/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'header', 'home', 'dashboard', 'security']);
  const testSubjects = getService('testSubjects');
  const userMenu = getService('userMenu');

  describe('user opt in/out', function describeIndexTests() {
    it('should allow the user to opt in or out', async () => {
      await PageObjects.common.navigateToApp('home');

      // we are in the new nav, search solution
      await testSubjects.existOrFail('kibanaProjectHeader');

      await userMenu.openMenu();
      await testSubjects.existOrFail('solutionNavToggle');

      // Opt OUT of the new navigation
      await testSubjects.click('solutionNavToggle');
      // we are in the old nav
      await testSubjects.missingOrFail('kibanaProjectHeader');

      // Opt back IN to the new navigation
      await userMenu.openMenu();
      await testSubjects.click('solutionNavToggle');
      await testSubjects.existOrFail('kibanaProjectHeader');
    });
  });
}
