/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SvlCommonPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const pageObjects = getPageObjects(['security', 'common', 'header']);
  const retry = getService('retry');
  const deployment = getService('deployment');
  const log = getService('log');
  const browser = getService('browser');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');

  /**
   * Delete browser cookies, clear session and local storages
   */
  const cleanBrowserState = async () => {
    // we need to load kibana host to delete/add cookie
    const noAuthRequiredUrl = deployment.getHostPort() + '/bootstrap-anonymous.js';
    log.debug(`browser: navigate to /bootstrap-anonymous.js`);
    await browser.get(noAuthRequiredUrl);
    // previous test might left unsaved changes and alert will show up on url change
    const alert = await browser.getAlert();
    if (alert) {
      log.debug(`browser: closing alert`);
      await alert.accept();
    }
    log.debug(`browser: wait for resource page to be loaded`);
    // TODO: temporary solution while we don't migrate all functional tests to SAML auth
    // On CI sometimes we are redirected to cloud login page, in this case we skip cleanup
    const isOnBootstrap = await find.existsByDisplayedByCssSelector('body > pre', 5000);
    if (!isOnBootstrap) {
      const currentUrl = await browser.getCurrentUrl();
      log.debug(`current url: ${currentUrl}`);
      if (!currentUrl.includes(deployment.getHostPort())) {
        log.debug('Skipping browser state cleanup');
        return;
      } else {
        log.debug('browser: navigate to /bootstrap-anonymous.js #2');
        await browser.get(noAuthRequiredUrl);
        await find.byCssSelector('body > pre', 5000);
      }
    }

    log.debug(`browser: delete all the cookies`);
    await retry.waitForWithTimeout('Browser cookies are deleted', 10000, async () => {
      await browser.deleteAllCookies();
      await pageObjects.common.sleep(1000);
      const cookies = await browser.getCookies();
      return cookies.length === 0;
    });
    log.debug(`browser: clearing session & local storages`);
    await browser.clearSessionStorage();
    await browser.clearLocalStorage();
    await pageObjects.common.sleep(700);
  };

  return {
    /**
     * Login to Kibana using SAML authentication with provided project-specfic role
     */
    async loginWithRole(role: string) {
      log.debug(`Fetch the cookie for '${role}' role`);
      const sidCookie = await svlUserManager.getInteractiveUserSessionCookieWithRoleScope(role);
      await retry.waitForWithTimeout(
        `Logging in by setting browser cookie for '${role}' role`,
        30_000,
        async () => {
          await cleanBrowserState();
          log.debug(`browser: set the new cookie`);
          await retry.waitForWithTimeout('New cookie is added', 10000, async () => {
            await browser.setCookie('sid', sidCookie);
            await pageObjects.common.sleep(1000);
            const cookies = await browser.getCookies();
            return cookies.length === 1;
          });
          // Cookie should be already set in the browsing context, navigating to the Home page
          log.debug(`browser: refresh the page`);
          await browser.refresh();
          log.debug(`browser: load base url and validate the cookie`);
          await browser.get(deployment.getHostPort());
          // Validating that the new cookie in the browser is set for the correct user
          const browserCookies = await browser.getCookies();
          if (browserCookies.length === 0) {
            throw new Error(`The cookie is missing in browser context`);
          }
          const { body } = await supertestWithoutAuth
            .get('/internal/security/me')
            .set(svlCommonApi.getInternalRequestHeader())
            .set({ Cookie: `sid=${browserCookies[0].value}` });

          const email = await svlUserManager.getEmail(role);
          // email returned from API call must match the email for the specified role
          if (body.email === email) {
            log.debug(`The new cookie is properly set for  '${role}' role`);
          } else {
            log.debug(`API response body: ${JSON.stringify(body)}`);
            throw new Error(
              `Cookie is not set properly, expected email is '${email}', but found '${body.email}'`
            );
          }
          // Verifying that we are logged in
          if (await testSubjects.exists('userMenuButton', { timeout: 10_000 })) {
            log.debug('userMenuButton found, login passed');
            return true;
          } else {
            throw new Error(`Failed to login with cookie for '${role}' role`);
          }
        }
      );
    },

    /**
     *
     * Login to Kibana using SAML authentication with Admin role
     */
    async loginAsAdmin() {
      await this.loginWithRole('admin');
    },

    /**
     *
     * Login to Kibana using SAML authentication with Viewer role
     */
    async loginAsViewer() {
      await this.loginWithRole('viewer');
    },

    /**
     *
     * Login to Kibana using SAML authentication with Editor role (observability, security)
     */
    async loginAsEditor() {
      await this.loginWithRole('editor');
    },

    /**
     * Login to Kibana using SAML authentication with Developer role (search)
     */
    async loginAsDeveloper() {
      await this.loginWithRole('developer');
    },

    /**
     * Login to Kibana using SAML authentication with Editor/Developer role
     */
    async loginWithPrivilegedRole() {
      await this.loginWithRole(svlUserManager.DEFAULT_ROLE);
    },

    /**
     *
     * Login to Kibana using SAML authentication with custom role
     */
    async loginWithCustomRole() {
      await this.loginWithRole(svlUserManager.CUSTOM_ROLE);
    },

    async navigateToLoginForm() {
      const url = deployment.getHostPort() + '/login';
      await browser.get(url);
      log.debug('Waiting for Login Form to appear.');
      await retry.waitForWithTimeout('login form', 10_000, async () => {
        return await pageObjects.security.isLoginFormVisible();
      });
    },

    async assertProjectHeaderExists() {
      await testSubjects.existOrFail('kibanaProjectHeader');
    },

    async clickUserAvatar() {
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('userMenuAvatar', 10_000);
    },

    async assertUserAvatarExists() {
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('userMenuAvatar', {
        timeout: 10_000,
      });
    },

    async assertUserMenuExists() {
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('userMenu', {
        timeout: 10_000,
      });
    },
  };
}
