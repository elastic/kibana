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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ({ getService, getPageObjects }: FtrProviderContext) {
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
      await page?.goto(`${kibanaUrl}`, { timeout: 180 * 1000 });
    });

    it('Login to Kibana', async () => {
      await sleep(2000);
      await page?.fill('[data-test-subj=loginUsername]', 'elastic', { timeout: 180 * 1000 });
      await sleep(2000);
      await page?.fill('[data-test-subj=loginPassword]', 'changeme');
      await sleep(2000);
      await page?.click('[data-test-subj=loginSubmit]');
    });

    it('Dismiss Synthetics Notice', async () => {
      await sleep(2000);
      await page?.click('[data-test-subj=skipWelcomeScreen]', { timeout: 180 * 1000 });
      await sleep(2000);
      await page?.locator('Welcome home');
    });
  });
}
