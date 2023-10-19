/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ApmSynthtraceEsClient,
  ApmSynthtraceKibanaClient,
  AssetsSynthtraceEsClient,
  createLogger,
  InfraSynthtraceEsClient,
  LogLevel,
} from '@kbn/apm-synthtrace';
import { FtrConfigProviderContext, kbnTestConfig } from '@kbn/test';
import url from 'url';
import { FtrProviderContext as InheritedFtrProviderContext } from '../../ftr_provider_context';
import { InheritedServices } from './types';

interface AssetManagerConfig {
  services: InheritedServices & {
    assetsSynthtraceEsClient: (
      context: InheritedFtrProviderContext
    ) => Promise<AssetsSynthtraceEsClient>;
    infraSynthtraceEsClient: (
      context: InheritedFtrProviderContext
    ) => Promise<InfraSynthtraceEsClient>;
    apmSynthtraceEsClient: (context: InheritedFtrProviderContext) => Promise<ApmSynthtraceEsClient>;
  };
}

export default async function createTestConfig({
  readConfigFile,
}: FtrConfigProviderContext): Promise<AssetManagerConfig> {
  const baseIntegrationTestsConfig = await readConfigFile(require.resolve('../../config.ts'));
  const services = baseIntegrationTestsConfig.get('services');

  return {
    ...baseIntegrationTestsConfig.getAll(),
    testFiles: [require.resolve('./tests')],
    services: {
      ...services,
      assetsSynthtraceEsClient: (context: InheritedFtrProviderContext) => {
        return new AssetsSynthtraceEsClient({
          client: context.getService('es'),
          logger: createLogger(LogLevel.info),
          refreshAfterIndex: true,
        });
      },
      infraSynthtraceEsClient: (context: InheritedFtrProviderContext) => {
        return new InfraSynthtraceEsClient({
          client: context.getService('es'),
          logger: createLogger(LogLevel.info),
          refreshAfterIndex: true,
        });
      },
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
    kbnTestServer: {
      ...baseIntegrationTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.assetManager.alphaEnabled=true',
      ],
    },
  };
}

export type CreateTestConfig = Awaited<ReturnType<typeof createTestConfig>>;

export type AssetManagerServices = CreateTestConfig['services'];
