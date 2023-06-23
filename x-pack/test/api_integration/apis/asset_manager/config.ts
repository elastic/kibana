/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format, UrlObject } from 'url';
import { FtrConfigProviderContext } from '@kbn/test';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

import { bootstrapApmSynthtrace, getApmSynthtraceKibanaClient } from './bootstrap_apm_synthtrace';
import { FtrProviderContext as InheritedFtrProviderContext } from '../../ftr_provider_context';
import { InheritedServices } from './types';

interface AssetManagerConfig {
  services: InheritedServices & {
    synthtraceEsClient: (context: InheritedFtrProviderContext) => Promise<ApmSynthtraceEsClient>;
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
      synthtraceEsClient: (context: InheritedFtrProviderContext) => {
        const servers = baseIntegrationTestsConfig.get('servers');
        const kibanaServer = servers.kibana as UrlObject;
        const kibanaServerUrl = format(kibanaServer);
        const synthtraceKibanaClient = getApmSynthtraceKibanaClient(kibanaServerUrl);
        return bootstrapApmSynthtrace(context, synthtraceKibanaClient);
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
