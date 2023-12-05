/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SvlCommonPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
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
      await retry.waitForWithTimeout(
        `Logging in by setting browser cookie for '${role}' role`,
        30_000,
        async () => {
          log.debug(`Delete all the cookies in the current browser context`);
          await browser.deleteAllCookies();
          log.debug(`Setting the cookie for '${role}' role`);
          const sidCookie = await svlUserManager.getSessionCookieForRole(role);
          // Loading bootstrap.js in order to be on the domain that the cookie will be set for.
          await browser.get(deployment.getHostPort() + '/bootstrap.js');
          await browser.setCookie('sid', sidCookie);
          // Cookie should be already set in the browsing context, navigating to the Home page
          await browser.get(deployment.getHostPort());
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
            .set('Cookie', `sid=${browserCookies[0].value}`);

          const userData = await svlUserManager.getUserData(role);
          // email returned from API call must match the email for the specified role
          if (body.email === userData.email) {
            log.debug(`The new cookie is properly set for  '${role}' role`);
            return true;
          } else {
            throw new Error(
              `Cookie is not set properly, expected email is '${userData.email}', but found '${body.email}'`
            );
          }
        }
      );
    },

    async navigateToLoginForm() {
      const url = deployment.getHostPort() + '/login';
      await browser.get(url);
      log.debug('Waiting for Login Form to appear.');
      await retry.waitForWithTimeout('login form', 10_000, async () => {
        return await pageObjects.security.isLoginFormVisible();
      });
    },

    async login() {
      await pageObjects.security.forceLogout({ waitForLoginPage: false });

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

    async forceLogout() {
      await pageObjects.security.forceLogout({ waitForLoginPage: false });
      log.debug('Logged out successfully');
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
