/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import type { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from './page_objects';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  return {
    ...xpackFunctionalConfig.getAll(),
    pageObjects,
    testFiles: [resolve(__dirname, './pages')],
    junit: {
      reportName: 'X-Pack Cloud Security Posture Functional Tests',
    },
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        /**
         * Package version is fixed (not latest) so FTR won't suddenly break when package is changed.
         *
         * test a new package:
         * 1. build the package and start the registry with elastic-package and uncomment the 'registryUrl' flag below
         * 2. locally checkout the kibana version that matches the new package
         * 3. update the package version below to use the new package version
         * 4. run tests with NODE_EXTRA_CA_CERTS pointing to the elastic-package certificate
         * 5. when test pass:
         *   1. release a new package to EPR
         *   2. merge the updated version number change to kibana
         */
        `--xpack.fleet.packages.0.name=cloud_security_posture`,
        `--xpack.fleet.packages.0.version=1.0.8`,
        // `--xpack.fleet.registryUrl=https://localhost:8080`,
      ],
    },
  };
}
