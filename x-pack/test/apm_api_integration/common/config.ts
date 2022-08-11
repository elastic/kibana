/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import supertest from 'supertest';
import { format, UrlObject } from 'url';
import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { SecurityServiceProvider } from '../../../../test/common/services/security';
import { InheritedFtrProviderContext, InheritedServices } from './ftr_provider_context';
import { createApmUser, APM_TEST_PASSWORD, ApmUsername } from './authentication';
import { APMFtrConfigName } from '../configs';
import { createApmApiClient } from './apm_api_supertest';
import { RegistryProvider } from './registry';
import { synthtraceEsClientService } from './synthtrace_es_client_service';
import { MachineLearningAPIProvider } from '../../functional/services/ml/api';

export interface ApmFtrConfig {
  name: APMFtrConfigName;
  license: 'basic' | 'trial';
  kibanaConfig?: Record<string, string | string[]>;
}

type SecurityService = Awaited<ReturnType<typeof SecurityServiceProvider>>;

function getLegacySupertestClient(kibanaServer: UrlObject, username: ApmUsername) {
  return async (context: InheritedFtrProviderContext) => {
    const security = context.getService('security');
    const es = context.getService('es');
    const logger = context.getService('log');
    await security.init();

    await createApmUser({ security, username, es, logger });

    const url = format({
      ...kibanaServer,
      auth: `${username}:${APM_TEST_PASSWORD}`,
    });

    return supertest(url);
  };
}

async function getApmApiClient({
  kibanaServer,
  security,
  username,
  es,
  logger,
}: {
  kibanaServer: UrlObject;
  security: SecurityService;
  username: ApmUsername;
  es: Client;
  logger: ToolingLog;
}) {
  await createApmUser({ security, username, es, logger });

  const url = format({
    ...kibanaServer,
    auth: `${username}:${APM_TEST_PASSWORD}`,
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
          const es = context.getService('es');
          const logger = context.getService('log');

          await security.init();

          return {
            noAccessUser: await getApmApiClient({
              kibanaServer: servers.kibana,
              security,
              username: ApmUsername.noAccessUser,
              es,
              logger,
            }),
            readUser: await getApmApiClient({
              kibanaServer: servers.kibana,
              security,
              username: ApmUsername.viewerUser,
              es,
              logger,
            }),
            writeUser: await getApmApiClient({
              kibanaServer: servers.kibana,
              security,
              username: ApmUsername.editorUser,
              es,
              logger,
            }),
            annotationWriterUser: await getApmApiClient({
              kibanaServer: servers.kibana,
              security,
              username: ApmUsername.apmAnnotationsWriteUser,
              es,
              logger,
            }),
            noMlAccessUser: await getApmApiClient({
              kibanaServer: servers.kibana,
              security,
              username: ApmUsername.apmReadUserWithoutMlAccess,
              es,
              logger,
            }),
            manageOwnAgentKeysUser: await getApmApiClient({
              kibanaServer: servers.kibana,
              security,
              username: ApmUsername.apmManageOwnAgentKeys,
              es,
              logger,
            }),
            createAndAllAgentKeysUser: await getApmApiClient({
              kibanaServer: servers.kibana,
              security,
              username: ApmUsername.apmManageOwnAndCreateAgentKeys,
              es,
              logger,
            }),
          };
        },
        ml: MachineLearningAPIProvider,
        // legacy clients
        legacySupertestAsNoAccessUser: getLegacySupertestClient(
          kibanaServer,
          ApmUsername.noAccessUser
        ),
        legacySupertestAsApmReadUser: getLegacySupertestClient(
          kibanaServer,
          ApmUsername.viewerUser
        ),
        legacySupertestAsApmWriteUser: getLegacySupertestClient(
          kibanaServer,
          ApmUsername.editorUser
        ),
        legacySupertestAsApmAnnotationsWriteUser: getLegacySupertestClient(
          kibanaServer,
          ApmUsername.apmAnnotationsWriteUser
        ),
        legacySupertestAsApmReadUserWithoutMlAccess: getLegacySupertestClient(
          kibanaServer,
          ApmUsername.apmReadUserWithoutMlAccess
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

export type ApmServices = Awaited<ReturnType<CreateTestConfig>>['services'];
