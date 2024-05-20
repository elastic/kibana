/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext, GenericFtrProviderContext } from '@kbn/test';
import { createLogger, LogLevel, LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { FtrProviderContext as InheritedFtrProviderContext } from '../../ftr_provider_context';

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

interface ObsLogExplorerConfig {
  services: InheritedServices & {
    logSynthtraceEsClient: (
      context: InheritedFtrProviderContext
    ) => Promise<LogsSynthtraceEsClient>;
  };
}

export default async function createTestConfig({
  readConfigFile,
}: FtrConfigProviderContext): Promise<ObsLogExplorerConfig> {
  const functionalConfig = await readConfigFile(require.resolve('../../config.base.js'));
  const services = functionalConfig.get('services');

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('.')],
    services: {
      ...services,
      logSynthtraceEsClient: (context: InheritedFtrProviderContext) => {
        return new LogsSynthtraceEsClient({
          client: context.getService('es'),
          logger: createLogger(LogLevel.info),
          refreshAfterIndex: true,
        });
      },
    },
  };
}

export type ObsLogsExplorerServices = ObsLogExplorerConfig['services'];
export type ObsLogsExplorerPageObject = InheritedPageObjects;

export type FtrProviderContext = GenericFtrProviderContext<
  ObsLogsExplorerServices,
  ObsLogsExplorerPageObject
>;
