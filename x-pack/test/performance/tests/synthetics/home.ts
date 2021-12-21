/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { before, journey, step } from '@elastic/synthetics';
import { NETWORK_PROFILES } from '../../../../../test/functional/services/remote/network_profiles';

for (let i = 0; i < 10; i++) {
  journey('perf_login_and_home', async ({ page, params, client }) => {
    before(async () => {
      await client.send('Network.setCacheDisabled', { cacheDisabled: true });
      await client.send('Network.emulateNetworkConditions', {
        latency: NETWORK_PROFILES.CLOUD_USER.LATENCY,
        downloadThroughput: NETWORK_PROFILES.CLOUD_USER.DOWNLOAD,
        uploadThroughput: NETWORK_PROFILES.CLOUD_USER.UPLOAD,
        offline: false,
      });
    });

    step('Go to Kibana login page', async () => {
      await page.goto(`${params.kibanaUrl}`, { waitUntil: 'networkidle' });
    });

    step('Login to Kibana', async () => {
      await page.fill('[data-test-subj=loginUsername]', 'elastic', { timeout: 60 * 1000 });
      await page.fill('[data-test-subj=loginPassword]', 'changeme');
      await page.click('[data-test-subj=loginSubmit]');
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    });

    step('Dismiss Synthetics Notice', async () => {
      await page.click('[data-test-subj=skipWelcomeScreen]', { timeout: 60 * 1000 });
      await page.locator('Welcome home');
    });
  });
}
