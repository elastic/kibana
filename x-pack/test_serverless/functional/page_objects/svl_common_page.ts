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

      return await pageObjects.security.login(
        config.get('servers.kibana.username'),
        config.get('servers.kibana.password')
      );
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
