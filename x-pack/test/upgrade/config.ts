/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from './page_objects';
import { ReportingAPIProvider } from './reporting_services';
import { MapsHelper } from './maps_upgrade_services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const apiConfig = await readConfigFile(require.resolve('../api_integration/config'));
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    ...functionalConfig.getAll(),

    testFiles: [
      require.resolve('./apps/canvas'),
      require.resolve('./apps/dashboard'),
      require.resolve('./apps/maps'),
      require.resolve('./apps/reporting'),
    ],

    pageObjects,

    services: {
      ...apiConfig.get('services'),
      ...functionalConfig.get('services'),
      reportingAPI: ReportingAPIProvider,
      mapsHelper: MapsHelper,
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
