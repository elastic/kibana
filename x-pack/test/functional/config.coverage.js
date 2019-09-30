/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default async function ({ readConfigFile }) {
  const defaultConfig = await readConfigFile(require.resolve('./config'));

  return {
    ...defaultConfig.getAll(),

    kbnTestServer: {
      ...defaultConfig.get('kbnTestServer'),
      serverArgs: [
        ...defaultConfig.get('kbnTestServer.serverArgs'),
        '--optimize.sourceMaps=true',
        '--optimize.watchProxyTimeout=600000',
      ],
    },

    junit: {
      reportName: 'X-Pack Functional Tests with Code Coverage',
    },
  };
}
