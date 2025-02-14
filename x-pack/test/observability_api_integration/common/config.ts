/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { Config, FtrConfigProviderContext, kbnTestConfig } from '@kbn/test';
import { format, UrlObject } from 'url';
import { LogsSynthtraceEsClient, createLogger, LogLevel } from '@kbn/apm-synthtrace';
import supertest from 'supertest';
import { bootstrapApmSynthtraceEsClient, getSynthtraceKibanaClient } from './bootstrap_synthtrace';
import { FtrProviderContext } from './ftr_provider_context';
import { createObsApiClient } from './obs_api_supertest';

interface Settings {
  license: 'basic' | 'trial';
  testFiles: string[];
  name: string;
}

export type CustomApiTestServices = ReturnType<typeof getCustomApiTestServices>;
function getCustomApiTestServices(xPackAPITestsConfig: Config) {
  const servers = xPackAPITestsConfig.get('servers');
  const kibanaServer = servers.kibana as UrlObject;
  const kibanaServerUrl = format(kibanaServer);
  const synthtraceKibanaClient = getSynthtraceKibanaClient(kibanaServerUrl);

  return {
    apmSynthtraceEsClient: (context: FtrProviderContext) => {
      return bootstrapApmSynthtraceEsClient(context, synthtraceKibanaClient);
    },
    logSynthtraceEsClient: (context: FtrProviderContext) =>
      new LogsSynthtraceEsClient({
        client: context.getService('es'),
        logger: createLogger(LogLevel.info),
        refreshAfterIndex: true,
      }),
    synthtraceKibanaClient: () => synthtraceKibanaClient,
    obsApiClient: async (context: FtrProviderContext) => {
      const getApiClientForUsername = (username: string) => {
        const url = format({
          ...kibanaServer,
          auth: `${username}:${kbnTestConfig.getUrlParts().password}`,
        });

        return createObsApiClient(supertest(url));
      };

      return {
        adminUser: getApiClientForUsername('elastic'),
      };
    },
  };
}

export function createTestConfig(settings: Settings) {
  const { testFiles, license, name } = settings;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackAPITestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.ts')
    );

    const customTestServices = getCustomApiTestServices(xPackAPITestsConfig);

    return {
      testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
      testFiles,
      servers: xPackAPITestsConfig.get('servers'),
      services: {
        ...xPackAPITestsConfig.get('services'),
        ...customTestServices,
      },
      junit: {
        reportName: name,
      },

      esTestCluster: {
        ...xPackAPITestsConfig.get('esTestCluster'),
        license,
      },
      kbnTestServer: xPackAPITestsConfig.get('kbnTestServer'),
    };
  };
}
