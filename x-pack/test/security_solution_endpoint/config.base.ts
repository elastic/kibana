/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Config } from '@kbn/test';
import { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from './page_objects';
import {
  getRegistryUrlAsArray,
  createEndpointDockerConfig,
} from '../security_solution_endpoint_api_int/registry';
import type { TargetTags } from './target_tags';

const SUITE_TAGS: Record<string, { include: TargetTags[]; exclude: TargetTags[] }> = {
  ess: {
    include: ['@ess'],
    exclude: ['@skipInEss'],
  },
  serverless: {
    include: ['@serverless'],
    exclude: ['@skipInServerless', '@brokenInServerless'],
  },
};

export const generateConfig = async ({
  ftrConfigProviderContext,
  baseConfig,
  testFiles,
  junitReportName,
  kbnServerArgs = [],
  target,
  services,
}: {
  ftrConfigProviderContext: FtrConfigProviderContext;
  baseConfig: Config;
  testFiles: string[];
  junitReportName: string;
  kbnServerArgs?: string[];
  target: keyof typeof SUITE_TAGS;
  services: any;
}): Promise<Config> => {
  const { readConfigFile } = ftrConfigProviderContext;

  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  return {
    ...baseConfig.getAll(),
    pageObjects,
    testFiles,
    dockerServers: createEndpointDockerConfig(),
    junit: {
      reportName: junitReportName,
    },
    suiteTags: {
      ...baseConfig.get('suiteTags'),
      include: [...baseConfig.get('suiteTags.include'), ...SUITE_TAGS[target].include],
      exclude: [...baseConfig.get('suiteTags.exclude'), ...SUITE_TAGS[target].exclude],
    },
    services,
    apps: {
      ...xpackFunctionalConfig.get('apps'),
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
        // disable a tour that prevents tests from passing
        `--xpack.securitySolution.enableExperimental=${JSON.stringify([
          'disableTimelineSaveTour',
        ])}`,
        ...kbnServerArgs,
      ],
    },
    layout: {
      fixedHeaderHeight: 200,
    },
  };
};
