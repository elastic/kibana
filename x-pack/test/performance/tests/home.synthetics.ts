/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Url from 'url';
import { run as playwrightRun, journey, step } from '@elastic/synthetics';
import { FtrProviderContext } from '../ftr_provider_context';

journey('Inner Login', ({ page, params }) => {
  step('Go to Kibana login page', async () => {
    await page.goto(`${params.kibanaUrl}`, { waitUntil: 'networkidle' });
  });

  step('Login to Kibana', async () => {
    await page.fill('[data-test-subj=loginUsername]', 'elastic', { timeout: 60 * 1000 });
    await page.fill('[data-test-subj=loginPassword]', 'changeme');
    await page.click('[data-test-subj=loginSubmit]');
  });

  step('Dismiss Synthetics Notice', async () => {
    await page.click('[data-test-subj=skipWelcomeScreen]', { timeout: 60 * 1000 });
  });
});

export default function ({ getService }: FtrProviderContext) {
  const config = getService('config');

  describe('Outer Login', () => {
    it('login and navigate to homepage', async () => {
      const kibanaUrl = Url.format({
        protocol: config.get('servers.kibana.protocol'),
        hostname: config.get('servers.kibana.hostname'),
        port: config.get('servers.kibana.port'),
      });

      const res = await playwrightRun({
        params: { kibanaUrl },
        playwrightOptions: {
          headless: true,
          chromiumSandbox: false,
          timeout: 60 * 1000,
        },
      });

      return res;
    });
  });
}
