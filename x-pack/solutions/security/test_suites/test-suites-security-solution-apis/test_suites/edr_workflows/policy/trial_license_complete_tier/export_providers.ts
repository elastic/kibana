/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import type { UpdatePackagePolicyResponse } from '@kbn/fleet-plugin/common';
import type {
  SetExportProviderKeyRequestBody,
  SetExportProviderKeyResponse,
} from '@kbn/security-solution-plugin/common/api/endpoint';
import { EXPORT_PROVIDER_KEY_ROUTE } from '@kbn/security-solution-plugin/common/endpoint/constants';
import { setExportProviders } from '@kbn/security-solution-plugin/common/endpoint/models/export_providers';
import { getPolicyDataForUpdate } from '@kbn/security-solution-plugin/common/endpoint/service/policy';
import type {
  ExportProvider,
  PolicyConfig,
  PolicyData,
} from '@kbn/security-solution-plugin/common/endpoint/types';
import { fetchIntegrationPolicy } from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';
import { EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE } from '@kbn/security-solution-plugin/server/endpoint/lib/export_provider_keys/constants';
import type { ExportProviderKeyAttributes } from '@kbn/security-solution-plugin/server/endpoint/lib/export_provider_keys/types';
import type { PolicyTestResourceInfo } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_policy';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

const PROVIDER: ExportProvider = {
  id: 'azure-1',
  type: 'azure_blob',
  account_name: 'acct',
  container: 'dumps',
  service_url: 'https://acct.blob.core.windows.net',
};

/** Syntactically valid (88 base64 characters, padded) storage account key; never a real secret. */
const KEY = `${'A'.repeat(86)}==`;

