/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  const auditLogPlugin = resolve(__dirname, './plugins/audit_log');
  const auditLogPath = resolve(__dirname, './plugins/audit_log/audit.log');

  return {
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    testFiles: [require.resolve('./tests/audit')],
    servers: xPackAPITestsConfig.get('servers'),
    security: { disableTestUser: true },
    services: xPackAPITestsConfig.get('services'),
    junit: {
      reportName: 'X-Pack Security API Integration Tests (Audit Log)',
    },
    esTestCluster: xPackAPITestsConfig.get('esTestCluster'),
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${auditLogPlugin}`,
        '--xpack.security.audit.enabled=true',
        '--xpack.security.audit.appender.type=file',
        `--xpack.security.audit.appender.fileName=${auditLogPath}`,
        '--xpack.security.audit.appender.layout.type=json',
      ],
    },
  };
}
