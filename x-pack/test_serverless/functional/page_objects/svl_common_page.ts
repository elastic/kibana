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
  const config = getService('config');
  const pageObjects = getPageObjects(['security', 'common']);
  const retry = getService('retry');
  const deployment = getService('deployment');
  const log = getService('log');
  const browser = getService('browser');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');

  const delay = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  return {
    async loginWithRole(role: string) {
      log.debug(`Fetch the cookie for '${role}' role`);
      const sidCookie = await svlUserManager.getSessionCookieForRole(role);
      const bootstrapUrl = deployment.getHostPort() + '/bootstrap.js';
      await retry.waitForWithTimeout(
        `Logging in by setting browser cookie for '${role}' role`,
        30_000,
        async () => {
          log.debug(`Navigate to /bootstrap.js`);
          await browser.get(bootstrapUrl);
          // accept alert if it pops up
          const alert = await browser.getAlert();
          if (alert) {
            log.debug(`Closing alert in browser`);
            await alert.accept();
          }
          log.debug(`Wait for bootstrap page to be loaded`);
          await find.byCssSelector('body > pre', 5000);
          log.debug(`Delete all the cookies in the current browser context`);
          await retry.waitForWithTimeout('Browser cookies are deleted', 10000, async () => {
            await browser.deleteAllCookies();
            await pageObjects.common.sleep(1000);
            const cookies = await browser.getCookies();
            return cookies.length === 0;
          });
          await pageObjects.common.sleep(700);
          // Loading bootstrap.js in order to be on the domain that the cookie will be set for.
          log.debug(`Navigate to /bootstrap.js again`);
          await browser.get(bootstrapUrl);
          await find.byCssSelector('body > pre', 5000);
          log.debug(`Set the new cookie in the current browser context`);
          await browser.setCookie('sid', sidCookie);
          await pageObjects.common.sleep(700);
          // Cookie should be already set in the browsing context, navigating to the Home page
          log.debug(`Navigate to base url`);
          await browser.get(deployment.getHostPort(), false);
          // Verifying that we are logged in
          if (await testSubjects.exists('userMenuButton', { timeout: 10_000 })) {
            log.debug('userMenuButton found, login passed');
          } else {
            throw new Error(`Failed to login with cookie for '${role}' role`);
          }
          // Validating that the new cookie in the browser is set for the correct user
          const browserCookies = await browser.getCookies();
          if (browserCookies.length === 0) {
            throw new Error(`The cookie is missing in browser context`);
          }
          const { body } = await supertestWithoutAuth
            .get('/internal/security/me')
            .set(svlCommonApi.getInternalRequestHeader())
            .set({ Cookie: `sid=${browserCookies[0].value}` });

          const userData = await svlUserManager.getUserData(role);
          // email returned from API call must match the email for the specified role
          if (body.email === userData.email) {
            log.debug(`The new cookie is properly set for  '${role}' role`);
            return true;
          } else {
            log.debug(`API response body: ${JSON.stringify(body)}`);
            throw new Error(
              `Cookie is not set properly, expected email is '${userData.email}', but found '${body.email}'`
            );
          }
        }
      );
    },

    async loginAsAdmin() {
      await this.loginWithRole('admin');
    },

    async loginWithPrivilegedRole() {
      await this.loginWithRole(svlUserManager.DEFAULT_ROLE);
    },

    async navigateToLoginForm() {
      const url = deployment.getHostPort() + '/login';
      await browser.get(url);
      log.debug('Waiting for Login Form to appear.');
      await retry.waitForWithTimeout('login form', 10_000, async () => {
        return await pageObjects.security.isLoginFormVisible();
      });
    },

    async forceLogout() {
      log.debug('SvlCommonPage.forceLogout');
      if (await find.existsByDisplayedByCssSelector('.login-form', 100)) {
        log.debug('Already on the login page, not forcing anything');
        return;
      }

      log.debug(`Navigate to /bootstrap.js`);
      await browser.get(deployment.getHostPort() + '/bootstrap.js');
      // accept alert if it pops up
      const alert = await browser.getAlert();
      if (alert) {
        log.debug(`Closing alert in browser`);
        await alert.accept();
      }

      log.debug(`Wait for bootstrap page to be loaded`);
      await find.byCssSelector('body > pre', 5000);
      log.debug(`Delete all the cookies in the current browser context`);
      await retry.waitForWithTimeout('Browser cookies are deleted', 10000, async () => {
        await browser.deleteAllCookies();
        await pageObjects.common.sleep(1000);
        const cookies = await browser.getCookies();
        return cookies.length === 0;
      });

      log.debug(`Navigating to ${deployment.getHostPort()}/logout to force the logout`);
      await browser.get(deployment.getHostPort() + '/logout');

      // After logging out, the user can be redirected to various locations depending on the context. By default, we
      // expect the user to be redirected to the login page. However, if the login page is not available for some reason,
      // we should simply wait until the user is redirected *elsewhere*.
      // Timeout has been doubled here in attempt to quiet the flakiness
      await retry.waitForWithTimeout('URL redirects to finish', 40000, async () => {
        const urlBefore = await browser.getCurrentUrl();
        delay(1000);
        const urlAfter = await browser.getCurrentUrl();
        log.debug(`Expecting before URL '${urlBefore}' to equal after URL '${urlAfter}'`);
        return urlAfter === urlBefore;
      });

      const currentUrl = await browser.getCurrentUrl();

      // Logout might trigger multiple redirects, but in the end we expect the Cloud login page
      return currentUrl.includes('/login') || currentUrl.includes('/projects');
    },

    async login() {
      await this.forceLogout();

      // adding sleep to settle down logout
      await pageObjects.common.sleep(2500);

      await retry.waitForWithTimeout(
        'Waiting for successful authentication',
        90_000,
        async () => {
          if (!(await testSubjects.exists('loginUsername', { timeout: 1000 }))) {
            await this.navigateToLoginForm();

            await testSubjects.setValue('loginUsername', config.get('servers.kibana.username'));
            await testSubjects.setValue('loginPassword', config.get('servers.kibana.password'));
            await testSubjects.click('loginSubmit');
          }

          if (await testSubjects.exists('userMenuButton', { timeout: 10_000 })) {
            log.debug('userMenuButton is found, logged in passed');
            return true;
          } else {
            throw new Error(`Failed to login to Kibana via UI`);
          }
        },
        async () => {
          // Sometimes authentication fails and user is redirected to Cloud login page
          // [plugins.security.authentication] Authentication attempt failed: UNEXPECTED_SESSION_ERROR
          const currentUrl = await browser.getCurrentUrl();
          if (currentUrl.startsWith('https://cloud.elastic.co')) {
            log.debug(
              'Probably authentication attempt failed, we are at Cloud login page. Retrying from scratch'
            );
          } else {
            const authError = await testSubjects.exists('promptPage', { timeout: 2500 });
            if (authError) {
              log.debug('Probably SAML callback page, doing logout again');
              await pageObjects.security.forceLogout({ waitForLoginPage: false });
            } else {
              const isOnLoginPage = await testSubjects.exists('loginUsername', { timeout: 1000 });
              if (isOnLoginPage) {
                log.debug(
                  'Probably ES user profile activation failed, waiting 2 seconds and pressing Login button again'
                );
                await delay(2000);
                await testSubjects.click('loginSubmit');
              } else {
                log.debug('New behaviour, trying to navigate and login again');
              }
            }
          }
        }
      );
      log.debug('Logged in successfully');
    },

    async assertProjectHeaderExists() {
      await testSubjects.existOrFail('kibanaProjectHeader');
    },

    async clickUserAvatar() {
      testSubjects.click('userMenuAvatar');
    },

    async assertUserAvatarExists() {
      await testSubjects.existOrFail('userMenuAvatar');
    },

    async assertUserMenuExists() {
      await testSubjects.existOrFail('userMenu');
    },
  };
}
