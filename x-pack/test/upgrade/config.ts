/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from '../functional/page_objects';
import { ReportingAPIProvider } from './services/reporting_upgrade_services';
import { MapsHelper } from './services/maps_upgrade_services';
import { RulesHelper } from './services/rules_upgrade_services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const apiConfig = await readConfigFile(require.resolve('../api_integration/config'));
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  return {
    ...functionalConfig.getAll(),

    testFiles: [
      require.resolve('./apps/canvas'),
      require.resolve('./apps/dashboard'),
      require.resolve('./apps/discover'),
      require.resolve('./apps/graph'),
      require.resolve('./apps/logs'),
      require.resolve('./apps/maps'),
      require.resolve('./apps/reporting'),
      require.resolve('./apps/rules'),
    ],

    pageObjects,

    services: {
      ...apiConfig.get('services'),
      ...functionalConfig.get('services'),
      reportingAPI: ReportingAPIProvider,
      mapsHelper: MapsHelper,
      rulesHelper: RulesHelper,
    },

    screenshots: {
      directory: resolve(__dirname, 'screenshots'),
    },

    junit: {
      reportName: 'Kibana Core Tests',
    },

    timeouts: {
      kibanaReportCompletion: 120000,
    },

    security: {
      disableTestUser: true,
    },
  };
}
