/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FtrConfigProviderContext,
  GenericFtrProviderContext,
  defineDockerServersConfig,
} from '@kbn/test';
import { createLogger, LogLevel, LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import path from 'path';
import { dockerImage } from '../../../fleet_api_integration/config.base';
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

  const packageRegistryConfig = path.join(__dirname, './common/package_registry_config.yml');
  const dockerArgs: string[] = ['-v', `${packageRegistryConfig}:/package-registry/config.yml`];

  /**
   * This is used by CI to set the docker registry port
   * you can also define this environment variable locally when running tests which
   * will spin up a local docker package registry locally for you
   * if this is defined it takes precedence over the `packageRegistryOverride` variable
   */
  const dockerRegistryPort: string | undefined = process.env.FLEET_PACKAGE_REGISTRY_PORT;

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('.')],
    dockerServers: defineDockerServersConfig({
      registry: {
        enabled: !!dockerRegistryPort,
        image: dockerImage,
        portInContainer: 8080,
        port: dockerRegistryPort,
        args: dockerArgs,
        waitForLogLine: 'package manifests loaded',
        waitForLogLineTimeoutMs: 60 * 2 * 1000, // 2 minutes
      },
    }),
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
