/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import supertest from 'supertest';
import { format, UrlObject } from 'url';
import { SecurityServiceProvider } from 'test/common/services/security';
import { InheritedFtrProviderContext, InheritedServices } from './ftr_provider_context';
import { PromiseReturnType } from '../../../plugins/observability/typings/common';
import { createApmUser, APM_TEST_PASSWORD, ApmUser } from './authentication';
import { APMFtrConfigName } from '../configs';
import { createApmApiClient } from './apm_api_supertest';
import { RegistryProvider } from './registry';
import { synthtraceEsClientService } from './synthtrace_es_client_service';

export interface ApmFtrConfig {
  name: APMFtrConfigName;
  license: 'basic' | 'trial';
  kibanaConfig?: Record<string, string | string[]>;
}

type SecurityService = PromiseReturnType<typeof SecurityServiceProvider>;

function getLegacySupertestClient(kibanaServer: UrlObject, apmUser: ApmUser) {
  return async (context: InheritedFtrProviderContext) => {
    const security = context.getService('security');
    await security.init();

    await createApmUser(security, apmUser);

    const url = format({
      ...kibanaServer,
      auth: `${apmUser}:${APM_TEST_PASSWORD}`,
    });

    return supertest(url);
  };
}

async function getApmApiClient(
  kibanaServer: UrlObject,
  security: SecurityService,
  apmUser: ApmUser
) {
  await createApmUser(security, apmUser);

  const url = format({
    ...kibanaServer,
    auth: `${apmUser}:${APM_TEST_PASSWORD}`,
  });

  return createApmApiClient(supertest(url));
}

export type CreateTestConfig = ReturnType<typeof createTestConfig>;

export function createTestConfig(config: ApmFtrConfig) {
  const { license, name, kibanaConfig } = config;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackAPITestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.ts')
    );

    const services = xPackAPITestsConfig.get('services') as InheritedServices;
    const servers = xPackAPITestsConfig.get('servers');
    const kibanaServer = servers.kibana;

    return {
      testFiles: [require.resolve('../tests')],
      servers,
      servicesRequiredForTestAnalysis: ['apmFtrConfig', 'registry'],
      services: {
        ...services,
        apmFtrConfig: () => config,
        registry: RegistryProvider,
        synthtraceEsClient: synthtraceEsClientService,
        apmApiClient: async (context: InheritedFtrProviderContext) => {
          const security = context.getService('security');
          await security.init();

          return {
            noAccessUser: await getApmApiClient(servers.kibana, security, ApmUser.noAccessUser),
            readUser: await getApmApiClient(servers.kibana, security, ApmUser.apmReadUser),
            writeUser: await getApmApiClient(servers.kibana, security, ApmUser.apmWriteUser),
            annotationWriterUser: await getApmApiClient(
              servers.kibana,
              security,
              ApmUser.apmAnnotationsWriteUser
            ),
            noMlAccessUser: await getApmApiClient(
              servers.kibana,
              security,
              ApmUser.apmReadUserWithoutMlAccess
            ),
          };
        },

        // legacy clients
        legacySupertestAsNoAccessUser: getLegacySupertestClient(kibanaServer, ApmUser.noAccessUser),
        legacySupertestAsApmReadUser: getLegacySupertestClient(kibanaServer, ApmUser.apmReadUser),
        legacySupertestAsApmWriteUser: getLegacySupertestClient(kibanaServer, ApmUser.apmWriteUser),
        legacySupertestAsApmAnnotationsWriteUser: getLegacySupertestClient(
          kibanaServer,
          ApmUser.apmAnnotationsWriteUser
        ),
        legacySupertestAsApmReadUserWithoutMlAccess: getLegacySupertestClient(
          kibanaServer,
          ApmUser.apmReadUserWithoutMlAccess
        ),
      },
      junit: {
        reportName: `APM API Integration tests (${name})`,
      },
      esTestCluster: {
        ...xPackAPITestsConfig.get('esTestCluster'),
        license,
      },
      kbnTestServer: {
        ...xPackAPITestsConfig.get('kbnTestServer'),
        serverArgs: [
          ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
          ...(kibanaConfig
            ? Object.entries(kibanaConfig).map(([key, value]) =>
                Array.isArray(value) ? `--${key}=${JSON.stringify(value)}` : `--${key}=${value}`
              )
            : []),
        ],
      },
    };
  };
}

export type ApmServices = PromiseReturnType<ReturnType<typeof createTestConfig>>['services'];
