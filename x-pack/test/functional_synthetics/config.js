/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path, { resolve } from 'path';

import { defineDockerServersConfig } from '@kbn/test';
import { dockerImage as fleetDockerImage } from '../fleet_api_integration/config';

import { services } from './services';
import { pageObjects } from './page_objects';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }) {
  const registryPort = process.env.FLEET_PACKAGE_REGISTRY_PORT;

  const kibanaCommonConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('../../../test/functional/config.base.js')
  );

  // mount the config file for the package registry as well as
  // the directory containing additional packages into the container
  const dockerArgs = [
    '-v',
    `${path.join(
      path.dirname(__filename),
      './fixtures/package_registry_config.yml'
    )}:/package-registry/config.yml`,
  ];

  return {
    // list paths to the files that contain your plugins tests
    testFiles: [resolve(__dirname, './apps/uptime')],

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
        ...(registryPort ? [`--xpack.fleet.registryUrl=http://localhost:${registryPort}`] : []),
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
      fleet: {
        pathname: '/app/fleet',
      },
    },

    // choose where screenshots should be saved
    screenshots: {
      directory: resolve(__dirname, 'screenshots'),
    },

    junit: {
      reportName: 'Chrome Elastic Synthetics Integration UI Functional Tests',
    },
    dockerServers: defineDockerServersConfig({
      registry: {
        enabled: !!registryPort,
        image: fleetDockerImage,
        portInContainer: 8080,
        port: registryPort,
        args: dockerArgs,
        waitForLogLine: 'package manifests loaded',
      },
    }),
  };
}
