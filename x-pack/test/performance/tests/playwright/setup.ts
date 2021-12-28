/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import playwright, { ChromiumBrowser, Page } from 'playwright';
import { NETWORK_PROFILES } from '../../../../../test/functional/services/remote/network_profiles';

interface ITestSetup {
  browser: ChromiumBrowser;
  page: Page;
}

const noCache = process.env.DISABLE_CACHE === '1';
const isThrottled = process.env.TEST_THROTTLE_NETWORK === '1';
const networkProfile = process.env.KBN_NETWORK_TEST_PROFILE || 'CLOUD_USER';
const headless = process.env.TEST_BROWSER_HEADLESS === '1';

export default async (): Promise<ITestSetup> => {
  const browser = await playwright.chromium.launch({ headless });
  const page = await browser.newPage();
  const client = await page.context().newCDPSession(page);

  if (isThrottled) {
    const {
      DOWNLOAD: downloadThroughput,
      UPLOAD: uploadThroughput,
      LATENCY: latency,
    } = NETWORK_PROFILES[`${networkProfile}`];

    await client.send('Network.emulateNetworkConditions', {
      latency,
      downloadThroughput,
      uploadThroughput,
      offline: false,
    });
  }

  if (noCache) {
    await client.send('Network.clearBrowserCache');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  }

  page.route('**', (route) => route.continue());

  return { browser, page };
};
