/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Url from 'url';
import { FtrProviderContext } from '../ftr_provider_context';

export function SvlCommonPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const config = getService('config');
  const pageObjects = getPageObjects(['security', 'common']);
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const browser = getService('browser');

  const delay = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  return {
    async login() {
      await pageObjects.security.forceLogout({ waitForLoginPage: false });

      // adding sleep to settle down logout
      await pageObjects.common.sleep(2500);

      await retry.waitForWithTimeout(
        'Login successfully via API',
        10_000,
        async () => {
          const response = await kibanaServer.request({
            method: 'POST',
            path: Url.format({
              protocol: config.get('servers.kibana.protocol'),
              hostname: config.get('servers.kibana.hostname'),
              port: config.get('servers.kibana.port'),
              pathname: 'internal/security/login',
            }),
            body: {
              providerType: 'basic',
              providerName: 'cloud-basic',
              currentURL: Url.format({
                protocol: config.get('servers.kibana.protocol'),
                hostname: config.get('servers.kibana.hostname'),
                port: config.get('servers.kibana.port'),
                pathname: 'login',
              }),
              params: {
                username: config.get('servers.kibana.username'),
                password: config.get('servers.kibana.password'),
              },
            },
          });
          if (response.status !== 200) {
            throw new Error(
              `Login via API failed with status ${response.status}, but expected 200`
            );
          } else {
            return true;
          }
        },
        async () => {
          log.debug('Waiting 2000 ms before retry');
          await delay(2000);
        }
      );

      await retry.waitForWithTimeout('Login to Kibana via UI', 90_000, async () => {
        await pageObjects.common.navigateToUrl('login');
        // ensure welcome screen won't be shown. This is relevant for environments which don't allow
        // to use the yml setting, e.g. cloud
        await browser.setLocalStorageItem('home:welcome:show', 'false');

        log.debug('Waiting for Login Form to appear.');
        await retry.waitForWithTimeout('login form', 10_000, async () => {
          return await pageObjects.security.isLoginFormVisible();
        });

        await testSubjects.setValue('loginUsername', config.get('servers.kibana.username'));
        await testSubjects.setValue('loginPassword', config.get('servers.kibana.password'));
        await testSubjects.click('loginSubmit');

        if (await testSubjects.exists('userMenuButton', { timeout: 10_000 })) {
          return true;
        } else {
          // Sometimes authentication fails and user is redirected to Cloud login page
          // [plugins.security.authentication] Authentication attempt failed: UNEXPECTED_SESSION_ERROR
          const currentUrl = await browser.getCurrentUrl();
          throw new Error(`Failed to login, currentUrl=${currentUrl}`);
        }
      });
    },

    async forceLogout() {
      await pageObjects.security.forceLogout({ waitForLoginPage: false });
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
