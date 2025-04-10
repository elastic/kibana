/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogLevel,
  LogsSynthtraceEsClient,
  SyntheticsSynthtraceEsClient,
  createLogger,
} from '@kbn/apm-synthtrace';
import { createDatasetQualityUsers } from '@kbn/dataset-quality-plugin/server/test_helpers/create_dataset_quality_users';
import {
  DATASET_QUALITY_TEST_PASSWORD,
  DatasetQualityUsername,
} from '@kbn/dataset-quality-plugin/server/test_helpers/create_dataset_quality_users/authentication';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import {
  fleetPackageRegistryDockerImage,
  FtrConfigProviderContext,
  defineDockerServersConfig,
} from '@kbn/test';
import path from 'path';
import supertest from 'supertest';
import { UrlObject, format } from 'url';
import { DatasetQualityFtrConfigName } from '../configs';
import { createDatasetQualityApiClient } from './dataset_quality_api_supertest';
import {
  FtrProviderContext,
  InheritedFtrProviderContext,
  InheritedServices,
} from './ftr_provider_context';
import { RegistryProvider } from './registry';

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
  | 'datasetQualityMonitorUser';

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
    syntheticsSynthtraceEsClient: (
      context: InheritedFtrProviderContext
    ) => SyntheticsSynthtraceEsClient;
    datasetQualityApiClient: (context: InheritedFtrProviderContext) => DatasetQualityApiClient;
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
    const packageRegistryConfig = path.join(__dirname, './fixtures/package_registry_config.yml');
    const xPackAPITestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.ts')
    );

    const dockerArgs: string[] = ['-v', `${packageRegistryConfig}:/package-registry/config.yml`];

    const services = xPackAPITestsConfig.get('services');
    const servers = xPackAPITestsConfig.get('servers');
    const kibanaServer = servers.kibana as UrlObject;
    const kibanaServerUrl = format(kibanaServer);
    const esServer = servers.elasticsearch as UrlObject;

    /**
     * This is used by CI to set the docker registry port
     * you can also define this environment variable locally when running tests which
     * will spin up a local docker package registry locally for you
     * if this is defined it takes precedence over the `packageRegistryOverride` variable
     */
    const dockerRegistryPort: string | undefined = process.env.FLEET_PACKAGE_REGISTRY_PORT;

    return {
      testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
      testFiles: [require.resolve('../tests')],
      servers,
      dockerServers: defineDockerServersConfig({
        registry: {
          enabled: !!dockerRegistryPort,
          image: fleetPackageRegistryDockerImage,
          portInContainer: 8080,
          port: dockerRegistryPort,
          args: dockerArgs,
          waitForLogLine: 'package manifests loaded',
          waitForLogLineTimeoutMs: 60 * 2 * 10000, // 2 minutes
        },
      }),
      servicesRequiredForTestAnalysis: ['datasetQualityFtrConfig', 'registry'],
      services: {
        ...services,
        datasetQualityFtrConfig: () => config,
        registry: RegistryProvider,
        logSynthtraceEsClient: (context: InheritedFtrProviderContext) =>
          new LogsSynthtraceEsClient({
            client: context.getService('es'),
            logger: createLogger(LogLevel.info),
            refreshAfterIndex: true,
          }),
        syntheticsSynthtraceEsClient: (context: InheritedFtrProviderContext) =>
          new SyntheticsSynthtraceEsClient({
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
            datasetQualityMonitorUser: await getDatasetQualityApiClient({
              kibanaServer,
              username: DatasetQualityUsername.datasetQualityMonitorUser,
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
          `--xpack.fleet.packages.0.name=endpoint`,
          `--xpack.fleet.packages.0.version=latest`,
          ...(dockerRegistryPort
            ? [`--xpack.fleet.registryUrl=http://localhost:${dockerRegistryPort}`]
            : []),
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
