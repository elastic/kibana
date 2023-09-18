/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { ApmSynthtraceEsClient, createLogger, LogLevel } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { createEsClientForTesting } from '@kbn/test';
import * as Url from 'url';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { SecurityRoleDescriptor } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import pRetry from 'p-retry';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { getBettertest } from '../../common/bettertest';
import {
  createAgentPolicy,
  createPackagePolicy,
  deleteAgentPolicyAndPackagePolicyByName,
  setupFleet,
} from './helpers';
import { ApmApiClient } from '../../common/config';

export default function ApiTest(ftrProviderContext: FtrProviderContext) {
  const { getService } = ftrProviderContext;
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const bettertest = getBettertest(supertest);
  const config = getService('config');
  const synthtraceKibanaClient = getService('synthtraceKibanaClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  function createEsClientWithApiKeyAuth({ id, apiKey }: { id: string; apiKey: string }) {
    return createEsClientForTesting({
      esUrl: Url.format(config.get('servers.elasticsearch')),
      requestTimeout: config.get('timeouts.esRequestTimeout'),
      auth: { apiKey: { id, api_key: apiKey } },
    });
  }

  async function getSynthtraceClientForApiKey({
    id,
    api_key: apiKey,
  }: {
    id: string;
    api_key: string;
  }) {
    const esClient = createEsClientWithApiKeyAuth({ id, apiKey });
    const kibanaVersion = await synthtraceKibanaClient.fetchLatestApmPackageVersion();
    return new ApmSynthtraceEsClient({
      client: esClient,
      logger: createLogger(LogLevel.info),
      version: kibanaVersion,
      refreshAfterIndex: true,
    });
  }

  registry.when('APM package policy', { config: 'basic', archives: [] }, () => {
    async function getAgentPolicyPermissions(agentPolicyId: string, packagePolicyId: string) {
      const res = await bettertest<{
        item: { output_permissions: { default: Record<string, SecurityRoleDescriptor> } };
      }>({
        pathname: `/api/fleet/agent_policies/${agentPolicyId}/full`,
        method: 'get',
      });

      return res.body.item.output_permissions.default[packagePolicyId];
    }

    describe('input only package', () => {
      // let apmPackagePolicy: PackagePolicy;
      let agentPolicyId: string;
      let packagePolicyId: string;
      let permissions: SecurityRoleDescriptor;
      const API_KEY_NAME = 'apm_api_key_testing';
      const APM_AGENT_POLICY_NAME = 'apm_agent_policy_testing';
      const APM_PACKAGE_POLICY_NAME = 'apm_package_policy_testing';

      async function cleanAll() {
        try {
          await synthtraceEsClient.clean();
          await es.security.invalidateApiKey({ name: API_KEY_NAME });
          await deleteAgentPolicyAndPackagePolicyByName({
            bettertest,
            agentPolicyName: APM_AGENT_POLICY_NAME,
            packagePolicyName: APM_PACKAGE_POLICY_NAME,
          });
        } catch (e) {
          // log.info('Could not clean', e.message);
        }
      }

      before(async () => {
        await cleanAll();

        await setupFleet(bettertest);
        agentPolicyId = await createAgentPolicy({ bettertest, name: APM_AGENT_POLICY_NAME });
        packagePolicyId = await createPackagePolicy({
          bettertest,
          agentPolicyId,
          name: APM_PACKAGE_POLICY_NAME,
        });

        permissions = await getAgentPolicyPermissions(agentPolicyId, packagePolicyId);
      });

      after(async () => {
        await cleanAll();
      });

      it('has permissions in the agent policy', async () => {
        expect(permissions).to.eql({
          cluster: ['cluster:monitor/main'],
          indices: [
            {
              names: ['traces-*', 'logs-*', 'metrics-*'],
              privileges: ['auto_configure', 'create_doc'],
            },
            {
              names: ['traces-apm.sampled-*'],
              privileges: ['auto_configure', 'create_doc', 'maintenance', 'monitor', 'read'],
            },
          ],
        });
      });

      it('can ingest APM data given the privileges specified in the agent policy', async () => {
        const apiKeyRes = await es.security.createApiKey({
          body: {
            name: API_KEY_NAME,
            role_descriptors: {
              apmFleetPermissions: permissions,
            },
          },
        });

        const scenario = getSynthtraceScenario();
        const customSynthtraceEsClient = await getSynthtraceClientForApiKey(apiKeyRes);
        await customSynthtraceEsClient.index(scenario.events);
        const apmServices = await getApmServices(apmApiClient, scenario.start, scenario.end);

        expect(apmServices).to.eql([
          {
            serviceName: 'opbeans-java',
            transactionType: 'request',
            environments: ['production'],
            agentName: 'java',
            latency: 5000000,
            transactionErrorRate: 0,
            throughput: 1.0000083334027785,
          },
        ]);
      });
    });
  });
}

function getApmServices(apmApiClient: ApmApiClient, start: string, end: string) {
  return pRetry(async () => {
    const services = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services',
      params: {
        query: {
          start,
          end,
          probability: 1,
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          documentType: ApmDocumentType.TransactionMetric,
          rollupInterval: RollupInterval.OneMinute,
        },
      },
    });

    if (services.body.items.length === 0) {
      throw new Error(`Timed-out: No APM Services were found`);
    }

    return services.body.items;
  });
}

function getSynthtraceScenario() {
  const start = new Date('2023-09-01T00:00:00.000Z').getTime();
  const end = new Date('2023-09-01T00:02:00.000Z').getTime() - 1;

  const opbeansJava = apm
    .service({ name: 'opbeans-java', environment: 'production', agentName: 'java' })
    .instance('instance');

  const events = timerange(start, end)
    .ratePerMinute(1)
    .generator((timestamp) => {
      return [
        opbeansJava
          .transaction({ transactionName: 'tx-java' })
          .timestamp(timestamp)
          .duration(5000)
          .success(),
      ];
    });

  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    events,
  };
}
