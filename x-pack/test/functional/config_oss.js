/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pageObjects } from './page_objects';
import { services } from './services';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function({ readConfigFile }) {
  const kibanaCommonConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );
  // const kibanaFunctionalConfig = await readConfigFile(
  //   require.resolve('../../../test/functional/config.js')
  // );

  // export default async function({ readConfigFile }) {
  //   const commonConfig = await readConfigFile(require.resolve('../common/config'));

  return {
    testFiles: [
      require.resolve('../../../test/functional/apps/bundles'),
      require.resolve('../../../test/functional/apps/console'),
      require.resolve('../../../test/functional/apps/context'),
      require.resolve('../../../test/functional/apps/dashboard'),
      require.resolve('../../../test/functional/apps/discover'),
      require.resolve('../../../test/functional/apps/getting_started'),
      require.resolve('../../../test/functional/apps/home'),
      require.resolve('../../../test/functional/apps/management'),
      require.resolve('../../../test/functional/apps/saved_objects_management'),
      require.resolve('../../../test/functional/apps/status_page'),
      require.resolve('../../../test/functional/apps/timelion'),
      require.resolve('../../../test/functional/apps/visualize'),
    ],
    pageObjects,
    services,
    servers: kibanaCommonConfig.get('servers'),

    esTestCluster: kibanaCommonConfig.get('esTestCluster'),

    kbnTestServer: {
      ...kibanaCommonConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaCommonConfig.get('kbnTestServer.serverArgs'),
        '--oss',
        '--telemetry.optIn=false',
      ],
    },

    uiSettings: {
      defaults: {
        'accessibility:disableAnimations': true,
        'dateFormat:tz': 'UTC',
      },
    },

    apps: {
      kibana: {
        pathname: '/app/kibana',
      },
      status_page: {
        pathname: '/status',
      },
      discover: {
        pathname: '/app/discover',
        hash: '/',
      },
      context: {
        pathname: '/app/discover',
        hash: '/context',
      },
      visualize: {
        pathname: '/app/visualize',
        hash: '/',
      },
      dashboard: {
        pathname: '/app/dashboards',
        hash: '/list',
      },
      settings: {
        pathname: '/app/kibana',
        hash: '/management',
      },
      timelion: {
        pathname: '/app/timelion',
      },
      console: {
        pathname: '/app/dev_tools',
        hash: '/console',
      },
      home: {
        pathname: '/app/home',
        hash: '/',
      },
    },
    junit: {
      reportName: 'Chrome UI Functional Tests',
    },
    browser: {
      type: 'chrome',
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
        test_shakespeare_reader: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['shakes*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },
        test_testhuge_reader: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['testhuge*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },
        test_alias_reader: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['alias*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },
        //for sample data - can remove but not add sample data.( not ml)- for ml use built in role.
        kibana_sample_admin: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['kibana_sample*'],
                privileges: ['read', 'view_index_metadata', 'manage', 'create_index', 'index'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        kibana_date_nanos: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['date-nanos'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        kibana_date_nanos_custom: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['date_nanos_custom_timestamp'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        kibana_date_nanos_mixed: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['date_nanos_mixed', 'timestamp-*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        kibana_large_strings: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['testlargestring'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        long_window_logstash: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['long-window-logstash-*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        animals: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['animals-*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },
      },
      defaultRoles: ['test_logstash_reader', 'kibana_admin'],
    },
  };
}
