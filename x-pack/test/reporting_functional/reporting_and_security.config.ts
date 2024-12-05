/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { resolve } from 'path';
import { ReportingAPIProvider } from '../reporting_api_integration/services';
import { ReportingFunctionalProvider } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js')); // Reporting API tests need a fully working UI
  const apiConfig = await readConfigFile(require.resolve('../api_integration/config'));

  return {
    ...apiConfig.getAll(),
    ...functionalConfig.getAll(),
    junit: { reportName: 'X-Pack Reporting Functional Tests' },
    testFiles: [resolve(__dirname, './reporting_and_security')],
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        `--xpack.reporting.capture.maxAttempts=1`,
        `--xpack.reporting.csv.maxSizeBytes=6000`,
      ],
    },
    services: {
      ...apiConfig.get('services'),
      ...functionalConfig.get('services'),
      reportingAPI: ReportingAPIProvider,
      reportingFunctional: ReportingFunctionalProvider,
    },
  };
}
