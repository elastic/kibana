/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { resolve } from 'path';
import { ReportingAPIProvider } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const apiConfig = await readConfigFile(require.resolve('../api_integration/config'));

  // config for testing network policy
  const testPolicyRules = [
    { allow: true, protocol: 'http:' },
    { allow: false, host: 'via.placeholder.com' },
    { allow: true, protocol: 'https:' },
    { allow: true, protocol: 'data:' },
    { allow: false },
  ];

  return {
    ...apiConfig.getAll(),
    junit: { reportName: 'X-Pack Reporting API Integration Tests' },
    testFiles: [resolve(__dirname, './reporting_and_security')],
    services: {
      ...apiConfig.get('services'),
      reportingAPI: ReportingAPIProvider,
    },
    kbnTestServer: {
      ...apiConfig.get('kbnTestServer'),
      serverArgs: [
        ...apiConfig.get('kbnTestServer.serverArgs'),
        `--xpack.screenshotting.networkPolicy.rules=${JSON.stringify(testPolicyRules)}`,
        `--xpack.reporting.capture.maxAttempts=1`,
        `--xpack.reporting.csv.maxSizeBytes=6000`,
        // for testing set buffer duration to 0 to immediately flush counters into saved objects.
        '--usageCollection.usageCounters.bufferDuration=0',
      ],
    },
  };
}
