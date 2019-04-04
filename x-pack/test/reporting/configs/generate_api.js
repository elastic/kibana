/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getApiIntegrationConfig } from '../../api_integration/config';
import { getReportingApiConfig } from './api';

export default async function ({ readConfigFile }) {
  const apiTestConfig = await getApiIntegrationConfig({ readConfigFile });
  const reportingApiConfig = await getReportingApiConfig({ readConfigFile });

  return {
    ...reportingApiConfig,
    junit: { reportName: 'X-Pack Reporting Generate API Integration Tests' },
    testFiles: [require.resolve('../api/generate')],
    services: {
      ...apiTestConfig.services,
      ...reportingApiConfig.services,
    },
    kbnTestServer: apiTestConfig.kbnTestServer,
    esArchiver: apiTestConfig.esArchiver,
  };
}
