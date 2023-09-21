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
  const pageObjects = getPageObjects(['security']);
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

      await retry.waitForWithTimeout(
        'Login successfully via API',
        10_000,
        async () => {
          const response = await kibanaServer.request({
            method: 'POST',
            path: Url.format({
              protocol: config.get('servers.kibana.protocol'),
              hostname: config.get('servers.kibana.hostname'),
              pathname: 'internal/security/login',
            }),
            body: {
              providerType: 'basic',
              providerName: 'cloud-basic',
              currentURL: Url.format({
                protocol: config.get('servers.kibana.protocol'),
                hostname: config.get('servers.kibana.hostname'),
                pathname: 'login',
              }),
              params: {
                username: config.get('servers.kibana.username'),
                password: config.get('servers.kibana.password'),
              },
            },
          });
          log.debug(`Login via API completed with status: ${response.status}`);
          return response.status === 200;
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
