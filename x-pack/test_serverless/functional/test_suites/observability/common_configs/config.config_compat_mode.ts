/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseTestConfig = await readConfigFile(require.resolve('../config.ts'));

  return {
    ...baseTestConfig.getAll(),
    testFiles: [require.resolve('../../common/strip_unknown_config_workaround')],
    kbnTestServer: {
      ...baseTestConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseTestConfig.get('kbnTestServer.serverArgs'),

        // Enable config compatibility mode. This is how it is run in the actual serverless deployments.
        // However, in dev mode and CI, we run Kibana with this flag disabled to catch unintended misconfigurations.
        '--core.enableStripUnknownConfigWorkaround=true',

        // Intentionally invalid setting, setting a key that doesn't exist
        '--elasticsearch.unknown.key=1',
      ],
    },
    junit: {
      reportName: 'Serverless Observability Functional Tests - Common Config Compat Mode',
    },
  };
}