export default function ({ getService }: FtrProviderContext) {
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const kbnClient = getService('kibanaServer');
  const es = getService('es');
  const retry = getService('retry');

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

    /** The policy's current `version`, required by the key route's optimistic-concurrency check */
    const getStoredVersion = async (): Promise<string> => {
      const { version } = await fetchStoredPolicy();

      if (!version) {
        throw new Error(`Package policy [${testData.packagePolicy.id}] has no version`);
      }

      return version;
    };

    /** Calls `PUT EXPORT_PROVIDER_KEY_ROUTE` for `providerId` of the current test's policy */
    const setProviderKey = (providerId: string, body: SetExportProviderKeyRequestBody) =>
      kbnClient.request<SetExportProviderKeyResponse | { message: string }>({
        method: 'PUT',
        path: EXPORT_PROVIDER_KEY_ROUTE.replace(
          '{package_policy_id}',
          testData.packagePolicy.id
        ).replace('{provider_id}', providerId),
        headers: { 'elastic-api-version': '1', 'x-elastic-internal-origin': 'kibana' },
        body,
        ignoreErrors: [400],
      });

    const getExportProvider = (
      value: PolicyConfig,
      os: 'windows' | 'mac' | 'linux'
    ): ExportProvider => {
      const [provider] = value[os].response_actions?.export_providers ?? [];

      if (!provider) {
        throw new Error(`Expected an export provider on ${os}`);
      }

      return provider;
    };

    /** `windows`' `credentials.key_id`; all three OS branches reference the same key object */
    const getKeyId = (value: PolicyConfig): string => {
      const keyId = getExportProvider(value, 'windows').credentials?.key_id;

      if (!keyId) {
        throw new Error('Expected the windows export provider to reference a key');
      }

      return keyId;
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

    it('should reject a plaintext key set through a policy update', async () => {
      // Deliberately malformed: a plaintext key where only a key reference is accepted. Cast
      // because `ExportProviderCredentials` has no shape for it.
      const providerWithPlaintextKey = {
        ...PROVIDER,
        credentials: { type: 'account_key', account_key: KEY },
      } as unknown as ExportProvider;

      const before = await fetchStoredPolicy();

      await expectRejection(
        (policy) => setExportProviders(policy, [providerWithPlaintextKey]),
        `export_providers[0] "azure-1": credentials must be a key reference; set the key with PUT ${EXPORT_PROVIDER_KEY_ROUTE}`
      );

      const after = await fetchStoredPolicy();
      expect(after.inputs[0].config.policy.value).to.eql(before.inputs[0].config.policy.value);
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

    it('should set the key as a reference, never storing or returning the plaintext', async () => {
      const { status } = await updatePolicyConfig((policy) =>
        setExportProviders(policy, [PROVIDER])
      );
      expect(status).to.be(200);

      const response = await setProviderKey(PROVIDER.id, {
        type: 'account_key',
        account_key: KEY,
        package_policy_version: await getStoredVersion(),
      });
      expect(response.status).to.be(200);
      expect(JSON.stringify(response)).to.not.contain(KEY);

      const { data } = response;
      if (!('item' in data)) {
        throw new Error(`Expected a successful response, got: ${JSON.stringify(data)}`);
      }

      const { value } = data.item.inputs[0].config.policy;
      const keyId = getKeyId(value);
      for (const os of ['windows', 'mac', 'linux'] as const) {
        expect(getExportProvider(value, os)).to.eql({
          ...PROVIDER,
          credentials: { type: 'account_key', key_id: keyId },
        });
      }

      const storedPolicy = await fetchStoredPolicy();
      expect(JSON.stringify(storedPolicy)).to.not.contain(KEY);

      const fullAgentPolicy = await endpointPolicyTestResources.getFullAgentPolicy(
        testData.agentPolicy.id
      );
      expect(JSON.stringify(fullAgentPolicy)).to.not.contain(KEY);

      const { hits } = await es.search<Record<string, ExportProviderKeyAttributes>>({
        index: '.kibana_security_solution*',
        query: { bool: { filter: [{ term: { type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE } }] } },
      });
      const keyDoc = hits.hits.find((hit) => hit._id?.endsWith(keyId));

      if (!keyDoc?._source) {
        throw new Error(`Expected to find the key object [${keyId}] in .kibana_security_solution*`);
      }

      const attributes = keyDoc._source[EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE];
      expect(attributes.package_policy_id).to.be(testData.packagePolicy.id);
      expect(attributes.account_name).to.be(PROVIDER.account_name);
      expect(attributes.account_key).to.not.be(KEY);
    });

    it("should reject a key that isn't the storage account's access key", async () => {
      const { status } = await updatePolicyConfig((policy) =>
        setExportProviders(policy, [PROVIDER])
      );
      expect(status).to.be(200);

      const { status: keyStatus, data } = await setProviderKey(PROVIDER.id, {
        type: 'account_key',
        account_key: 'not-a-valid-storage-account-key',
        package_policy_version: await getStoredVersion(),
      });

      expect(keyStatus).to.be(400);
      expect('message' in data && data.message).to.be(
        "account_key must be the storage account's access key (88 characters, base64)"
      );
    });

    it('should delete the key object when the package policy is deleted', async () => {
      const { status } = await updatePolicyConfig((policy) =>
        setExportProviders(policy, [PROVIDER])
      );
      expect(status).to.be(200);

      const { data } = await setProviderKey(PROVIDER.id, {
        type: 'account_key',
        account_key: KEY,
        package_policy_version: await getStoredVersion(),
      });

      if (!('item' in data)) {
        throw new Error(`Expected a successful response, got: ${JSON.stringify(data)}`);
      }

      const keyId = getKeyId(data.item.inputs[0].config.policy.value);

      // Reused as-is: both searches look for this policy's key object, before and after the delete.
      const keysOfThisPolicyQuery = {
        index: '.kibana_security_solution*',
        query: {
          bool: {
            filter: [
              { term: { type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE } },
              {
                term: {
                  [`${EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE}.package_policy_id`]:
                    testData.packagePolicy.id,
                },
              },
            ],
          },
        },
      };

      // The key object exists before the package policy is deleted.
      const { hits: hitsBeforeDelete } = await es.search(keysOfThisPolicyQuery);
      expect(hitsBeforeDelete.hits.some((hit) => hit._id?.endsWith(keyId))).to.be(true);

      await kbnClient.request({
        method: 'POST',
        path: packagePolicyRouteService.getDeletePath(),
        headers: { 'elastic-api-version': '2023-10-31' },
        body: { packagePolicyIds: [testData.packagePolicy.id] },
      });

      await retry.try(async () => {
        const { hits } = await es.search(keysOfThisPolicyQuery);
        expect(hits.hits.length).to.be(0);
      });
    });
  });
}
