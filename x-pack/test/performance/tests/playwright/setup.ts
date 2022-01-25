/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import playwright, { ChromiumBrowser, Page } from 'playwright';

interface ITestSetup {
  browser: ChromiumBrowser;
  page: Page;
}

const headless = process.env.TEST_BROWSER_HEADLESS === '1';

export default async (): Promise<ITestSetup> => {
  const browser = await playwright.chromium.launch({ headless });
  const page = await browser.newPage({
    ignoreHTTPSErrors: true,
  });
  const client = await page.context().newCDPSession(page);

  await client.send('Network.clearBrowserCache');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await client.send('Network.emulateNetworkConditions', {
    latency: 100,
    downloadThroughput: 750_000,
    uploadThroughput: 750_000,
    offline: false,
  });
  await client.send('Security.setIgnoreCertificateErrors', { ignore: true });

  await page.route('**', (route) => route.continue());

  return { browser, page };
};
