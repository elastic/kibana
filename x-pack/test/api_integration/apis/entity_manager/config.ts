/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext, GenericFtrProviderContext } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

type InheritedServices = FtrProviderContext extends GenericFtrProviderContext<infer TServices, {}>
  ? TServices
  : {};

interface EntityManagerConfig {
  services: InheritedServices & {};
}

export default async function createTestConfig({
  readConfigFile,
}: FtrConfigProviderContext): Promise<EntityManagerConfig> {
  const baseIntegrationTestsConfig = await readConfigFile(require.resolve('../../config.ts'));
  const services = baseIntegrationTestsConfig.get('services');
  const entityManagerFixturePlugin = resolve(__dirname, './fixture_plugin');

  return {
    ...baseIntegrationTestsConfig.getAll(),
    testFiles: [require.resolve('.')],
    kbnTestServer: {
      ...baseIntegrationTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${entityManagerFixturePlugin}`,
      ],
    },
    services: {
      ...services,
    },
  };
}

export type CreateTestConfig = Awaited<ReturnType<typeof createTestConfig>>;

export type AssetManagerServices = CreateTestConfig['services'];
