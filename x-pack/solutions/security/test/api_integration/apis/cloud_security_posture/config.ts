/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import { getKibanaCliLoggers } from '@kbn/test';
import { CLOUD_SECURITY_PLUGIN_VERSION } from '@kbn/cloud-security-posture-common';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../../config.ts'));

  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('.')],
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        `--logging.loggers=${JSON.stringify([
          ...getKibanaCliLoggers(baseConfig.get('kbnTestServer.serverArgs')),
          {
            name: 'plugins.cloudSecurityPosture',
            level: 'all',
            appenders: ['default'],
          },
        ])}`,
        // Preconfigure the CSP package (fixed version) so Fleet installs it and
        // caches its archive in-process at Kibana startup. Without this the
        // first test that creates a CSP package policy pays a cold registry
        // download, which intermittently fails (404 / socket hang up) on the
        // first-loaded suite. Mirrors the cloud_security_posture_api config.
        `--xpack.fleet.packages.0.name=cloud_security_posture`,
        `--xpack.fleet.packages.0.version=${CLOUD_SECURITY_PLUGIN_VERSION}`,
      ],
    },
  };
}
