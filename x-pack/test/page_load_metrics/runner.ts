/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CiStatsReporter } from '@kbn/dev-utils';
import { capturePageLoadMetrics } from '@kbn/test';
// @ts-ignore not TS yet
import getUrl from '../../../src/test_utils/get_url';

import { FtrProviderContext } from './../functional/ftr_provider_context';

export async function PuppeteerTestRunner({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  const esArchiver = getService('esArchiver');

  await esArchiver.load('default');
  const metrics = await capturePageLoadMetrics(log, {
    headless: true,
    appConfig: {
      url: getUrl.baseUrl(config.get('servers.kibana')),
      username: config.get('servers.kibana.username'),
      password: config.get('servers.kibana.password'),
    },
    screenshotsDir: config.get('screenshots.directory'),
  });
  const reporter = CiStatsReporter.fromEnv(log);

  log.debug('Report page load asset size');
  await reporter.metrics(metrics);
}
