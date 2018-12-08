/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestInvoker } from '../common/types';
import { UICapabilitiesProvider } from './services';

// tslint:disable:no-default-export
export default async function({ readConfigFile }: TestInvoker) {
  const xPackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../functional/config.js')
  );

  return {
    services: {
      uiCapabilities: UICapabilitiesProvider,
    },
    pageObjects: {},
    servers: xPackFunctionalTestsConfig.get('servers'),
    esTestCluster: xPackFunctionalTestsConfig.get('esTestCluster'),
    apps: {},
    esArchiver: {},
    junit: {
      reportName: 'X-Pack UI Capabilities Functional Tests',
    },
    kbnTestServer: xPackFunctionalTestsConfig.get('kbnTestServer'),
    testFiles: [require.resolve('./tests')],
  };
}
