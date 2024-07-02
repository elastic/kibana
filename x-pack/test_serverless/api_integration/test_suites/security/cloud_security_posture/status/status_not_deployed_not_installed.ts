/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { CspSetupStatus } from '@kbn/cloud-security-posture-plugin/common/types_old';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { createPackagePolicy } from '../../../../../../test/api_integration/apis/cloud_security_posture/helper'; // eslint-disable-line @kbn/imports/no_boundary_crossing
import { RoleCredentials } from '../../../../../shared/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');

  describe('GET /internal/cloud_security_posture/status', function () {
    // security_exception: action [indices:admin/create] is unauthorized for user [elastic] with effective roles [superuser] on restricted indices [.fleet-actions-7], this action is granted by the index privileges [create_index,manage,all]
    this.tags(['failsOnMKI']);

    let agentPolicyId: string;
    let roleAuthc: RoleCredentials;
    let internalRequestHeader: { 'x-elastic-internal-origin': string; 'kbn-xsrf': string };

    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalRequestHeader = svlCommonApi.getInternalRequestHeader();
    });

    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    describe('STATUS = NOT-DEPLOYED and STATUS = NOT-INSTALLED TEST', () => {
      beforeEach(async () => {
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
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });
      it(`Should return not-deployed when installed kspm, no findings on either indices and no healthy agents`, async () => {
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

        const { body: res }: { body: CspSetupStatus } = await supertestWithoutAuth
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(internalRequestHeader)
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(res.kspm.status).to.eql(
          'not-deployed',
          `expected kspm status to be not-deployed but got ${res.kspm.status} instead`
        );
        expect(res.cspm.status).to.eql(
          'not-installed',
          `expected cspm status to be not-installed but got ${res.cspm.status} instead`
        );
        expect(res.vuln_mgmt.status).to.eql(
          'not-installed',
          `expected vuln_mgmt status to be not-installed but got ${res.vuln_mgmt.status} instead`
        );
        expect(res.kspm.healthyAgents).to.eql(
          0,
          `expected number of kspm healthy agents to be 0 but got ${res.kspm.healthyAgents} instead`
        );
        expect(res.kspm.installedPackagePolicies).to.eql(
          1,
          `expected number of kspm installed package policies to be 1 but got ${res.kspm.installedPackagePolicies} instead`
        );
      });

      it(`Should return not-deployed when installed cspm, no findings on either indices and no healthy agents`, async () => {
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

        const { body: res }: { body: CspSetupStatus } = await supertestWithoutAuth
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(internalRequestHeader)
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(res.cspm.status).to.eql(
          'not-deployed',
          `expected cspm status to be not-deployed but got ${res.cspm.status} instead`
        );
        expect(res.kspm.status).to.eql(
          'not-installed',
          `expected kspm status to be not-installed but got ${res.kspm.status} instead`
        );
        expect(res.vuln_mgmt.status).to.eql(
          'not-installed',
          `expected vuln_mgmt status to be not-installed but got ${res.vuln_mgmt.status} instead`
        );
        expect(res.cspm.healthyAgents).to.eql(
          0,
          `expected number of cspm healthy agents to be 0 but got ${res.cspm.healthyAgents} instead`
        );
        expect(res.cspm.installedPackagePolicies).to.eql(
          1,
          `expected number of cspm installed package policies to be 1 but got ${res.cspm.installedPackagePolicies} instead`
        );
      });

      it(`Should return not-deployed when installed cnvm, no findings on either indices and no healthy agents`, async () => {
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

        const { body: res }: { body: CspSetupStatus } = await supertestWithoutAuth
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(internalRequestHeader)
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(res.cspm.status).to.eql(
          'not-installed',
          `expected cspm status to be not-installed but got ${res.cspm.status} instead`
        );
        expect(res.kspm.status).to.eql(
          'not-installed',
          `expected kspm status to be not-installed but got ${res.kspm.status} instead`
        );
        expect(res.vuln_mgmt.status).to.eql(
          'not-deployed',
          `expected vuln_mgmt status to be not-deployed but got ${res.vuln_mgmt.status} instead`
        );
        expect(res.vuln_mgmt.healthyAgents).to.eql(
          0,
          `expected number of vuln_mgmt healthy agents to be 0 but got ${res.vuln_mgmt.healthyAgents} instead`
        );
        expect(res.vuln_mgmt.installedPackagePolicies).to.eql(
          1,
          `expected number of vuln_mgmt installed package policies to be 1 but got ${res.vuln_mgmt.installedPackagePolicies} instead`
        );
      });
    });
  });
}
