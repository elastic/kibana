/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function UserMenuProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');

  return new (class UserMenu {
    async clickLogoutButton() {
      log.debug('Clicking logout button in user menu');
      await this._ensureMenuOpen();
      await testSubjects.click('userMenu > logoutLink');
    }

    async clickProvileLink() {
      log.debug('Clicking profile link in user menu');
      await this._ensureMenuOpen();
      await testSubjects.click('userMenu > profileLink');
    }

    async logoutLinkExists() {
      log.debug('Checking if logout link exists in user menu');
      if (!(await testSubjects.exists('userMenuButton'))) {
        log.debug('User menu button does not exist, skipping logout link check');
        return;
      }

      log.debug('Ensuring user menu is open to check for logout link');
      await this._ensureMenuOpen();
      log.debug('Checking for existence of logout link');
      return await testSubjects.exists('userMenu > logoutLink');
    }

    async openMenu() {
      log.debug('Opening user menu');
      await this._ensureMenuOpen();
    }

    async closeMenu() {
      log.debug('Closing user menu if it is open');
      if (!(await testSubjects.exists('userMenu'))) {
        log.debug('User menu is not open, skipping close action');
        return;
      }

      log.debug('Closing user menu');
      await testSubjects.click('userMenuButton');
      log.debug('Waiting for user menu to be closed');
      await testSubjects.missingOrFail('userMenu');
    }

    async _ensureMenuOpen() {
      log.debug('Ensuring user menu is open');
      if (await testSubjects.exists('userMenu')) {
        log.debug('User menu is already open, skipping open action');
        return;
      }

      await retry.try(async () => {
        log.debug('Opening user menu');
        await testSubjects.click('userMenuButton');
        log.debug('Waiting for user menu to be visible');
        try {
          await testSubjects.existOrFail('userMenu', { timeout: 2500 });
        } catch (error) {
          log.error('Failed to open user menu:', error);
          throw error;
        }
      });
    }
  })();
}
