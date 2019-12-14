/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esTestConfig, kbnTestConfig } from '@kbn/test';
import { format as formatUrl } from 'url';
import { getApiIntegrationConfig } from '../../api_integration/config';
import { getReportingApiConfig } from './api';

export default async function({ readConfigFile }) {
  const servers = {
    kibana: kbnTestConfig.getUrlParts(),
    elasticsearch: esTestConfig.getUrlParts(),
  };

  const apiTestConfig = await getApiIntegrationConfig({ readConfigFile });
  const reportingApiConfig = await getReportingApiConfig({ readConfigFile });
  const xPackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../../functional/config.js')
  );

  return {
    ...reportingApiConfig,
    junit: { reportName: 'X-Pack Reporting Generate API Integration Tests' },
    testFiles: [require.resolve('../api/generate')],
    services: {
      ...apiTestConfig.services,
      ...reportingApiConfig.services,
    },
    kbnTestServer: {
      ...xPackFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [
        `--optimize.enabled=false`,
        `--logging.json=false`,
        `--server.maxPayloadBytes=1679958`,
        `--server.port=${kbnTestConfig.getPort()}`,
        `--elasticsearch.hosts=${formatUrl(servers.elasticsearch)}`,
        `--elasticsearch.password=${servers.elasticsearch.password}`,
        `--elasticsearch.username=${servers.elasticsearch.username}`,
        `--xpack.reporting.csv.enablePanelActionDownload=true`,
        `--xpack.reporting.csv.maxSizeBytes=2850`,
        `--xpack.reporting.queue.pollInterval=3000`,
      ],
    },
    esArchiver: apiTestConfig.esArchiver,
  };
}
