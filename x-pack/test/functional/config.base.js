/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { resolve } from 'path';
import { services } from './services';
import { pageObjects } from './page_objects';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }) {
  const kibanaCommonConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/common/config')
  );
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/functional/config.base')
  );

  return {
    services,
    pageObjects,

    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,

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
        '--savedObjects.allowHttpApiAccess=false', // override default to not allow hiddenFromHttpApis saved objects access to the http APIs see https://github.com/elastic/dev/issues/2200
        // explicitly disable internal API restriction. See https://github.com/elastic/kibana/issues/163654
        '--server.restrictInternalApis=false',
        // disable fleet task that writes to metrics.fleet_server.* data streams, impacting functional tests
        `--xpack.task_manager.unsafe.exclude_task_types=${JSON.stringify(['Fleet-Metrics-Task'])}`,
        `--xpack.fleet.internal.registry.kibanaVersionCheckEnabled=false`,
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
      spacesManagement: {
        pathname: '/app/management/kibana/spaces',
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
      observabilityLogsExplorer: {
        pathname: '/app/observability-logs-explorer',
      },
      connectors: {
        pathname: '/app/management/insightsAndAlerting/triggersActionsConnectors/',
      },
      triggersActions: {
        pathname: '/app/management/insightsAndAlerting/triggersActions',
      },
      maintenanceWindows: {
        pathname: '/app/management/insightsAndAlerting/maintenanceWindows',
      },
      obsAIAssistant: {
        pathname: '/app/observabilityAIAssistant',
      },
      aiAssistantManagementSelection: {
        pathname: '/app/management/kibana/aiAssistantManagementSelection',
      },
      obsAIAssistantManagement: {
        pathname: '/app/management/kibana/observabilityAiAssistantManagement',
      },
      enterpriseSearch: {
        pathname: '/app/elasticsearch/overview',
      },
      elasticsearchStart: {
        pathname: '/app/elasticsearch/start',
      },
      elasticsearchIndices: {
        pathname: '/app/elasticsearch/indices',
      },
    },

    suiteTags: {
      ...kibanaCommonConfig.get('suiteTags'),
      exclude: [...kibanaCommonConfig.get('suiteTags').exclude, 'upgradeAssistant'],
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
                privileges: [
                  'create',
                  'read',
                  'view_index_metadata',
                  'monitor',
                  'create_index',
                  'manage',
                ],
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
                names: ['rollup-*', 'regular-index*'],
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

        cluster_security_manager: {
          elasticsearch: {
            cluster: ['manage_security'],
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

        ccr_user: {
          elasticsearch: {
            cluster: ['manage', 'manage_ccr'],
          },
        },
        // There is an issue open for follower_index_user permissions not working correctly
        // in kibana.
        // https://github.com/elastic/kibana/issues/143720
        // follower_index_user: {
        //   elasticsearch: {
        //     cluster: ['monitor', 'manage', 'manage_ccr', 'transport_client', 'read_ccr', 'all'],
        //     indices: [
        //       {
        //         names: ['*'],
        //         privileges: [
        //           'write',
        //           'monitor',
        //           'manage_follow_index',
        //           'manage_leader_index',
        //           'read',
        //           'view_index_metadata',
        //         ],
        //       },
        //     ],
        //   },
        //   kibana: [
        //     {
        //       base: ['all'],
        //       spaces: ['*'],
        //     },
        //   ],
        // },

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

        read_ilm: {
          elasticsearch: {
            cluster: ['read_ilm'],
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
            cluster: ['monitor', 'manage_index_templates', 'manage_enrich'],
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
              'manage_index_templates',
            ],
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

        manage_processors_user: {
          elasticsearch: {
            cluster: ['manage'],
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

        slo_all: {
          kibana: [
            {
              feature: {
                slo: ['all'],
              },
              spaces: ['*'],
            },
          ],
          elasticsearch: {
            cluster: ['all'],
            indices: [
              {
                names: ['*'],
                privileges: ['all'],
              },
            ],
          },
        },
        slo_read_only: {
          kibana: [
            {
              feature: {
                slo: ['read'],
              },
              spaces: ['*'],
            },
          ],
          elasticsearch: {
            cluster: ['all'],
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
