/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Url from 'url';
import { ChromiumBrowser, Page } from 'playwright';
import testSetup from './setup';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('perf_login_and_home', () => {
    const config = getService('config');
    const kibanaUrl = Url.format({
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: config.get('servers.kibana.port'),
    });

    let page: Page | null = null;
    let browser: ChromiumBrowser | null = null;

    before(async () => {
      const context = await testSetup();
      page = context.page;
      browser = context.browser;
    });

    after(async () => {
      await browser?.close();
    });

    it('Go to Kibana login page', async () => {
      await page?.goto(`${kibanaUrl}`);
    });

    it('Login to Kibana', async () => {
      const usernameLocator = page?.locator('[data-test-subj=loginUsername]');
      const passwordLocator = page?.locator('[data-test-subj=loginPassword]');
      const submitButtonLocator = page?.locator('[data-test-subj=loginSubmit]');

      await usernameLocator?.type('elastic', { delay: 500 });
      await passwordLocator?.type('changeme', { delay: 500 });
      await submitButtonLocator?.click({ delay: 1000 });
    });

    it('Dismiss Welcome Screen', async () => {
      await page?.waitForLoadState();
      const skipButtonLocator = page?.locator('[data-test-subj=skipWelcomeScreen]');
      await skipButtonLocator?.click({ delay: 1000 });
      await page?.waitForLoadState('networkidle');
    });
  });
}
