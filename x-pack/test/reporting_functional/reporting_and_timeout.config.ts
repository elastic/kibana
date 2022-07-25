/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { resolve } from 'path';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('./reporting_and_security.config'));

  return {
    ...functionalConfig.getAll(),
    junit: { reportName: 'X-Pack Reporting Functional Tests: Reports and Timeout Handling' },
    testFiles: [resolve(__dirname, './reporting_and_timeout')],
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        `--xpack.reporting.capture.timeouts.waitForElements=1s`,
      ],
    },
  };
}
