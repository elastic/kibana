/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { resolve } from 'path';
import { getKibanaCliLoggers, type FtrConfigProviderContext } from '@kbn/test';
import { CLOUD_SECURITY_PLUGIN_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    ...xPackAPITestsConfig.getAll(),
    testFiles: [resolve(__dirname, './routes'), resolve(__dirname, './telemetry')],
    junit: {
      reportName: 'X-Pack Cloud Security Posture API Tests',
    },
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--logging.loggers=${JSON.stringify([
          ...getKibanaCliLoggers(xPackAPITestsConfig.get('kbnTestServer.serverArgs')),
          {
            name: 'plugins.cloudSecurityPosture',
            level: 'all',
            appenders: ['default'],
          },
        ])}`,
        /**
         * Package version is fixed (not latest) so FTR won't suddenly break when package is changed.
         *
         * test a new package:
         * 1. build the package and start the registry with elastic-package and uncomment the 'registryUrl' flag below
         * 2. locally checkout the kibana version that matches the new package
         * 3. update the package version below to use the new package version
         * 4. run tests with NODE_EXTRA_CA_CERTS pointing to the elastic-package certificate. example:
         *  NODE_EXTRA_CA_CERTS=HOME/.elastic-package/profiles/default/certs/kibana/ca-cert.pem  yarn start
         * 5. when test pass:
         *   1. release a new package to EPR
         *   2. merge the updated version number change to kibana
         */
        `--xpack.fleet.packages.0.name=cloud_security_posture`,
        `--xpack.fleet.packages.0.version=${CLOUD_SECURITY_PLUGIN_VERSION}`,
        // `--xpack.fleet.registryUrl=https://localhost:8080`,
        // Enables /internal/cloud_security_posture/graph API
        `--uiSettings.overrides.securitySolution:enableGraphVisualization=true`,
      ],
    },
  };
}
