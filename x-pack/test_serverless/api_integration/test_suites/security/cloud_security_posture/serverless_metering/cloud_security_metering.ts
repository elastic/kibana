import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

import { RoleCredentials } from 'x-pack/test_serverless/shared/services';
import {
  deleteIndex,
  addIndex,
  createPackagePolicy,
} from '../../../../../../test/api_integration/apis/cloud_security_posture/helper'; // eslint-disable-line @kbn/imports/no_boundary_crossing
import {
  cnvmFindingsMockDataForMetering,
  cspmFindingsMockDataForMetering,
  defendForContainersHeartbeatsForMetering,
  kspmFindingsMockDataForMetering,
} from '../../../../../../test/api_integration/apis/cloud_security_posture/mock_data'; // eslint-disable-line @kbn/imports/no_boundary_crossing
import {
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import { UsageRecord, getInterceptedRequestPayload, setupMockServer } from './mock_usage_server';

const CLOUD_DEFEND_HEARTBEAT_INDEX_DEFAULT_NS = 'metrics-cloud_defend.heartbeat-default';

export default function (providerContext: FtrProviderContext) {
  const mockUsageApiServer = setupMockServer();
  const { getService } = providerContext;
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  /*
  This test aims to intercept the usage API request sent by the metering background task manager.
  The task manager is running by default in security serverless project in the background and sending usage API requests to the usage API.
   This test mocks the usage API server and intercepts the usage API request sent by the metering background task manager.
  */
  describe('Intercept the usage API request sent by the metering background task manager', function () {
    let agentPolicyId: string;
    let roleAuthc: RoleCredentials;
    let internalRequestHeader: { 'x-elastic-internal-origin': string; 'kbn-xsrf': string };

    before(async () => {
      mockUsageApiServer.listen(8081); // Start the usage api mock server on port 8081
    });

    after(async () => {
      // server.disable();
      console.log('Mock server is stopped');
    });

    beforeEach(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalRequestHeader = svlCommonApi.getInternalRequestHeader();

      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');

      const { body: agentPolicyResponse } = await supertestWithoutAuth
        .post(`/api/fleet/agent_policies`)
        .set(internalRequestHeader)
        .set(roleAuthc.apiKeyHeader)
        .send({
          name: 'Test policy',
          namespace: 'default',
        });

      agentPolicyId = agentPolicyResponse.item.id;

      await deleteIndex(es, [
        LATEST_FINDINGS_INDEX_DEFAULT_NS,
        LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
        CLOUD_DEFEND_HEARTBEAT_INDEX_DEFAULT_NS,
      ]);
    });

    afterEach(async () => {
      await deleteIndex(es, [
        LATEST_FINDINGS_INDEX_DEFAULT_NS,
        LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
      ]);
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await deleteIndex(es, [
        LATEST_FINDINGS_INDEX_DEFAULT_NS,
        LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
        CLOUD_DEFEND_HEARTBEAT_INDEX_DEFAULT_NS,
      ]);
    });

    it('Should intercept usage API request for CSPM', async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'cspm',
        'cloudbeat/cis_aws',
        'aws',
        'cspm',
        'CSPM-1',
        roleAuthc,
        internalRequestHeader
      );
      await addIndex(es, cspmFindingsMockDataForMetering, LATEST_FINDINGS_INDEX_DEFAULT_NS);
      // await new Promise(() => {});
      let interceptedRequestBody: UsageRecord[] = [];
      await retry.try(async () => {
        interceptedRequestBody = getInterceptedRequestPayload();
        expect(interceptedRequestBody.length).to.greaterThan(0);
        if (interceptedRequestBody.length > 0) {
          const usageSubTypes = interceptedRequestBody.map((record) => record.usage.sub_type);
          expect(usageSubTypes).to.contain('cspm');
        }
      });

      expect(interceptedRequestBody[0].usage.type).to.be('cloud_security');
      expect(interceptedRequestBody[0].usage.quantity).to.be(2);
    });

    it('Should intercept usage API request for KSPM', async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm',
        'KSPM-1',
        roleAuthc,
        internalRequestHeader
      );
      await addIndex(es, kspmFindingsMockDataForMetering, LATEST_FINDINGS_INDEX_DEFAULT_NS);

      let interceptedRequestBody: UsageRecord[] = [];

      await retry.try(async () => {
        interceptedRequestBody = getInterceptedRequestPayload();
        expect(interceptedRequestBody.length).to.greaterThan(0);
        if (interceptedRequestBody.length > 0) {
          const usageSubTypes = interceptedRequestBody.map((record) => record.usage.sub_type);
          expect(usageSubTypes).to.contain('kspm');
        }
      });

      expect(interceptedRequestBody[0].usage.type).to.be('cloud_security');
      expect(interceptedRequestBody[0].usage.quantity).to.be(1);
    });

    it('Should intercept usage API request for CNVM', async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'vuln_mgmt',
        'cloudbeat/vuln_mgmt_aws',
        'aws',
        'vuln_mgmt',
        'CNVM-1',
        roleAuthc,
        internalRequestHeader
      );
      await addIndex(es, cnvmFindingsMockDataForMetering, LATEST_VULNERABILITIES_INDEX_DEFAULT_NS);

      let interceptedRequestBody: UsageRecord[] = [];

      await retry.try(async () => {
        interceptedRequestBody = getInterceptedRequestPayload();
        expect(interceptedRequestBody.length).to.greaterThan(0);
        if (interceptedRequestBody.length > 0) {
          const usageSubTypes = interceptedRequestBody.map((record) => record.usage.sub_type);
          expect(usageSubTypes).to.contain('cnvm');
        }
      });

      expect(interceptedRequestBody[0].usage.type).to.be('cloud_security');
      expect(interceptedRequestBody[0].usage.quantity).to.be(2);
    });

    it('Should intercept usage API request for Defend for Containers', async () => {
      await es.indices.putMapping({
        index: CLOUD_DEFEND_HEARTBEAT_INDEX_DEFAULT_NS,
        properties: { event: { properties: { ingested: { type: 'date' } } } },
      });
      await addIndex(
        es,
        defendForContainersHeartbeatsForMetering,
        CLOUD_DEFEND_HEARTBEAT_INDEX_DEFAULT_NS
      );

      let interceptedRequestBody: UsageRecord[] = [];

      await retry.try(async () => {
        interceptedRequestBody = getInterceptedRequestPayload();
        expect(interceptedRequestBody.length).to.greaterThan(0);
        if (interceptedRequestBody.length > 0) {
          const usageSubTypes = interceptedRequestBody.map((record) => record.usage.sub_type);
          expect(usageSubTypes).to.contain('cloud_defend');
        }
      });

      expect(interceptedRequestBody[0].usage.type).to.be('cloud_security');
      expect(interceptedRequestBody[0].usage.quantity).to.be(1);
      expect(interceptedRequestBody[0].usage.period_seconds).to.be(3600);
    });
  });
}
