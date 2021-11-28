/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step } from '@elastic/synthetics';

journey('perf_login_and_home', ({ page, params }) => {
  step('Go to Kibana login page', async () => {
    await page.goto(`${params.kibanaUrl}`, { waitUntil: 'networkidle' });
  });

  step('Login to Kibana', async () => {
    await page.fill('[data-test-subj=loginUsername]', 'elastic', { timeout: 60 * 1000 * 10 });
    await page.fill('[data-test-subj=loginPassword]', 'changeme');
    await page.click('[data-test-subj=loginSubmit]');
  });

  step('Dismiss Synthetics Notice', async () => {
    await page.click('[data-test-subj=skipWelcomeScreen]', { timeout: 60 * 1000 });
  });
});
