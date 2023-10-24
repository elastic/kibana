/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { Config } from '@kbn/test';
import { pageObjects } from './page_objects';
import { services } from './services';
import {
  getRegistryUrlAsArray,
  createEndpointDockerConfig,
} from '../security_solution_endpoint_api_int/registry';

export const generateConfig = ({
  baseConfig,
  junitReportName,
  kbnServerArgs = [],
}: {
  baseConfig: Config;
  junitReportName: string;
  kbnServerArgs?: string[];
}): Config => ({
  ...baseConfig.getAll(),
  pageObjects,
  testFiles: [resolve(__dirname, './apps/endpoint')],
  dockerServers: createEndpointDockerConfig(),
  junit: {
    reportName: junitReportName,
  },
  services,
  apps: {
    ...baseConfig.get('apps'),
    ['securitySolutionManagement']: {
      pathname: '/app/security/administration',
    },
    ['security']: {
      pathname: '/app/security',
    },
    ['securitySolutionTimelines']: {
      pathname: '/app/security/timelines',
    },
  },
  kbnTestServer: {
    ...baseConfig.get('kbnTestServer'),
    serverArgs: [
      ...baseConfig.get('kbnTestServer.serverArgs'),
      // if you return an empty string here the kibana server will not start properly but an empty array works
      ...getRegistryUrlAsArray(),
      // always install Endpoint package by default when Fleet sets up
      `--xpack.fleet.packages.0.name=endpoint`,
      `--xpack.fleet.packages.0.version=latest`,
      // this will be removed in 8.7 when the file upload feature is released
      `--xpack.fleet.enableExperimental.0=diagnosticFileUploadEnabled`,
      ...kbnServerArgs,
    ],
  },
  layout: {
    fixedHeaderHeight: 200,
  },
});
