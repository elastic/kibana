/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default async function({ readConfigFile }) {
  const defaultConfig = await readConfigFile(require.resolve('./config'));

  return {
    ...defaultConfig.getAll(),
    //csp.strict: false
    // testFiles: [
    //   require.resolve(__dirname, './apps/advanced_settings'),
    //   require.resolve(__dirname, './apps/canvas'),
    //   require.resolve(__dirname, './apps/graph'),
    //   require.resolve(__dirname, './apps/monitoring'),
    //   require.resolve(__dirname, './apps/watcher'),
    //   require.resolve(__dirname, './apps/dashboard'),
    //   require.resolve(__dirname, './apps/dashboard_mode'),
    //   require.resolve(__dirname, './apps/discover'),
    //   require.resolve(__dirname, './apps/security'),
    //   require.resolve(__dirname, './apps/spaces'),
    //   require.resolve(__dirname, './apps/lens'),
    //   require.resolve(__dirname, './apps/logstash'),
    //   require.resolve(__dirname, './apps/grok_debugger'),
    //   require.resolve(__dirname, './apps/infra'),
    //   require.resolve(__dirname, './apps/machine_learning'),
    //   require.resolve(__dirname, './apps/rollup_job'),
    //   require.resolve(__dirname, './apps/maps'),
    //   require.resolve(__dirname, './apps/status_page'),
    //   require.resolve(__dirname, './apps/timelion'),
    //   require.resolve(__dirname, './apps/upgrade_assistant'),
    //   require.resolve(__dirname, './apps/visualize'),
    //   require.resolve(__dirname, './apps/uptime'),
    //   require.resolve(__dirname, './apps/saved_objects_management'),
    //   require.resolve(__dirname, './apps/dev_tools'),
    //   require.resolve(__dirname, './apps/apm'),
    //   require.resolve(__dirname, './apps/index_patterns'),
    //   require.resolve(__dirname, './apps/index_management'),
    //   require.resolve(__dirname, './apps/index_lifecycle_management'),
    //   require.resolve(__dirname, './apps/snapshot_restore'),
    //   require.resolve(__dirname, './apps/cross_cluster_replication'),
    //   require.resolve(__dirname, './apps/remote_clusters'),
    //   // This license_management file must be last because it is destructive.
    //   require.resolve(__dirname, './apps/license_management'),
    // ],

    browser: {
      type: 'ie',
    },

    junit: {
      reportName: 'Internet Explorer UI Functional X-Pack Tests',
    },

    uiSettings: {
      defaults: {
        'accessibility:disableAnimations': true,
        'dateFormat:tz': 'UTC',
        'state:storeInSessionStorage': true,
      },
    },

    kbnTestServer: {
      ...defaultConfig.get('kbnTestServer'),
      serverArgs: [
        ...defaultConfig.get('kbnTestServer.serverArgs'),
        '--csp.strict=false',
        '--telemetry.optIn=false',
      ],
    },
  };
}
