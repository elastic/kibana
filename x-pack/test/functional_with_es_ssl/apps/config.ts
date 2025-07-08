/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { resolve } from 'path';
import { pageObjects, services } from '../ftr_provider_context';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack-platform/functional_with_es_ssl/config.base')
  );

  return {
    ...baseConfig.getAll(),
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        '--uiSettings.overrides.observability:enableLegacyUptimeApp=true',
      ],
    },
    testFiles: [resolve(__dirname, './uptime')],
    pageObjects,
    services,
    junit: {
      reportName: 'Chrome X-Pack UI Functional Tests with ES SSL - Uptime',
    },
  };
}
