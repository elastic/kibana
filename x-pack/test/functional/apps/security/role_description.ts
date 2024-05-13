/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const find = getService('find');
  const security = getService('security');
  const PageObjects = getPageObjects(['security', 'settings', 'common', 'header']);

  describe('Role Description', function () {
    before(async () => {
      await security.testUser.setRoles(['cluster_security_manager']);
      await PageObjects.security.initTests();
    });

    after(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
      await security.role.delete('role-with-description');
      await security.role.delete('role-without-description');
      await security.testUser.restoreDefaults();
    });

    it('Can create role with description', async () => {
      await PageObjects.settings.navigateTo();

      await testSubjects.click('roles');
      await PageObjects.security.clickCreateNewRole();
      await testSubjects.setValue('roleFormNameInput', 'role-with-description');
      await testSubjects.setValue('roleFormDescriptionInput', 'role description');
      await PageObjects.security.clickSaveEditRole();

      await PageObjects.settings.navigateTo();

      const columnDescription = await testSubjects.getVisibleText(
        'roleRowDescription-role-with-description'
      );
      expect(columnDescription).to.equal('role description');

      await PageObjects.settings.clickLinkText('role-with-description');
      const name = await testSubjects.getAttribute('roleFormNameInput', 'value');
      const description = await testSubjects.getAttribute('roleFormDescriptionInput', 'value');

      expect(name).to.equal('role-with-description');
      expect(description).to.equal('role description');
    });

    it('Can create role without description', async () => {
      await PageObjects.settings.navigateTo();

      await testSubjects.click('roles');
      await PageObjects.security.clickCreateNewRole();
      await testSubjects.setValue('roleFormNameInput', 'role-without-description');
      await PageObjects.security.clickSaveEditRole();

      await PageObjects.settings.navigateTo();

      await PageObjects.settings.clickLinkText('role-without-description');
      const name = await testSubjects.getAttribute('roleFormNameInput', 'value');
      const description = await testSubjects.getAttribute('roleFormDescriptionInput', 'value');

      expect(name).to.equal('role-with-description');
      expect(description).to.equal('');
    });
  });
}
