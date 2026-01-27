/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type FtrConfigProviderContext, type GenericFtrProviderContext } from '@kbn/test';
import { defineDockerServersConfig, dockerRegistryPort, packageRegistryDocker } from '@kbn/test';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import type { FtrProviderContext } from '../../ftr_provider_context';

import type { FtrProviderContext as InheritedFtrProviderContext } from '../../ftr_provider_context';

export type InheritedServices = InheritedFtrProviderContext extends GenericFtrProviderContext<
  infer TServices,
  {}
>
  ? TServices
  : {};

export type InheritedPageObjects = InheritedFtrProviderContext extends GenericFtrProviderContext<
  infer TServices,
  infer TPageObjects
>
  ? TPageObjects
  : {};

interface DatasetQualityConfig {
  services: InheritedServices & {
    logSynthtraceEsClient: (
      context: InheritedFtrProviderContext
    ) => Promise<LogsSynthtraceEsClient>;
  };
}

export default async function createTestConfig({
  readConfigFile,
}: FtrConfigProviderContext): Promise<DatasetQualityConfig> {
  const functionalConfig = await readConfigFile(require.resolve('../../config.base.ts'));
  const services = functionalConfig.get('services');
  const pageObjects = functionalConfig.get('pageObjects');

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('.')],
    services: {
      ...services,
      logSynthtraceEsClient: (context: FtrProviderContext) => {
        const synthtrace = context.getService('synthtrace');

        const { logsEsClient } = synthtrace.getClients(['logsEsClient']);

        return logsEsClient;
      },
    },
    dockerServers: defineDockerServersConfig({
      registry: packageRegistryDocker,
    }),
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        ...(dockerRegistryPort
          ? [`--xpack.fleet.registryUrl=http://localhost:${dockerRegistryPort}`]
          : []),
      ],
    },
    pageObjects,
  };
}

export type CreateTestConfig = Awaited<ReturnType<typeof createTestConfig>>;

export type DatasetQualityServices = CreateTestConfig['services'];
export type DatasetQualityPageObject = InheritedPageObjects;

export type DatasetQualityFtrProviderContext = GenericFtrProviderContext<
  DatasetQualityServices,
  DatasetQualityPageObject
>;
