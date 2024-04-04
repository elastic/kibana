/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { ApmSynthtraceEsClient, createLogger, LogLevel } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { createEsClientForFtrConfig } from '@kbn/test';
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

  const API_KEY_NAME = 'apm_api_key_testing';
  const APM_AGENT_POLICY_NAME = 'apm_agent_policy_testing';
  const APM_PACKAGE_POLICY_NAME = 'apm_package_policy_testing';

  function createEsClientWithApiKey({ id, apiKey }: { id: string; apiKey: string }) {
    return createEsClientForFtrConfig(config, { auth: { apiKey: { id, api_key: apiKey } } });
  }

  function createEsClientWithToken(token: string) {
    return createEsClientForFtrConfig(config, { auth: { bearer: token } });
  }

  async function getApiKeyForServiceAccount(
    serviceAccount: string,
    permissions: SecurityRoleDescriptor
  ) {
    const { token } = await es.security.createServiceToken({
      namespace: 'elastic',
      service: serviceAccount,
    });

    const esClientScoped = createEsClientWithToken(token.value);
    return esClientScoped.security.createApiKey({
      body: {
        name: API_KEY_NAME,
        role_descriptors: {
          apmFleetPermissions: permissions,
        },
      },
    });
  }

  async function getSynthtraceClientWithApiKey({
    id,
    api_key: apiKey,
  }: {
    id: string;
    api_key: string;
  }) {
    const esClient = createEsClientWithApiKey({ id, apiKey });
    const kibanaVersion = await synthtraceKibanaClient.fetchLatestApmPackageVersion();
    return new ApmSynthtraceEsClient({
      client: esClient,
      logger: createLogger(LogLevel.info),
      version: kibanaVersion,
      refreshAfterIndex: true,
    });
  }

  // FLAKY: https://github.com/elastic/kibana/issues/177384
  registry.when('APM package policy', { config: 'basic', archives: [] }, () => {
    async function getAgentPolicyPermissions(agentPolicyId: string, packagePolicyId: string) {
      const res = await bettertest<{
        item: { output_permissions: { [key: string]: Record<string, SecurityRoleDescriptor> } };
      }>({
        pathname: `/api/fleet/agent_policies/${agentPolicyId}/full`,
        method: 'get',
      });

      return Object.values(res.body.item.output_permissions)[0][packagePolicyId];
    }

    describe('input only package', () => {
      let agentPolicyId: string;
      let packagePolicyId: string;
      let permissions: SecurityRoleDescriptor;

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
          log.info('Nothing to clean');
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

      describe('when ingesting events using the scoped api key', () => {
        let scenario: ReturnType<typeof getSynthtraceScenario>;

        before(async () => {
          scenario = getSynthtraceScenario();

          // get api key scoped to the specified permissions and created with the fleet-server service account. This ensures that the api key is not created with more permissions than fleet-server is able to.
          const apiKey = await getApiKeyForServiceAccount('fleet-server', permissions);

          // create a synthtrace client scoped to the api key. This verifies that the api key has permissions to write to the APM indices.
          const scopedSynthtraceEsClient = await getSynthtraceClientWithApiKey(apiKey);
          await scopedSynthtraceEsClient.index(scenario.events);
        });

        it('the events can be seen on the Service Inventory Page', async () => {
          const apmServices = await getApmServices(apmApiClient, scenario.start, scenario.end);
          expect(apmServices[0].serviceName).to.be('opbeans-java');
          expect(apmServices[0].environments?.[0]).to.be('ingested-via-fleet');
          expect(apmServices[0].latency).to.be(2550000);
          expect(apmServices[0].throughput).to.be(2);
          expect(apmServices[0].transactionErrorRate).to.be(0.5);
        });
      });
    });
  });
}

function getApmServices(apmApiClient: ApmApiClient, start: string, end: string) {
  return pRetry(async () => {
    const res = await apmApiClient.readUser({
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
          useDurationSummary: true,
        },
      },
    });

    if (res.body.items.length === 0 || !res.body.items[0].latency) {
      throw new Error(`Timed-out: No APM Services were found`);
    }

    return res.body.items;
  });
}

function getSynthtraceScenario() {
  const start = new Date('2023-09-01T00:00:00.000Z').getTime();
  const end = new Date('2023-09-01T00:02:00.000Z').getTime();

  const opbeansJava = apm
    .service({ name: 'opbeans-java', environment: 'ingested-via-fleet', agentName: 'java' })
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

        opbeansJava
          .transaction({ transactionName: 'tx-java' })
          .timestamp(timestamp)
          .duration(100)
          .failure()
          .errors(opbeansJava.error({ message: 'some error' }).timestamp(timestamp + 50)),
      ];
    });

  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    events,
  };
}
