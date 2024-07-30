/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { resolve } from 'path';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaAPITestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/api_integration/config')
  );
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  const auditLogPath = resolve(__dirname, './plugins/audit_log/anonymous.log');

  return {
    testFiles: [require.resolve('./tests/anonymous')],
    servers: xPackAPITestsConfig.get('servers'),
    security: { disableTestUser: true },
    services: {
      ...kibanaAPITestsConfig.get('services'),
      ...xPackAPITestsConfig.get('services'),
    },
    junit: {
      reportName: 'X-Pack Security API Integration Tests (Anonymous with Username and Password)',
    },

    esTestCluster: { ...xPackAPITestsConfig.get('esTestCluster') },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--xpack.security.authc.selector.enabled=false`,
        `--xpack.security.authc.providers=${JSON.stringify({
          anonymous: {
            anonymous1: {
              order: 0,
              credentials: { username: 'anonymous_user', password: 'changeme' },
            },
          },
          basic: { basic1: { order: 1 } },
        })}`,
        '--xpack.security.audit.enabled=true',
        '--xpack.security.audit.appender.type=file',
        `--xpack.security.audit.appender.fileName=${auditLogPath}`,
        '--xpack.security.audit.appender.layout.type=json',
        `--xpack.security.audit.ignore_filters=${JSON.stringify([
          { actions: ['http_request'] },
          { categories: ['database'] },
        ])}`,
      ],
    },
  };
}
