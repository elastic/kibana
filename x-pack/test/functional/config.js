/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

import { services } from './services';
import { pageObjects } from './page_objects';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }) {
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
      resolve(__dirname, './apps/ml'),
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
      resolve(__dirname, './apps/api_keys'),
      resolve(__dirname, './apps/index_patterns'),
      resolve(__dirname, './apps/index_management'),
      resolve(__dirname, './apps/index_lifecycle_management'),
      resolve(__dirname, './apps/ingest_pipelines'),
      resolve(__dirname, './apps/snapshot_restore'),
      resolve(__dirname, './apps/cross_cluster_replication'),
      resolve(__dirname, './apps/remote_clusters'),
      resolve(__dirname, './apps/transform'),
      resolve(__dirname, './apps/reporting_management'),

      // This license_management file must be last because it is destructive.
      resolve(__dirname, './apps/license_management'),
    ],

    services,
    pageObjects,

    servers: kibanaFunctionalConfig.get('servers'),

    esTestCluster: {
      license: 'trial',
      from: 'snapshot',
      serverArgs: ['path.repo=/tmp/', 'xpack.security.authc.api_key.enabled=true'],
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
        pathname: '/app/management/ingest/pipelines',
      },
      maps: {
        pathname: '/app/maps',
      },
      graph: {
        pathname: '/app/graph',
      },
      grokDebugger: {
        pathname: '/app/dev_tools',
        hash: '/grokdebugger',
      },
      searchProfiler: {
        pathname: '/app/dev_tools',
        hash: '/searchprofiler',
      },
      spaceSelector: {
        pathname: '/',
      },
      infraOps: {
        pathname: '/app/metrics',
      },
      infraLogs: {
        pathname: '/app/logs',
      },
      canvas: {
        pathname: '/app/canvas',
        hash: '/',
      },
      uptime: {
        pathname: '/app/uptime',
      },
      ml: {
        pathname: '/app/ml',
      },
      roleMappings: {
        pathname: '/app/management/security/role_mappings',
      },
      rollupJob: {
        pathname: '/app/management/data/rollup_jobs',
      },
      apiKeys: {
        pathname: '/app/management/security/api_keys',
      },
      licenseManagement: {
        pathname: '/app/management/stack/license_management',
      },
      indexManagement: {
        pathname: '/app/management/data/index_management',
      },
      indexLifecycleManagement: {
        pathname: '/app/management/data/index_lifecycle_management',
      },
      ingestPipelines: {
        pathname: '/app/management/ingest/ingest_pipelines',
      },
      snapshotRestore: {
        pathname: '/app/management/data/snapshot_restore',
      },
      remoteClusters: {
        pathname: '/app/management/data/remote_clusters',
      },
      crossClusterReplication: {
        pathname: '/app/management/data/cross_cluster_replication',
      },
      apm: {
        pathname: '/app/apm',
      },
      watcher: {
        pathname: '/app/management/insightsAndAlerting/watcher/watches',
      },
      transform: {
        pathname: '/app/management/data/transform',
      },
      reporting: {
        pathname: '/app/management/insightsAndAlerting/reporting',
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

        global_discover_read: {
          kibana: [
            {
              feature: {
                discover: ['read'],
              },
              spaces: ['*'],
            },
          ],
        },
        global_visualize_read: {
          kibana: [
            {
              feature: {
                visualize: ['read'],
              },
              spaces: ['*'],
            },
          ],
        },
        global_visualize_all: {
          kibana: [
            {
              feature: {
                visualize: ['all'],
              },
              spaces: ['*'],
            },
          ],
        },
        global_maps_all: {
          kibana: [
            {
              feature: {
                maps: ['all'],
              },
              spaces: ['*'],
            },
          ],
        },

        geoshape_data_reader: {
          elasticsearch: {
            indices: [
              {
                names: ['geo_shapes*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
        },

        global_devtools_read: {
          kibana: [
            {
              feature: {
                dev_tools: ['read'],
              },
              spaces: ['*'],
            },
          ],
        },

        global_ccr_role: {
          elasticsearch: {
            cluster: ['manage', 'manage_ccr'],
          },
          kibana: [
            {
              feature: {
                discover: ['read'],
              },
              spaces: ['*'],
            },
          ],
        },

        //Kibana feature privilege isn't specific to advancedSetting. It can be anything. https://github.com/elastic/kibana/issues/35965
        test_api_keys: {
          elasticsearch: {
            cluster: ['manage_security', 'manage_api_key'],
          },
          kibana: [
            {
              feature: {
                advancedSettings: ['read'],
              },
              spaces: ['default'],
            },
          ],
        },
      },
      defaultRoles: ['superuser'],
    },
  };
}
