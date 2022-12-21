/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { RemoteEsArchiverProvider } from './services/remote_es/remote_es_archiver';
import { RemoteEsProvider } from './services/remote_es/remote_es';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('./config.base.js'));

  return {
    ...functionalConfig.getAll(),

    testFiles: [
      require.resolve('./apps/canvas'),
      require.resolve('./apps/lens/group1'),
      require.resolve('./apps/remote_clusters/ccs/remote_clusters_index_management_flow'),
      require.resolve('./apps/rollup_job'),
      require.resolve('./apps/ml/anomaly_detection_jobs'),
    ],

    junit: {
      reportName: 'X-Pack CCS Tests',
    },

    security: {
      ...functionalConfig.get('security'),
      remoteEsRoles: {
        ccs_remote_search: {
          cluster: ['manage', 'manage_ccr'],
          indices: [
            {
              names: ['*'],
              privileges: ['read', 'view_index_metadata', 'read_cross_cluster', 'monitor'],
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
