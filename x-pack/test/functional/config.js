/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import { services } from './services';
import { pageObjects } from './page_objects';

// Docker image to use for Fleet API integration tests.
// This hash comes from the latest successful build of the Snapshot Distribution of the Package Registry, for
// example: https://beats-ci.elastic.co/blue/organizations/jenkins/Ingest-manager%2Fpackage-storage/detail/snapshot/74/pipeline/257#step-302-log-1.
// It should be updated any time there is a new Docker image published for the Snapshot Distribution of the Package Registry.
export const dockerImage =
  'docker.elastic.co/package-registry/distribution:e1a3906e0c9944ecade05308022ba35eb0ebd00a';

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
      resolve(__dirname, './apps/discover'),
      resolve(__dirname, './apps/security'),
      resolve(__dirname, './apps/spaces'),
      resolve(__dirname, './apps/logstash'),
      resolve(__dirname, './apps/grok_debugger'),
      resolve(__dirname, './apps/infra'),
      resolve(__dirname, './apps/ml'),
      resolve(__dirname, './apps/rollup_job'),
      resolve(__dirname, './apps/maps'),
      resolve(__dirname, './apps/status_page'),
      resolve(__dirname, './apps/upgrade_assistant'),
      resolve(__dirname, './apps/visualize'),
      resolve(__dirname, './apps/uptime'),
      resolve(__dirname, './apps/saved_objects_management'),
      resolve(__dirname, './apps/dev_tools'),
      resolve(__dirname, './apps/apm'),
      resolve(__dirname, './apps/api_keys'),
      resolve(__dirname, './apps/data_views'),
      resolve(__dirname, './apps/index_management'),
      resolve(__dirname, './apps/index_lifecycle_management'),
      resolve(__dirname, './apps/ingest_pipelines'),
      resolve(__dirname, './apps/snapshot_restore'),
      resolve(__dirname, './apps/cross_cluster_replication'),
      resolve(__dirname, './apps/remote_clusters'),
      resolve(__dirname, './apps/transform'),
      resolve(__dirname, './apps/reporting_management'),
      resolve(__dirname, './apps/management'),
      resolve(__dirname, './apps/lens'), // smokescreen tests cause flakiness in other tests

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
        '--xpack.security.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"', // server restarts should not invalidate active sessions
        '--xpack.encryptedSavedObjects.encryptionKey="DkdXazszSCYexXqz4YktBGHCRkV6hyNK"',
        '--xpack.discoverEnhanced.actions.exploreDataInContextMenu.enabled=true',
        '--savedObjects.maxImportPayloadBytes=10485760', // for OSS test management/_import_objects,
      ],
    },
    uiSettings: {
      defaults: {
        'accessibility:disableAnimations': true,
        'dateFormat:tz': 'UTC',
        'visualization:visualize:legacyPieChartsLibrary': true,
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
      cases: {
        pathname: '/app/management/insightsAndAlerting/cases/',
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
      painlessLab: {
        pathname: '/app/dev_tools',
        hash: '/painless_lab',
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
      fleet: {
        pathname: '/app/fleet',
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
      securitySolution: {
        pathname: '/app/security',
      },
      observability: {
        pathname: '/app/observability',
      },
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
        test_monitoring: {
          elasticsearch: {
            cluster: ['monitor'],
          },
        },
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

        global_canvas_all: {
          kibana: [
            {
              feature: {
                canvas: ['all'],
                visualize: ['all'],
              },
              spaces: ['*'],
            },
          ],
        },

        global_discover_all: {
          kibana: [
            {
              feature: {
                discover: ['all'],
              },
              spaces: ['*'],
            },
          ],
        },

        global_dashboard_read: {
          kibana: [
            {
              feature: {
                dashboard: ['read'],
              },
              spaces: ['*'],
            },
          ],
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
        global_dashboard_all: {
          kibana: [
            {
              feature: {
                dashboard: ['all'],
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

        global_maps_read: {
          kibana: [
            {
              feature: {
                maps: ['read'],
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
        antimeridian_points_reader: {
          elasticsearch: {
            indices: [
              {
                names: ['antimeridian_points*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
        },
        antimeridian_shapes_reader: {
          elasticsearch: {
            indices: [
              {
                names: ['antimeridian_shapes*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
        },

        meta_for_geoshape_data_reader: {
          elasticsearch: {
            indices: [
              {
                names: ['meta_for_geo_shapes*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
        },

        geoconnections_data_reader: {
          elasticsearch: {
            indices: [
              {
                names: ['connections*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
        },

        test_logs_data_reader: {
          elasticsearch: {
            indices: [
              {
                names: ['test_data_stream'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
        },

        geoall_data_writer: {
          elasticsearch: {
            indices: [
              {
                names: ['*'],
                privileges: ['create', 'read', 'view_index_metadata', 'monitor', 'create_index'],
              },
            ],
          },
        },

        global_index_pattern_management_all: {
          kibana: [
            {
              feature: {
                indexPatterns: ['all'],
              },
              spaces: ['*'],
            },
          ],
        },

        global_devtools_read: {
          elasticsearch: {
            indices: [
              {
                names: ['*'],
                privileges: ['read', 'all'],
              },
            ],
          },
          kibana: [
            {
              feature: {
                dev_tools: ['read'],
              },
              spaces: ['*'],
            },
          ],
        },

        global_upgrade_assistant_role: {
          elasticsearch: {
            cluster: ['manage'],
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

        // using this role even for remote clusters
        global_ccr_role: {
          elasticsearch: {
            cluster: ['manage', 'manage_ccr'],
          },
          kibana: [
            {
              base: ['all'],
              spaces: ['*'],
            },
          ],
        },
        manage_rollups_role: {
          elasticsearch: {
            cluster: ['manage', 'manage_rollup'],
            indices: [
              {
                names: ['*'],
                privileges: ['read', 'delete', 'create_index', 'view_index_metadata'],
              },
            ],
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

        test_rollup_reader: {
          elasticsearch: {
            indices: [
              {
                names: ['rollup-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
        },

        // Kibana feature privilege isn't specific to advancedSetting. It can be anything. https://github.com/elastic/kibana/issues/35965
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

        manage_security: {
          elasticsearch: {
            cluster: ['manage_security'],
          },
        },

        ccr_user: {
          elasticsearch: {
            cluster: ['manage', 'manage_ccr'],
          },
        },

        manage_ilm: {
          elasticsearch: {
            cluster: ['manage_ilm'],
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

        index_management_user: {
          elasticsearch: {
            cluster: ['monitor', 'manage_index_templates'],
            indices: [
              {
                names: ['*'],
                privileges: ['all'],
              },
            ],
          },
          kibana: [
            {
              feature: {
                advancedSettings: ['read'],
              },
              spaces: ['*'],
            },
          ],
        },
        // https://www.elastic.co/guide/en/elasticsearch/reference/master/snapshots-register-repository.html#snapshot-repo-prereqs
        snapshot_restore_user: {
          elasticsearch: {
            cluster: [
              'monitor',
              'manage_slm',
              'cluster:admin/snapshot',
              'cluster:admin/repository',
            ],
          },
          kibana: [
            {
              feature: {
                advancedSettings: ['read'],
              },
              spaces: ['*'],
            },
          ],
        },

        ingest_pipelines_user: {
          elasticsearch: {
            cluster: ['manage_pipeline', 'cluster:monitor/nodes/info'],
          },
          kibana: [
            {
              feature: {
                advancedSettings: ['read'],
              },
              spaces: ['*'],
            },
          ],
        },

        license_management_user: {
          elasticsearch: {
            cluster: ['manage'],
          },
        },

        logstash_read_user: {
          elasticsearch: {
            cluster: ['manage_logstash_pipelines'],
          },
        },

        remote_clusters_user: {
          elasticsearch: {
            cluster: ['manage'],
          },
        },

        global_alerts_logs_all_else_read: {
          kibana: [
            {
              feature: {
                apm: ['read'],
                logs: ['all'],
                infrastructure: ['read'],
              },
              spaces: ['*'],
            },
          ],
          elasticsearch: {
            indices: [
              {
                names: ['*'],
                privileges: ['all'],
              },
            ],
          },
        },
      },
      defaultRoles: ['superuser'],
    },
  };
}
