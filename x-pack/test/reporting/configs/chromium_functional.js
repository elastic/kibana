/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFunctionalConfig } from './functional';

export default async function ({ readConfigFile }) {

  const functionalConfig = await getFunctionalConfig({ readConfigFile });

  return {
    ...functionalConfig,
    junit: {
      reportName: 'X-Pack Chromium Functional Reporting Tests',
    },
    testFiles: [require.resolve('../functional')],
    kbnTestServer: {
      ...functionalConfig.kbnTestServer,
      serverArgs: [
        ...functionalConfig.kbnTestServer.serverArgs,
        '--xpack.reporting.csv.enablePanelActionDownload=true',
        `--xpack.reporting.capture.browser.type=chromium`,
      ],
    },
  };
}
