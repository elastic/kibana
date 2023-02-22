/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Url from 'url';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  AGENT_CONFIG_PATH,
  AGENT_CONFIG_API_KEY_PATH,
  SOURCE_MAP_API_KEY_PATH,
  SOURCE_MAP_PATH,
} from '@kbn/apm-plugin/server/routes/fleet/get_package_policy_decorators';
import expect from '@kbn/expect';
import { get } from 'lodash';
import type { SourceMap } from '@kbn/apm-plugin/server/routes/source_maps/route';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import {
  APM_AGENT_CONFIGURATION_INDEX,
  APM_SOURCE_MAP_INDEX,
} from '@kbn/apm-plugin/server/routes/settings/apm_indices/get_apm_indices';
import { createEsClientForTesting } from '@kbn/test';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createAgentPolicy,
  createPackagePolicy,
  deleteAgentPolicy,
  deletePackagePolicy,
  getPackagePolicy,
  setupFleet,
} from './apm_package_policy_setup';
import { getBettertest } from '../../common/bettertest';
import { expectToReject } from '../../common/utils/expect_to_reject';

export default function ApiTest(ftrProviderContext: FtrProviderContext) {
  const { getService } = ftrProviderContext;
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const supertest = getService('supertest');
  const es = getService('es');
  const bettertest = getBettertest(supertest);

  function createEsClientWithApiKeyAuth({ id, apiKey }: { id: string; apiKey: string }) {
    const config = getService('config');
    return createEsClientForTesting({
      esUrl: Url.format(config.get('servers.elasticsearch')),
      requestTimeout: config.get('timeouts.esRequestTimeout'),
      auth: { apiKey: { id, api_key: apiKey } },
    });
  }

  async function createConfiguration(configuration: any) {
    return apmApiClient.writeUser({
      endpoint: 'PUT /api/apm/settings/agent-configuration',
      params: { body: configuration },
    });
  }

  async function deleteConfiguration(configuration: any) {
    return apmApiClient.writeUser({
      endpoint: 'DELETE /api/apm/settings/agent-configuration',
      params: { body: { service: configuration.service } },
    });
  }

  async function uploadSourcemap({
    bundleFilePath,
    serviceName,
    serviceVersion,
    sourcemap,
  }: {
    bundleFilePath: string;
    serviceName: string;
    serviceVersion: string;
    sourcemap: SourceMap;
  }) {
    const response = await apmApiClient.writeUser({
      endpoint: 'POST /api/apm/sourcemaps',
      type: 'form-data',
      params: {
        body: {
          bundle_filepath: bundleFilePath,
          service_name: serviceName,
          service_version: serviceVersion,
          sourcemap: JSON.stringify(sourcemap),
        },
      },
    });
    return response.body;
  }

  async function getActiveApiKeysCount(packagePolicyId: string) {
    const res = await es.transport.request({
      method: 'GET',
      path: '_security/_query/api_key',
      body: {
        size: 10000,
        query: {
          bool: {
            filter: [
              { term: { 'metadata.application': 'apm' } },
              { term: { 'metadata.package_policy_id': packagePolicyId } },
              { term: { invalidated: false } },
            ],
          },
        },
      },
    });

    // @ts-expect-error
    return res.total as number;
  }

  registry.when('APM package policy', { config: 'basic', archives: [] }, () => {
    let apmPackagePolicy: PackagePolicy;
    let agentPolicyId: string;
    let packagePolicyId: string;

    before(async () => {
      await setupFleet(bettertest);
      agentPolicyId = await createAgentPolicy(bettertest);
      packagePolicyId = await createPackagePolicy(bettertest, agentPolicyId);
      apmPackagePolicy = await getPackagePolicy(bettertest, packagePolicyId); // make sure to get the latest package policy
    });

    after(async () => {
      await deleteAgentPolicy(bettertest, agentPolicyId);
      await deletePackagePolicy(bettertest, packagePolicyId);
      expect(await getActiveApiKeysCount(packagePolicyId)).to.eql(0); // make sure all api keys for the policy are invalidated
    });

    describe('APM package policy callbacks', () => {
      it('sets default values for source maps', async () => {
        const sourceMap = get(apmPackagePolicy, SOURCE_MAP_PATH);
        expect(sourceMap).to.eql([]);
      });

      it('sets default values for agent configs', async () => {
        const agentConfigs = get(apmPackagePolicy, AGENT_CONFIG_PATH);
        expect(agentConfigs).to.eql([]);
      });

      it('creates two API keys for the package policy', async () => {
        expect(await getActiveApiKeysCount(packagePolicyId)).to.eql(2);
      });

      it('has api key that provides access to source maps only', async () => {
        const [id, apiKey] = get(apmPackagePolicy, SOURCE_MAP_API_KEY_PATH).split(':');
        expect(id).to.not.be.empty();
        expect(apiKey).to.not.be.empty();

        const esClient = createEsClientWithApiKeyAuth({ id, apiKey });
        const res = await esClient.search({ index: APM_SOURCE_MAP_INDEX });
        expect(res.hits.hits.length).to.be(0);
      });

      it('has api api key that provides access to the agent configurations index', async () => {
        const [id, apiKey] = get(apmPackagePolicy, AGENT_CONFIG_API_KEY_PATH).split(':');
        expect(id).to.not.be.empty();
        expect(apiKey).to.not.be.empty();

        const esClient = createEsClientWithApiKeyAuth({ id, apiKey });
        const res = await esClient.search({
          index: APM_AGENT_CONFIGURATION_INDEX,
        });

        expect(res.hits.hits.length).to.be(0);
      });

      it('throws when querying agent config index with source map api key', async () => {
        const [id, apiKey] = get(apmPackagePolicy, SOURCE_MAP_API_KEY_PATH).split(':');
        expect(id).to.not.be.empty();
        expect(apiKey).to.not.be.empty();

        const esClient = createEsClientWithApiKeyAuth({ id, apiKey });
        await expectToReject(() => esClient.search({ index: APM_AGENT_CONFIGURATION_INDEX }));
      });

      describe('Agent config', () => {
        let packagePolicyWithAgentConfig: PackagePolicy;
        const testConfiguration = {
          service: {},
          settings: { transaction_sample_rate: '0.55' },
        };
        before(async () => {
          await createConfiguration(testConfiguration);
          packagePolicyWithAgentConfig = await getPackagePolicy(bettertest, packagePolicyId);
        });

        after(async () => {
          await deleteConfiguration(testConfiguration);
        });

        it('sets the expected agent configs on the new package policy object', async () => {
          const agentConfigs = get(packagePolicyWithAgentConfig, AGENT_CONFIG_PATH);
          const { service, config } = agentConfigs[0];
          expect(service).to.eql({});
          expect(config).to.eql({ transaction_sample_rate: '0.55' });
        });
      });

      describe('Source maps', () => {
        let resp: APIReturnType<'POST /api/apm/sourcemaps'>;

        after(async () => {
          await apmApiClient.writeUser({
            endpoint: 'DELETE /api/apm/sourcemaps/{id}',
            params: { path: { id: resp.id } },
          });
        });

        before(async () => {
          resp = await uploadSourcemap({
            serviceName: 'uploading-test',
            serviceVersion: '1.0.0',
            bundleFilePath: 'bar',
            sourcemap: {
              version: 123,
              sources: [''],
              mappings: '',
            },
          });
        });

        it('sets the expected source maps on the new package policy object', async () => {
          const packagePolicyWithSourceMap = await getPackagePolicy(bettertest, packagePolicyId);
          const sourceMap = get(packagePolicyWithSourceMap, SOURCE_MAP_PATH);
          expect(sourceMap).to.eql([
            {
              'bundle.filepath': 'bar',
              'service.name': 'uploading-test',
              'service.version': '1.0.0',
              'sourcemap.url':
                '/api/fleet/artifacts/uploading-test-1.0.0/2f5d4e64ffde4acde832039186ca1652ed315fb0ecbcc1b398677b3bcba521df',
            },
          ]);
        });
      });
    });
  });
}
