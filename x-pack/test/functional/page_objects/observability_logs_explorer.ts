/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export interface IntegrationPackage {
  name: string;
  version: string;
}

const packages: IntegrationPackage[] = [
  {
    name: 'apache',
    version: '1.14.0',
  },
  {
    name: 'aws',
    version: '1.51.0',
  },
  {
    name: 'system',
    version: '1.38.1',
  },
  {
    name: '1password',
    version: '1.18.0',
  },
  {
    name: 'activemq',
    version: '0.13.0',
  },
  {
    name: 'akamai',
    version: '2.14.0',
  },
  {
    name: 'apache_tomcat',
    version: '0.12.1',
  },
  {
    name: 'apm',
    version: '8.4.2',
  },
  {
    name: 'atlassian_bitbucket',
    version: '1.14.0',
  },
  {
    name: 'atlassian_confluence',
    version: '1.15.0',
  },
  {
    name: 'atlassian_jira',
    version: '1.15.0',
  },
  {
    name: 'auditd',
    version: '3.12.0',
  },
  {
    name: 'auditd_manager',
    version: '1.12.0',
  },
  {
    name: 'auth0',
    version: '1.10.0',
  },
  {
    name: 'aws_logs',
    version: '0.5.0',
  },
  {
    name: 'azure',
    version: '1.5.28',
  },
  {
    name: 'azure_app_service',
    version: '0.0.1',
  },
  {
    name: 'azure_blob_storage',
    version: '0.5.0',
  },
  {
    name: 'azure_frontdoor',
    version: '1.1.0',
  },
  {
    name: 'azure_functions',
    version: '0.0.1',
  },
];

const initialPackages = packages.slice(0, 3);
const additionalPackages = packages.slice(3);

export function ObservabilityLogsExplorerPageObject({
  getPageObjects,
  getService,
}: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const supertest = getService('supertest');

  return {
    uninstallPackage: ({ name, version }: IntegrationPackage) => {
      return supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
    },

    installPackage: ({ name, version }: IntegrationPackage) => {
      return supertest
        .post(`/api/fleet/epm/packages/${name}/${version}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true });
    },

    getInstalledPackages: () => {
      return supertest
        .get(`/api/fleet/epm/packages/installed?dataStreamType=logs&perPage=1000`)
        .set('kbn-xsrf', 'xxxx');
    },

    async removeInstalledPackages(): Promise<IntegrationPackage[]> {
      const response = await this.getInstalledPackages();

      // Uninstall installed integration
      await Promise.all(
        response.body.items.map((pkg: IntegrationPackage) => this.uninstallPackage(pkg))
      );

      return response.body.items;
    },

    async setupInitialIntegrations() {
      log.info(`===== Setup initial integration packages. =====`);
      log.info(`===== Uninstall initial integration packages. =====`);
      const uninstalled = await this.removeInstalledPackages();
      log.info(`===== Install ${initialPackages.length} mock integration packages. =====`);
      await Promise.all(initialPackages.map((pkg: IntegrationPackage) => this.installPackage(pkg)));

      return async () => {
        log.info(`===== Uninstall ${initialPackages.length} mock integration packages. =====`);
        await Promise.all(
          initialPackages.map((pkg: IntegrationPackage) => this.uninstallPackage(pkg))
        );
        log.info(`===== Restore pre-existing integration packages. =====`);
        await Promise.all(uninstalled.map((pkg: IntegrationPackage) => this.installPackage(pkg)));
      };
    },

    async setupDataStream(datasetName: string, namespace: string = 'default') {
      const dataStream = `logs-${datasetName}-${namespace}`;
      log.info(`===== Setup initial data stream "${dataStream}". =====`);
      await es.indices.createDataStream({ name: dataStream });

      return async () => {
        log.info(`===== Removing data stream "${dataStream}". =====`);
        await es.indices.deleteDataStream({
          name: dataStream,
        });
      };
    },

    ingestLogEntries(dataStream: string, docs: MockLogDoc[] = []) {
      log.info(`===== Ingesting ${docs.length} docs for "${dataStream}" data stream. =====`);
      return es.bulk({
        body: docs.flatMap((doc) => [{ create: { _index: dataStream } }, createLogDoc(doc)]),
        refresh: 'wait_for',
      });
    },

    async setupAdditionalIntegrations() {
      log.info(`===== Setup additional integration packages. =====`);
      log.info(`===== Install ${additionalPackages.length} mock integration packages. =====`);
      await Promise.all(
        additionalPackages.map((pkg: IntegrationPackage) => this.installPackage(pkg))
      );

      return async () => {
        log.info(`===== Uninstall ${additionalPackages.length} mock integration packages. =====`);
        await Promise.all(
          additionalPackages.map((pkg: IntegrationPackage) => this.uninstallPackage(pkg))
        );
      };
    },
  };
}

interface MockLogDoc {
  time: number;
  logFilepath?: string;
  serviceName?: string;
  namespace: string;
  datasetName: string;
  message?: string;
  logLevel?: string;
  traceId?: string;
  hostName?: string;
  orchestratorClusterId?: string;
  orchestratorClusterName?: string;
  orchestratorResourceId?: string;
  cloudProvider?: string;
  cloudRegion?: string;
  cloudAz?: string;
  cloudProjectId?: string;
  cloudInstanceId?: string;
  agentName?: string;

  [key: string]: unknown;
}

export function createLogDoc({
  time,
  logFilepath,
  serviceName,
  namespace,
  datasetName,
  message,
  logLevel,
  traceId,
  hostName,
  orchestratorClusterId,
  orchestratorClusterName,
  orchestratorResourceId,
  cloudProvider,
  cloudRegion,
  cloudAz,
  cloudProjectId,
  cloudInstanceId,
  agentName,
  ...extraFields
}: MockLogDoc) {
  return {
    input: {
      type: 'log',
    },
    '@timestamp': new Date(time).toISOString(),
    log: {
      file: {
        path: logFilepath,
      },
    },
    ...(serviceName
      ? {
          service: {
            name: serviceName,
          },
        }
      : {}),
    data_stream: {
      namespace,
      type: 'logs',
      dataset: datasetName,
    },
    message,
    event: {
      dataset: datasetName,
    },
    ...(logLevel && { 'log.level': logLevel }),
    ...(traceId && { 'trace.id': traceId }),
    ...(hostName && { 'host.name': hostName }),
    ...(orchestratorClusterId && { 'orchestrator.cluster.id': orchestratorClusterId }),
    ...(orchestratorClusterName && { 'orchestrator.cluster.name': orchestratorClusterName }),
    ...(orchestratorResourceId && { 'orchestrator.resource.id': orchestratorResourceId }),
    ...(cloudProvider && { 'cloud.provider': cloudProvider }),
    ...(cloudRegion && { 'cloud.region': cloudRegion }),
    ...(cloudAz && { 'cloud.availability_zone': cloudAz }),
    ...(cloudProjectId && { 'cloud.project.id': cloudProjectId }),
    ...(cloudInstanceId && { 'cloud.instance.id': cloudInstanceId }),
    ...(agentName && { 'agent.name': agentName }),
    ...extraFields,
  };
}
