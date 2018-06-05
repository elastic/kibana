/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getReportingApiConfig } from './api';

export default async function ({ readConfigFile }) {

  const reportingApiConfig = await getReportingApiConfig({ readConfigFile });

  return {
    ...reportingApiConfig,
    junit: {
      reportName: 'X-Pack Chromium API Reporting Tests',
    },
    testFiles: [require.resolve('../api/chromium_tests')],
    kbnTestServer: {
      ...reportingApiConfig.kbnTestServer,
      serverArgs: [
        ...reportingApiConfig.kbnTestServer.serverArgs,
        `--xpack.reporting.capture.browser.type=chromium`,
        // Jenkins agents take about 30 seconds to spin up chromium on a first run because of some fontconfig cache
        // generation.
        `--xpack.reporting.queue.timeout=60000`,
        `--logging.verbose=true`,
      ],
    },
  };
}
