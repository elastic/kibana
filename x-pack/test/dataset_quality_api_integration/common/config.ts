/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DatasetQualityUsername,
  DATASET_QUALITY_TEST_PASSWORD,
} from '@kbn/dataset-quality-plugin/server/test_helpers/create_dataset_quality_users/authentication';
import { createDatasetQualityUsers } from '@kbn/dataset-quality-plugin/server/test_helpers/create_dataset_quality_users';
import { FtrConfigProviderContext } from '@kbn/test';
import supertest from 'supertest';
import { format, UrlObject } from 'url';
import { createLogger, LogLevel, LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import {
  FtrProviderContext,
  InheritedFtrProviderContext,
  InheritedServices,
} from './ftr_provider_context';
import { createDatasetQualityApiClient } from './dataset_quality_api_supertest';
import { RegistryProvider } from './registry';
import { DatasetQualityFtrConfigName } from '../configs';
import { PackageService } from './package_service';

export interface DatasetQualityFtrConfig {
  name: DatasetQualityFtrConfigName;
  license: 'basic';
  kibanaConfig?: Record<string, any>;
}

async function getDatasetQualityApiClient({
  kibanaServer,
  username,
}: {
  kibanaServer: UrlObject;
  username: DatasetQualityUsername | 'elastic';
}) {
  const url = format({
    ...kibanaServer,
    auth: `${username}:${DATASET_QUALITY_TEST_PASSWORD}`,
  });

  return createDatasetQualityApiClient(supertest(url));
}

export type CreateTestConfig = ReturnType<typeof createTestConfig>;

export type DatasetQualityApiClientKey =
  | 'noAccessUser'
  | 'viewerUser'
  | 'readUser'
  | 'adminUser'
  | 'writeUser'
  | 'datasetQualityLogsUser';

export type DatasetQualityApiClient = Record<
  DatasetQualityApiClientKey,
  Awaited<ReturnType<typeof getDatasetQualityApiClient>>
>;

export interface CreateTest {
  testFiles: string[];
  servers: any;
  servicesRequiredForTestAnalysis: string[];
  services: InheritedServices & {
    datasetQualityFtrConfig: () => DatasetQualityFtrConfig;
    registry: ({ getService }: FtrProviderContext) => ReturnType<typeof RegistryProvider>;
    logSynthtraceEsClient: (
      context: InheritedFtrProviderContext
    ) => Promise<LogsSynthtraceEsClient>;
    datasetQualityApiClient: (context: InheritedFtrProviderContext) => DatasetQualityApiClient;
    packageService: ({ getService }: FtrProviderContext) => ReturnType<typeof PackageService>;
  };
  junit: { reportName: string };
  esTestCluster: any;
  kbnTestServer: any;
}

export function createTestConfig(
  config: DatasetQualityFtrConfig
): ({ readConfigFile }: FtrConfigProviderContext) => Promise<CreateTest> {
  const { license, name, kibanaConfig } = config;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackAPITestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.ts')
    );

    const services = xPackAPITestsConfig.get('services');
    const servers = xPackAPITestsConfig.get('servers');
    const kibanaServer = servers.kibana as UrlObject;
    const kibanaServerUrl = format(kibanaServer);
    const esServer = servers.elasticsearch as UrlObject;

    return {
      testFiles: [require.resolve('../tests')],
      servers,
      servicesRequiredForTestAnalysis: ['datasetQualityFtrConfig', 'registry'],
      services: {
        ...services,
        packageService: PackageService,
        datasetQualityFtrConfig: () => config,
        registry: RegistryProvider,
        logSynthtraceEsClient: (context: InheritedFtrProviderContext) =>
          new LogsSynthtraceEsClient({
            client: context.getService('es'),
            logger: createLogger(LogLevel.info),
            refreshAfterIndex: true,
          }),
        datasetQualityApiClient: async (_: InheritedFtrProviderContext) => {
          const { username, password } = servers.kibana;
          const esUrl = format(esServer);

          // Creates DatasetQuality users
          await createDatasetQualityUsers({
            elasticsearch: { node: esUrl, username, password },
            kibana: { hostname: kibanaServerUrl },
          });

          return {
            noAccessUser: await getDatasetQualityApiClient({
              kibanaServer,
              username: DatasetQualityUsername.noAccessUser,
            }),
            viewerUser: await getDatasetQualityApiClient({
              kibanaServer,
              username: DatasetQualityUsername.viewerUser,
            }),
            readUser: await getDatasetQualityApiClient({
              kibanaServer,
              username: DatasetQualityUsername.readUser,
            }),
            adminUser: await getDatasetQualityApiClient({
              kibanaServer,
              username: 'elastic',
            }),
            writeUser: await getDatasetQualityApiClient({
              kibanaServer,
              username: DatasetQualityUsername.editorUser,
            }),
            datasetQualityLogsUser: await getDatasetQualityApiClient({
              kibanaServer,
              username: DatasetQualityUsername.datasetQualityLogsUser,
            }),
          };
        },
      },
      junit: {
        reportName: `Dataset quality API Integration tests (${name})`,
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

export type DatasetQualityServices = Awaited<ReturnType<CreateTestConfig>>['services'];
