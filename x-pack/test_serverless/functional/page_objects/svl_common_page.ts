/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUrl } from '@kbn/test';
import { FtrProviderContext } from '../ftr_provider_context';

export function SvlCommonPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const config = getService('config');
  const pageObjects = getPageObjects(['security', 'common']);
  const retry = getService('retry');
  const deployment = getService('deployment');
  const log = getService('log');
  const browser = getService('browser');

  const delay = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  return {
    async navigateToApp(
      appName: string,
      {
        basePath = '',
        shouldLoginIfPrompted = true,
        path = '',
        hash = '',
        search = '',
        disableWelcomePrompt = true,
        insertTimestamp = true,
        retryOnFatalError = true,
      } = {}
    ) {
      let appUrl: string;

      if (config.has(['apps', appName])) {
        // Legacy applications
        const appConfig = config.get(['apps', appName]);
        appUrl = getUrl.noAuth(config.get('servers.kibana'), {
          pathname: `${basePath}${appConfig.pathname}`,
          hash: hash || appConfig.hash,
          search,
        });
      } else {
        appUrl = getUrl.noAuth(config.get('servers.kibana'), {
          pathname: `${basePath}/app/${appName}` + (path ? `/${path}` : ''),
          hash,
          search,
        });
      }

      log.debug('navigating to ' + appName + ' url: ' + appUrl);

      await retry.tryForTime(60_000 * 2, async () => {
        let lastUrl = await retry.try(async () => {
          // since we're using hash URLs, always reload first to force re-render
          log.debug('navigate to: ' + appUrl);
          await browser.get(appUrl, insertTimestamp);
          // accept alert if it pops up
          const alert = await browser.getAlert();
          await alert?.accept();
          await delay(700);
          let currentUrl = await browser.getCurrentUrl();

          if (currentUrl.includes('app/kibana')) {
            await testSubjects.find('kibanaChrome');
          }

          // If navigating to the `home` app, and we want to skip the Welcome page, but the chrome is still hidden,
          // set the relevant localStorage key to skip the Welcome page and throw an error to try to navigate again.
          // if (
          //   appName === 'home' &&
          //   currentUrl.includes('app/home') &&
          //   disableWelcomePrompt &&
          //   (await this.isWelcomeScreen())
          // ) {
          //   await this.browser.setLocalStorageItem('home:welcome:show', 'false');
          //   const msg = `Failed to skip the Welcome page when navigating the app ${appName}`;
          //   this.log.debug(msg);
          //   throw new Error(msg);
          // }

          currentUrl = (await browser.getCurrentUrl()).replace(/\/\/\w+:\w+@/, '//');

          const navSuccessful = currentUrl
            .replace(':80/', '/')
            .replace(':443/', '/')
            .startsWith(appUrl.replace(':80/', '/').replace(':443/', '/'));

          if (!navSuccessful) {
            const msg = `App failed to load: ${appName} in 60000 ms appUrl=${appUrl} currentUrl=${currentUrl}`;
            log.debug(msg);
            throw new Error(msg);
          }

          if (retryOnFatalError && (await pageObjects.common.isFatalErrorScreen())) {
            const msg = `Fatal error screen shown. Let's try refreshing the page once more.`;
            log.debug(msg);
            throw new Error(msg);
          }

          if (appName === 'discover') {
            await browser.setLocalStorageItem('data.autocompleteFtuePopover', 'true');
          }
          return currentUrl;
        });

        await retry.tryForTime(60_000, async () => {
          await delay(501);
          const currentUrl = await browser.getCurrentUrl();
          log.debug('in navigateTo url = ' + currentUrl);
          if (lastUrl !== currentUrl) {
            lastUrl = currentUrl;
            throw new Error('URL changed, waiting for it to settle');
          }
        });
      });
    },

    async navigateToLoginForm() {
      const url = deployment.getHostPort() + '/login';
      await browser.get(url);
      // ensure welcome screen won't be shown. This is relevant for environments which don't allow
      // to use the yml setting, e.g. cloud
      await browser.setLocalStorageItem('home:welcome:show', 'false');

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

          await testSubjects.existOrFail('userMenuButton', { timeout: 10_000 });
          await delay(2000);
          await browser.refresh();

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
