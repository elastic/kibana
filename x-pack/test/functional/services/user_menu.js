/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function UserMenuProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return new class UserMenu {
    async clickLogoutButton() {
      await this._ensureMenuOpen();
      await testSubjects.click('userMenu logoutLink');
    }

    async clickProvileLink() {
      await this._ensureMenuOpen();
      await testSubjects.click('userMenu profileLink');
    }

    async logoutLinkExists() {
      if (!await testSubjects.exists('userMenuButton')) {
        return;
      }

      await this._ensureMenuOpen();
      return await testSubjects.exists('userMenu logoutLink');
    }

    async closeMenu() {
      if (!await testSubjects.exists('userMenu')) {
        return;
      }

      await testSubjects.click('userMenuButton');
      await testSubjects.missingOrFail('userMenu');
    }

    async _ensureMenuOpen() {
      if (await testSubjects.exists('userMenu')) {
        return;
      }

      await testSubjects.click('userMenuButton');
      await retry.waitFor('user menu opened', async () => (
        await testSubjects.exists('userMenu')
      ));
    }
  };
}
