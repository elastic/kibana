/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Url from 'url';
import { run as playwrightRun } from '@elastic/synthetics';

export default async function ({ getService }: any) {
  const config = getService('config');

  const kibanaUrl = Url.format({
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    port: config.get('servers.kibana.port'),
  });

  await import('./home');

  const result = await playwrightRun({
    params: { kibanaUrl },
    playwrightOptions: {
      headless: process.env.TEST_BROWSER_HEADLESS === '1',
      chromiumSandbox: false,
      timeout: 60 * 1000,
    },
  });

  if (result && result.perf_login_and_home.status !== 'succeeded') {
    throw new Error('Tests failed');
  }
}
