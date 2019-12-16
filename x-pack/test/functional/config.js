/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable import/no-default-export */

import { resolve } from 'path';

import { services } from './services';
import { pageObjects } from './page_objects';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function({ readConfigFile }) {
  const kibanaCommonConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('../../../test/functional/config.js')
  );

  return {
    // list paths to the files that contain your plugins tests
    testFiles: [
      resolve(__dirname, './apps/advanced_settings'),
      resolve(__dirname, './apps/canvas'),
      resolve(__dirname, './apps/graph'),
      resolve(__dirname, './apps/monitoring'),
      resolve(__dirname, './apps/watcher'),
      resolve(__dirname, './apps/dashboard'),
      resolve(__dirname, './apps/dashboard_mode'),
      resolve(__dirname, './apps/discover'),
      resolve(__dirname, './apps/security'),
      resolve(__dirname, './apps/spaces'),
      resolve(__dirname, './apps/lens'),
      resolve(__dirname, './apps/logstash'),
      resolve(__dirname, './apps/grok_debugger'),
      resolve(__dirname, './apps/infra'),
      resolve(__dirname, './apps/machine_learning'),
      resolve(__dirname, './apps/rollup_job'),
      resolve(__dirname, './apps/maps'),
      resolve(__dirname, './apps/status_page'),
      resolve(__dirname, './apps/timelion'),
      resolve(__dirname, './apps/upgrade_assistant'),
      resolve(__dirname, './apps/visualize'),
      resolve(__dirname, './apps/uptime'),
      resolve(__dirname, './apps/saved_objects_management'),
      resolve(__dirname, './apps/dev_tools'),
      resolve(__dirname, './apps/apm'),
      resolve(__dirname, './apps/index_patterns'),
      resolve(__dirname, './apps/index_management'),
      resolve(__dirname, './apps/index_lifecycle_management'),
      resolve(__dirname, './apps/snapshot_restore'),
      resolve(__dirname, './apps/cross_cluster_replication'),
      resolve(__dirname, './apps/remote_clusters'),
      resolve(__dirname, './apps/transform'),
      // This license_management file must be last because it is destructive.
      resolve(__dirname, './apps/license_management'),
    ],

    services,
    pageObjects,

    servers: kibanaFunctionalConfig.get('servers'),

    esTestCluster: {
      license: 'trial',
      from: 'snapshot',
      serverArgs: [],
    },

    kbnTestServer: {
      ...kibanaCommonConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaCommonConfig.get('kbnTestServer.serverArgs'),
        '--status.allowAnonymous=true',
        '--server.uuid=5b2de169-2785-441b-ae8c-186a1936b17d',
        '--xpack.maps.showMapsInspectorAdapter=true',
        '--xpack.maps.preserveDrawingBuffer=true',
        '--xpack.reporting.queue.pollInterval=3000', // make it explicitly the default
        '--xpack.reporting.csv.maxSizeBytes=2850', // small-ish limit for cutting off a 1999 byte report
        '--stats.maximumWaitTimeForAllCollectorsInS=1',
        '--xpack.security.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"', // server restarts should not invalidate active sessions
        '--xpack.encryptedSavedObjects.encryptionKey="DkdXazszSCYexXqz4YktBGHCRkV6hyNK"',
        '--telemetry.banner=false',
        '--timelion.ui.enabled=true',
      ],
    },
    uiSettings: {
      defaults: {
        'accessibility:disableAnimations': true,
        'dateFormat:tz': 'UTC',
      },
    },
    // the apps section defines the urls that
    // `PageObjects.common.navigateTo(appKey)` will use.
    // Merge urls for your plugin with the urls defined in
    // Kibana's config in order to use this helper
    apps: {
      ...kibanaFunctionalConfig.get('apps'),
      lens: {
        pathname: '/app/lens',
      },
      login: {
        pathname: '/login',
      },
      monitoring: {
        pathname: '/app/monitoring',
      },
      logstashPipelines: {
        pathname: '/app/kibana',
        hash: '/management/logstash/pipelines',
      },
      maps: {
        pathname: '/app/maps',
      },
      graph: {
        pathname: '/app/graph',
      },
      grokDebugger: {
        pathname: '/app/kibana',
        hash: '/dev_tools/grokdebugger',
      },
      searchProfiler: {
        pathname: '/app/kibana',
        hash: '/dev_tools/searchprofiler',
      },
      spaceSelector: {
        pathname: '/',
      },
      infraOps: {
        pathname: '/app/infra',
      },
      infraLogs: {
        pathname: '/app/infra',
        hash: '/logs',
      },
      canvas: {
        pathname: '/app/canvas',
        hash: '/',
      },
      code: {
        pathname: '/app/code',
        hash: '/admin',
      },
      codeSearch: {
        pathname: '/app/code',
        hash: '/search',
      },
      uptime: {
        pathname: '/app/uptime',
      },
      apm: {
        pathname: '/app/apm',
      },
      ml: {
        pathname: '/app/ml',
      },
      rollupJob: {
        pathname: '/app/kibana',
        hash: '/management/elasticsearch/rollup_jobs/',
      },
      licenseManagement: {
        pathname: '/app/kibana',
        hash: '/management/elasticsearch/license_management',
      },
      indexManagement: {
        pathname: '/app/kibana',
        hash: '/management/elasticsearch/index_management',
      },
      indexLifecycleManagement: {
        pathname: '/app/kibana',
        hash: '/management/elasticsearch/index_lifecycle_management',
      },
      snapshotRestore: {
        pathname: '/app/kibana',
        hash: '/management/elasticsearch/snapshot_restore',
      },
      crossClusterReplication: {
        pathname: '/app/kibana',
        hash: '/management/elasticsearch/cross_cluster_replication',
      },
      remoteClusters: {
        pathname: '/app/kibana',
        hash: '/management/elasticsearch/remote_clusters',
      },
      apm: {
        pathname: '/app/apm',
      },
      watcher: {
        pathname: '/app/kibana',
        hash: '/management/elasticsearch/watcher/watches/',
      },
      transform: {
        pathname: '/app/kibana/',
        hash: '/management/elasticsearch/transform',
      },
    },

    // choose where esArchiver should load archives from
    esArchiver: {
      directory: resolve(__dirname, 'es_archives'),
    },

    // choose where screenshots should be saved
    screenshots: {
      directory: resolve(__dirname, 'screenshots'),
    },

    junit: {
      reportName: 'Chrome X-Pack UI Functional Tests',
    },
    security: {
      roles: {
        test_logstash_reader: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['logstash*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },
      },
      defaultRoles: ['superuser'],
    },
  };
}
