/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  const auditLogPlugin = resolve(__dirname, './fixtures/audit/audit_log');
  const auditLogPath = resolve(__dirname, './fixtures/audit/audit.log');

  return {
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
        '--xpack.security.audit.appender.kind=file',
        `--xpack.security.audit.appender.path=${auditLogPath}`,
        '--xpack.security.audit.appender.layout.kind=json',
      ],
    },
  };
}
