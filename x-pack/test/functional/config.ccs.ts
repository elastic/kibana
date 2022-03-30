/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';
import { RemoteEsArchiverProvider } from '.services/remote_es/remote_es_archiver';
import { RemoteEsProvider } from '.services/remote_es/remote_es';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('./config'));

  return {
    ...functionalConfig.getAll(),

    testFiles: [require.resolve('./apps/lens')],

    services,

    junit: {
      reportName: 'X-Pack CCS Tests',
    },

    security: {
      ...functionalConfig.get('security'),
      remoteEsRoles: {
        ccs_remote_search: {
          indices: [
            {
              names: ['*'],
              privileges: ['read', 'view_index_metadata', 'read_cross_cluster'],
            },
          ],
        },
      },
      defaultRoles: [...(functionalConfig.get('security.defaultRoles') ?? []), 'ccs_remote_search'],
    },

    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      ccs: {
        remoteClusterUrl:
          process.env.REMOTE_CLUSTER_URL ??
          'http://elastic:changeme@localhost:' +
            `${functionalConfig.get('servers.elasticsearch.port') + 1}`,
      },
    },
    services: {
      ...functionalConfig.get('services'),
      remoteEs: RemoteEsProvider,
      remoteEsArchiver: RemoteEsArchiverProvider,
    },
  };
}
