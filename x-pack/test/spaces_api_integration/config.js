/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { resolveKibanaPath } from '@kbn/plugin-helpers';

export default async function ({ readConfigFile }) {

  const config = {
    kibana: {
      api: await readConfigFile(resolveKibanaPath('test/api_integration/config.js')),
      common: await readConfigFile(require.resolve('../../../test/common/config.js')),
      functional: await readConfigFile(require.resolve('../../../test/functional/config.js'))
    },
    xpack: {
      api: await readConfigFile(require.resolve('../api_integration/config.js')),
      functional: await readConfigFile(require.resolve('../functional/config.js'))
    }
  };

  return {
    testFiles: [require.resolve('./apis')],
    servers: config.xpack.api.get('servers'),
    services: {
      es: config.kibana.common.get('services.es'),
      supertest: config.kibana.api.get('services.supertest'),
      supertestWithoutAuth: config.xpack.api.get('services.supertestWithoutAuth'),
      esArchiver: config.kibana.functional.get('services.esArchiver'),
    },
    junit: {
      reportName: 'X-Pack Spaces API Integration Tests',
    },

    esArchiver: {
      directory: path.join(__dirname, 'fixtures', 'es_archiver')
    },

    esTestCluster: {
      ...config.xpack.api.get('esTestCluster'),
      serverArgs: [
        ...config.xpack.api.get('esTestCluster.serverArgs'),
      ],
    },

    kbnTestServer: {
      ...config.xpack.api.get('kbnTestServer'),
      serverArgs: [
        ...config.xpack.api.get('kbnTestServer.serverArgs'),
        '--optimize.enabled=false',
        '--server.xsrf.disableProtection=true',
      ],
    },
  };
}
