/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { agentPolicyRouteService, packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import type {
  GetFullAgentPolicyResponse,
  PackagePolicyConfigRecord,
  UpdatePackagePolicyResponse,
} from '@kbn/fleet-plugin/common';
import { setExportProviders } from '@kbn/security-solution-plugin/common/endpoint/models/export_providers';
import { getPolicyDataForUpdate } from '@kbn/security-solution-plugin/common/endpoint/service/policy';
import type {
  ExportProvider,
  PolicyConfig,
  PolicyData,
} from '@kbn/security-solution-plugin/common/endpoint/types';
import { fetchIntegrationPolicy } from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';
import type { PolicyTestResourceInfo } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_policy';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

const PROVIDER: ExportProvider = {
  id: 'azure-1',
  type: 'azure_blob',
  account_name: 'acct',
  container: 'dumps',
  service_url: 'https://acct.blob.core.windows.net',
};

export default function ({ getService }: FtrProviderContext) {
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const kbnClient = getService('kibanaServer');

  describe('@ess @serverless Export providers in the Elastic Defend policy', function () {
    let testData: PolicyTestResourceInfo;

    /** The stored Elastic Defend package policy (Fleet returns it as a generic package policy) */
    const fetchStoredPolicy = async (): Promise<PolicyData> =>
      (await fetchIntegrationPolicy(kbnClient, testData.packagePolicy.id)) as PolicyData;

    /**
     * Sends the stored policy with its config changed by `update` and `otherConfig` added to the
     * input config, through the Fleet API
     */
    const updatePolicyConfig = async (
      update: (policy: PolicyConfig) => PolicyConfig,
      otherConfig: PackagePolicyConfigRecord = {}
    ) => {
      const body = getPolicyDataForUpdate(await fetchStoredPolicy());
      body.inputs[0].config.policy.value = update(body.inputs[0].config.policy.value);
      Object.assign(body.inputs[0].config, otherConfig);

      return kbnClient.request<UpdatePackagePolicyResponse | { message: string }>({
        method: 'PUT',
        path: packagePolicyRouteService.getUpdatePath(testData.packagePolicy.id),
        headers: { 'elastic-api-version': '2023-10-31' },
        body,
        ignoreErrors: [400],
      });
    };

    const expectRejection = async (
      update: (policy: PolicyConfig) => PolicyConfig,
      expectedMessage: string,
      otherConfig?: PackagePolicyConfigRecord
    ) => {
      const { status, data } = await updatePolicyConfig(update, otherConfig);

      expect(status).to.be(400);
      expect('message' in data && data.message).to.be(expectedMessage);
    };

    beforeEach(async () => {
      testData = await endpointPolicyTestResources.createPolicy();
    });

    afterEach(async () => {
      if (testData) {
        await testData.cleanup();
      }
    });

    it('should save export providers on windows, mac and linux', async () => {
      const { status } = await updatePolicyConfig((policy) =>
        setExportProviders(policy, [PROVIDER])
      );
      expect(status).to.be(200);

      const { value } = (await fetchStoredPolicy()).inputs[0].config.policy;
      for (const os of ['windows', 'mac', 'linux'] as const) {
        expect(value[os].response_actions).to.eql({ export_providers: [PROVIDER] });
      }

      // Endpoint reads the providers from the agent policy that Fleet builds from the input config
      const { data: fullAgentPolicy } = await kbnClient.request<GetFullAgentPolicyResponse>({
        method: 'GET',
        path: agentPolicyRouteService.getInfoFullPath(testData.agentPolicy.id),
        headers: { 'elastic-api-version': '2023-10-31' },
      });
      const endpointInput = fullAgentPolicy.item.inputs.find(
        (input) =>
          input.package_policy_id === testData.packagePolicy.id && input.type === 'endpoint'
      );
      expect(endpointInput).to.be.ok();
      for (const os of ['windows', 'mac', 'linux'] as const) {
        expect(endpointInput?.policy[os].response_actions.export_providers).to.eql([PROVIDER]);
      }
    });

    it('should reject a provider with credentials', async () => {
      // Not a literal at the call site, so the extra `credentials` key needs no cast
      const providerWithCredentials = { ...PROVIDER, credentials: { account_key: 'key' } };

      await expectRejection(
        (policy) => setExportProviders(policy, [providerWithCredentials]),
        'export_providers[0] "azure-1": credentials are not supported yet'
      );
    });

    it('should reject a provider that breaks a field rule', async () => {
      await expectRejection(
        (policy) =>
          setExportProviders(policy, [
            { ...PROVIDER, service_url: 'http://acct.blob.core.windows.net' },
          ]),
        'export_providers[0] "azure-1": service_url must use https'
      );
    });

    it('should reject a service_url that is not an Azure Blob Storage endpoint', async () => {
      await expectRejection(
        (policy) =>
          setExportProviders(policy, [{ ...PROVIDER, service_url: 'https://acct.example.com' }]),
        'export_providers[0] "azure-1": service_url must be an Azure Blob Storage endpoint (*.blob.core.windows.net, *.blob.core.usgovcloudapi.net or *.blob.core.chinacloudapi.cn)'
      );
    });

    it('should reject an input config key that sets response_actions', async () => {
      // Fleet merges the value of every input config key into the agent policy
      await expectRejection(
        (policy) => policy,
        'response_actions can\'t be set through the input config key "policy.windows.response_actions"',
        { 'policy.windows.response_actions': { value: { export_providers: [PROVIDER] } } }
      );
    });
  });
}
