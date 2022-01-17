/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Url from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function login({ getService }: FtrProviderContext) {
  describe('Login Page', () => {
    const config = getService('config');
    const playwright = getService('playwright');
    const { page } = playwright.makePage({ autoLogin: false, journeyName: 'login' });

    it('Go to Kibana login page', async () => {
      const kibanaUrl = Url.format({
        protocol: config.get('servers.kibana.protocol'),
        hostname: config.get('servers.kibana.hostname'),
        port: config.get('servers.kibana.port'),
      });

      await page?.goto(kibanaUrl);
    });

    it('Login to Kibana', async () => {
      const usernameLocator = page.locator('[data-test-subj=loginUsername]');
      const passwordLocator = page.locator('[data-test-subj=loginPassword]');
      const submitButtonLocator = page.locator('[data-test-subj=loginSubmit]');

      const noDelayOnUserActions = process.env.TEST_DONT_DELAY_USER_ACTIONS === 'true';

      await usernameLocator?.type('elastic', { delay: noDelayOnUserActions ? 0 : 500 });
      await passwordLocator?.type('changeme', { delay: noDelayOnUserActions ? 0 : 500 });
      await submitButtonLocator?.click({ delay: noDelayOnUserActions ? 0 : 1000 });
      await page.waitForSelector('#headerUserMenu');
    });
  });
}
