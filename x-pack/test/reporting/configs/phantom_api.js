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
      reportName: 'X-Pack Phantom API Reporting Tests',
    },
    testFiles: [
      require.resolve('../api/phantom_tests'),
    ],
    kbnTestServer: {
      ...reportingApiConfig.kbnTestServer,
      serverArgs: [
        ...reportingApiConfig.kbnTestServer.serverArgs,
        `--xpack.reporting.capture.browser.type=phantom`,
      ],
    },
  };
}
