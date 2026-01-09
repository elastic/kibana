/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext, GenericFtrProviderContext } from '@kbn/test';
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
