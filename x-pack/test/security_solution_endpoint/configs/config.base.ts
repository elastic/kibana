/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { Config } from '@kbn/test';
import { FtrConfigProviderContext } from '@kbn/test';
import { SecuritySolutionEndpointRegistryHelpers } from '../../common/services/security_solution';
import type { TargetTags } from '../target_tags';
import { PageObjects } from '../page_objects';
import { Services } from '../services';

export const SUITE_TAGS: Record<
  'ess' | 'serverless',
  { include: TargetTags[]; exclude: TargetTags[] }
> = {
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
  pageObjects,
}: {
  ftrConfigProviderContext: FtrConfigProviderContext;
  baseConfig: Config;
  testFiles: string[];
  junitReportName: string;
  kbnServerArgs?: string[];
  target: keyof typeof SUITE_TAGS;
  services: Services;
  pageObjects: PageObjects;
}): Promise<Config> => {
  const { readConfigFile } = ftrConfigProviderContext;
  // services are not ready yet, so we need to import them here
  const { createEndpointDockerConfig, getRegistryUrlAsArray } =
    SecuritySolutionEndpointRegistryHelpers();
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../../functional/config.base.js')
  );

  return {
    ...baseConfig.getAll(),
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    pageObjects,
    testFiles,
    dockerServers: createEndpointDockerConfig(),
    junit: {
      reportName: junitReportName,
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
        ...kbnServerArgs,
      ],
    },
    layout: {
      fixedHeaderHeight: 200,
    },
    suiteTags: {
      ...baseConfig.get('suiteTags'),
      include: [...baseConfig.get('suiteTags.include'), ...SUITE_TAGS[target].include],
      exclude: [...baseConfig.get('suiteTags.exclude'), ...SUITE_TAGS[target].exclude],
    },
  };
};
