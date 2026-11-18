/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import type { UpdatePackagePolicyResponse } from '@kbn/fleet-plugin/common';
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

    /** Sends the stored policy with its config changed by `update`, through the Fleet API */
    const updatePolicyConfig = async (update: (policy: PolicyConfig) => PolicyConfig) => {
      const body = getPolicyDataForUpdate(await fetchStoredPolicy());
      body.inputs[0].config.policy.value = update(body.inputs[0].config.policy.value);

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
      expectedMessage: string
    ) => {
      const { status, data } = await updatePolicyConfig(update);

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
          setExportProviders(policy, [{ ...PROVIDER, service_url: 'http://acct.example.com' }]),
        'export_providers[0] "azure-1": service_url must use https'
      );
    });
  });
}
