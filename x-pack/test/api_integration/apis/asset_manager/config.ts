/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APM_TEST_PASSWORD } from '@kbn/apm-plugin/server/test_helpers/create_apm_users/authentication';
import {
  ApmSynthtraceEsClient,
  ApmSynthtraceKibanaClient,
  AssetsSynthtraceEsClient,
  createLogger,
  InfraSynthtraceEsClient,
  LogLevel,
  MonitoringSynthtraceEsClient,
} from '@kbn/apm-synthtrace';
import { FtrConfigProviderContext } from '@kbn/test';
import url from 'url';
import { FtrProviderContext as InheritedFtrProviderContext } from '../../ftr_provider_context';
import { InheritedServices } from './types';

interface AssetManagerConfig {
  services: InheritedServices & {
    infraSynthtraceEsClient: (
      context: InheritedFtrProviderContext
    ) => Promise<InfraSynthtraceEsClient>;
    apmSynthtraceEsClient: (context: InheritedFtrProviderContext) => Promise<ApmSynthtraceEsClient>;
    assetsSynthtraceEsClient: (
      context: InheritedFtrProviderContext
    ) => Promise<AssetsSynthtraceEsClient>;
    monitoringSynthtraceEsClient: (
      context: InheritedFtrProviderContext
    ) => Promise<MonitoringSynthtraceEsClient>;
  };
}

export default async function createTestConfig({
  readConfigFile,
}: FtrConfigProviderContext): Promise<AssetManagerConfig> {
  const baseIntegrationTestsConfig = await readConfigFile(require.resolve('../../config.ts'));
  const services = baseIntegrationTestsConfig.get('services');

  return {
    ...baseIntegrationTestsConfig.getAll(),
    testFiles: [require.resolve('.')],
    services: {
      ...services,
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
            auth: `elastic:${APM_TEST_PASSWORD}`,
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
      assetsSynthtraceEsClient: (context: InheritedFtrProviderContext) => {
        return new AssetsSynthtraceEsClient({
          client: context.getService('es'),
          logger: createLogger(LogLevel.info),
          refreshAfterIndex: true,
        });
      },
      monitoringSynthtraceEsClient: (context: InheritedFtrProviderContext) => {
        return new MonitoringSynthtraceEsClient({
          client: context.getService('es'),
          logger: createLogger(LogLevel.info),
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
