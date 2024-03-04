/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ApmSynthtraceEsClient,
  ApmSynthtraceKibanaClient,
  createLogger,
  LogLevel,
} from '@kbn/apm-synthtrace';
import url from 'url';
import { FtrConfigProviderContext, kbnTestConfig } from '@kbn/test';
import { FtrProviderContext as InheritedFtrProviderContext } from '../../ftr_provider_context';
import { InheritedServices } from './types';

interface MetricsUIConfig {
  services: InheritedServices & {
    apmSynthtraceEsClient: (context: InheritedFtrProviderContext) => Promise<ApmSynthtraceEsClient>;
  };
}
export default async function createTestConfig({
  readConfigFile,
}: FtrConfigProviderContext): Promise<MetricsUIConfig> {
  const baseIntegrationTestsConfig = await readConfigFile(require.resolve('../../config.ts'));
  const services = baseIntegrationTestsConfig.get('services');
  return {
    ...baseIntegrationTestsConfig.getAll(),
    testFiles: [require.resolve('.')],
    services: {
      ...services,
      apmSynthtraceEsClient: async (context: InheritedFtrProviderContext) => {
        const servers = baseIntegrationTestsConfig.get('servers');

        const kibanaServer = servers.kibana as url.UrlObject;
        const kibanaServerUrl = url.format(kibanaServer);
        const kibanaServerUrlWithAuth = url
          .format({
            ...url.parse(kibanaServerUrl),
            auth: `elastic:${kbnTestConfig.getUrlParts().password}`,
          })
          .slice(0, -1);

        const kibanaClient = new ApmSynthtraceKibanaClient({
          target: kibanaServerUrlWithAuth,
          logger: createLogger(LogLevel.debug),
        });
        const kibanaVersion = await kibanaClient.fetchLatestApmPackageVersion();
        await kibanaClient.installApmPackage(kibanaVersion);

        return new ApmSynthtraceEsClient({
          client: context.getService('es'),
          logger: createLogger(LogLevel.info),
          version: kibanaVersion,
          refreshAfterIndex: true,
        });
      },
    },
  };
}
export type CreateTestConfig = Awaited<ReturnType<typeof createTestConfig>>;

export type MetricsUIServices = CreateTestConfig['services'];
