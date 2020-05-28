/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Url from 'url';

import { withProcRunner } from '@kbn/dev-utils';
import { FtrProviderContext } from './../functional/ftr_provider_context';
import { navigateToApp } from './../../../src/dev/loading_time_performance/navigation';
import { ingestPerformanceMetrics } from './../../../src/dev/loading_time_performance/ingest_metrics';

export async function PuppeteerTestRunner({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');

  const options = {
    headless: false,
    appConfig: {
      url: Url.format(config.get('servers.kibana')),
      login: config.get('servers.kibana.username'),
      password: config.get('servers.kibana.password'),
    },
  };

  await withProcRunner(log, async () => {
    const responses = await navigateToApp(log, options);
    ingestPerformanceMetrics(log, responses);
  });
}
