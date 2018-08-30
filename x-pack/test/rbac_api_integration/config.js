/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { resolveKibanaPath } from '@kbn/plugin-helpers';
import { EsProvider } from './services/es';

export default async function ({ readConfigFile }) {

  const config = {
    kibana: {
      api: await readConfigFile(resolveKibanaPath('test/api_integration/config.js')),
      functional: await readConfigFile(require.resolve('../../../test/functional/config.js'))
    },
    xpack: {
      api: await readConfigFile(require.resolve('../api_integration/config.js'))
    }
  };

  return {
    testFiles: [require.resolve('./apis')],
    servers: config.xpack.api.get('servers'),
    services: {
      es: EsProvider,
      esSupertestWithoutAuth: config.xpack.api.get('services.esSupertestWithoutAuth'),
      supertest: config.kibana.api.get('services.supertest'),
      supertestWithoutAuth: config.xpack.api.get('services.supertestWithoutAuth'),
      esArchiver: config.kibana.functional.get('services.esArchiver'),
      kibanaServer: config.kibana.functional.get('services.kibanaServer'),
    },
    junit: {
      reportName: 'X-Pack RBAC API Integration Tests',
    },

    // The saved_objects/basic archives are almost an exact replica of the ones in OSS
    // with the exception of a bogus "not-a-visualization" type that I added to make sure
    // the find filtering without a type specified worked correctly. Once we have the ability
    // to specify more granular access to the objects via the Kibana privileges, this should
    // no longer be necessary, and it's only required as long as we do read/all privileges.
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
