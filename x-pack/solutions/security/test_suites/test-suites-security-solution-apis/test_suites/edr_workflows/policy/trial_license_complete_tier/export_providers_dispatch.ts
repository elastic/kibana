/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENT_ACTIONS_INDEX, packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import {
  ENDPOINT_ACTIONS_INDEX,
  EXPORT_PROVIDER_KEY_ROUTE,
  GET_FILE_ROUTE,
  MEMORY_DUMP_ROUTE,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { wrapErrorAndRejectPromise } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/utils';
import type {
  SetExportProviderKeyRequestBody,
  SetExportProviderKeyResponse,
} from '@kbn/security-solution-plugin/common/api/endpoint';
import { setExportProviders } from '@kbn/security-solution-plugin/common/endpoint/models/export_providers';
import { getPolicyDataForUpdate } from '@kbn/security-solution-plugin/common/endpoint/service/policy';
import type {
  ActionDetails,
  ExportProvider,
  PolicyConfig,
  PolicyData,
} from '@kbn/security-solution-plugin/common/endpoint/types';
import { fetchIntegrationPolicy } from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';
import type TestAgent from 'supertest/lib/agent';
import type { IndexedHostsAndAlertsResponseExtended } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

/** Syntactically valid (88 base64 characters, padded) storage account key; never a real secret. */
const KEY = `${'A'.repeat(86)}==`;

const PROVIDER_WITH_KEY: ExportProvider = {
  id: 'azure-with-key',
  type: 'azure_blob',
  account_name: 'acct',
  container: 'dumps',
  service_url: 'https://acct.blob.core.windows.net',
};

const PROVIDER_WITHOUT_KEY: ExportProvider = {
  id: 'azure-without-key',
  type: 'azure_blob',
  account_name: 'acct2',
  container: 'dumps2',
};

/** The raw action document Fleet stores in `.fleet-actions` */
interface FleetActionDoc {
  data: {
    command: string;
    parameters?: Record<string, unknown>;
    credentials?: Record<string, unknown>;
  };
}

/** The raw action document Endpoint reads from `.logs-endpoint.actions-default` */
interface EndpointActionDoc {
  EndpointActions: {
    action_id: string;
    data: {
      command: string;
      parameters?: Record<string, unknown>;
    };
  };
}

export default function ({ getService }: FtrProviderContext) {
  const endpointTestResources = getService('endpointTestResources');
  const kbnClient = getService('kibanaServer');
  const es = getService('es');
  const utils = getService('securitySolutionUtils');
  const log = getService('log');

  // @skipInServerlessMKI - this test reads the Fleet and Endpoint action indices directly
  describe('@ess @serverless @skipInServerlessMKI Export providers used to dispatch get-file / memory-dump', function () {
    let indexedData: IndexedHostsAndAlertsResponseExtended;
    let agentId = '';
    let packagePolicyId = '';
    let endpointOperationsAnalystSupertest: TestAgent;

    /** The stored Elastic Defend package policy (Fleet returns it as a generic package policy) */
    const fetchStoredPolicy = async (): Promise<PolicyData> =>
      (await fetchIntegrationPolicy(kbnClient, packagePolicyId)) as PolicyData;

    /** Sends the host's stored policy with its config changed by `update`, through the Fleet API */
    const updatePolicyConfig = async (
      update: (policy: PolicyConfig) => PolicyConfig
    ): Promise<void> => {
      const body = getPolicyDataForUpdate(await fetchStoredPolicy());
      body.inputs[0].config.policy.value = update(body.inputs[0].config.policy.value);

      await kbnClient.request({
        method: 'PUT',
        path: packagePolicyRouteService.getUpdatePath(packagePolicyId),
        headers: { 'elastic-api-version': '2023-10-31' },
        body,
      });
    };

    /** The policy's current `version`, required by the key route's optimistic-concurrency check */
    const getStoredVersion = async (): Promise<string> => {
      const { version } = await fetchStoredPolicy();

      if (!version) {
        throw new Error(`Package policy [${packagePolicyId}] has no version`);
      }

      return version;
    };

    /** Calls `PUT EXPORT_PROVIDER_KEY_ROUTE` for `providerId` of the loaded host's policy */
    const setProviderKey = (providerId: string, body: SetExportProviderKeyRequestBody) =>
      kbnClient.request<SetExportProviderKeyResponse>({
        method: 'PUT',
        path: EXPORT_PROVIDER_KEY_ROUTE.replace('{package_policy_id}', packagePolicyId).replace(
          '{provider_id}',
          providerId
        ),
        headers: { 'elastic-api-version': '1', 'x-elastic-internal-origin': 'kibana' },
        body,
      });

    const fetchFleetActionDoc = async (actionId: string): Promise<FleetActionDoc> => {
      const { hits } = await es.search<FleetActionDoc>({
        index: AGENT_ACTIONS_INDEX,
        query: { term: { action_id: actionId } },
      });
      const doc = hits.hits[0]?._source;

      if (!doc) {
        throw new Error(`Expected a [${AGENT_ACTIONS_INDEX}] doc for action [${actionId}]`);
      }

      return doc;
    };

    const fetchEndpointActionDoc = async (actionId: string): Promise<EndpointActionDoc> => {
      const { hits } = await es.search<EndpointActionDoc>({
        index: ENDPOINT_ACTIONS_INDEX,
        query: { term: { 'EndpointActions.action_id': actionId } },
      });
      const doc = hits.hits[0]?._source;

      if (!doc) {
        throw new Error(`Expected a [${ENDPOINT_ACTIONS_INDEX}] doc for action [${actionId}]`);
      }

      return doc;
    };

    before(async () => {
      // Alerts and sample response actions aren't needed and only add load (see
      // https://github.com/elastic/kibana/issues/248913)
      indexedData = await endpointTestResources.loadEndpointData({
        alertsPerHost: 0,
        withResponseActions: false,
      });
      agentId = indexedData.hosts[0].agent.id;
      packagePolicyId = indexedData.integrationPolicies[0].id;
      endpointOperationsAnalystSupertest = await utils.createSuperTest(
        ROLE.endpoint_operations_analyst
      );

      // One provider with a key (used for the happy paths) and one without (used for the
      // "no key" error case). Both are already in the policy, so only the key route's error
      // is exercised there, not the "provider not in the policy" one.
      await updatePolicyConfig((policy) =>
        setExportProviders(policy, [PROVIDER_WITH_KEY, PROVIDER_WITHOUT_KEY])
      );
      await setProviderKey(PROVIDER_WITH_KEY.id, {
        type: 'account_key',
        account_key: KEY,
        package_policy_version: await getStoredVersion(),
      });
    });

    after(async () => {
      if (indexedData) {
        await indexedData.unloadEndpointData().catch((error) => {
          log.warning(`afterAll data clean up threw error: ${error.message}`);
        });
      }
    });

    it('dispatches a get-file action with an export provider', async () => {
      const { body } = await endpointOperationsAnalystSupertest
        .post(GET_FILE_ROUTE)
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .send({
          endpoint_ids: [agentId],
          parameters: { path: '/test/path/test.txt', export: PROVIDER_WITH_KEY.id },
        })
        .expect(200)
        .catch(wrapErrorAndRejectPromise);

      const action = body.data as ActionDetails;
      const expectedExportPath = `${action.id}/upload.zip`;

      expect(action.agents).to.eql([agentId]);
      // The caller-facing response never carries the SAS or the account key.
      expect(JSON.stringify(body)).to.not.contain('credentials');
      expect(JSON.stringify(body)).to.not.contain('sig=');

      const fleetActionDoc = await fetchFleetActionDoc(action.id);
      expect(fleetActionDoc.data.parameters?.export_path).to.be(expectedExportPath);
      expect(Object.keys(fleetActionDoc.data.credentials ?? {})).to.eql(['sas']);

      const sasParams = new URLSearchParams(String(fleetActionDoc.data.credentials?.sas));
      expect(sasParams.get('sr')).to.be('b');
      expect(sasParams.get('sp')).to.be('rcw');
      expect(sasParams.get('spr')).to.be('https');
      expect(sasParams.get('sv')).to.be('2022-11-02');

      const endpointActionDoc = await fetchEndpointActionDoc(action.id);
      expect(endpointActionDoc.EndpointActions.data.parameters?.export_path).to.be(
        expectedExportPath
      );
      // The request document Endpoint reads never carries the SAS or the account key.
      const stringifiedEndpointActionDoc = JSON.stringify(endpointActionDoc);
      expect(stringifiedEndpointActionDoc).to.not.contain('credentials');
      expect(stringifiedEndpointActionDoc).to.not.contain('sig=');
    });

    it('dispatches a memory-dump action with an export provider', async () => {
      const { body } = await endpointOperationsAnalystSupertest
        .post(MEMORY_DUMP_ROUTE)
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .send({
          endpoint_ids: [agentId],
          // The memory-dump route rejects a request without an explicit `agent_type`
          agent_type: 'endpoint',
          parameters: { type: 'raw', export: PROVIDER_WITH_KEY.id },
        })
        .expect(200)
        .catch(wrapErrorAndRejectPromise);

      const action = body.data as ActionDetails;
      expect(action.command).to.eql('memory-dump');

      const fleetActionDoc = await fetchFleetActionDoc(action.id);
      expect(fleetActionDoc.data.parameters?.export_path).to.be(`${action.id}/upload.zip`);
      expect(Object.keys(fleetActionDoc.data.credentials ?? {})).to.eql(['sas']);
    });

    it('returns 400 for an export provider id that is not in the policy', async () => {
      const { body } = await endpointOperationsAnalystSupertest
        .post(GET_FILE_ROUTE)
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .send({
          endpoint_ids: [agentId],
          parameters: { path: '/test/path/test.txt', export: 'unknown-provider' },
        })
        .expect(400);

      expect(body.message).to.be(
        `Export provider [unknown-provider] was not found in the Elastic Defend policy of agent [${agentId}]`
      );
    });

    it('returns 400 for an export provider with no storage account key', async () => {
      const { body } = await endpointOperationsAnalystSupertest
        .post(GET_FILE_ROUTE)
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .send({
          endpoint_ids: [agentId],
          parameters: { path: '/test/path/test.txt', export: PROVIDER_WITHOUT_KEY.id },
        })
        .expect(400);

      expect(body.message).to.be(
        `Export provider [${PROVIDER_WITHOUT_KEY.id}] has no storage account key. Set the key on the Storage providers tab of the Elastic Defend policy`
      );
    });

    it('rejects a request body that sets parameters.export_path', async () => {
      await endpointOperationsAnalystSupertest
        .post(GET_FILE_ROUTE)
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .send({
          endpoint_ids: [agentId],
          parameters: {
            path: '/test/path/test.txt',
            export: PROVIDER_WITH_KEY.id,
            export_path: 'caller-cannot-set-this',
          },
        })
        .expect(400);
    });
  });
}
